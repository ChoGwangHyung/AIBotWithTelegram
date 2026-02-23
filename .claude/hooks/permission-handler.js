/**
 * PreToolUse Hook — AIBotWithTelegram (스마트 권한 정책)
 *
 * 기본 정책:
 *   - 현재 프로젝트 경로(AI_PROJECT_DIR) 내부 파일 생성/수정 → 자동 허용
 *   - 삭제 명령 (rm, del, rmdir 등)                          → 권한 요청
 *   - 프로젝트 경로 외부 파일 읽기/접근                        → 권한 요청
 *
 * 추가 강제 정책 (PERMISSION_REQUIRED_TOOLS 목록):
 *   - 해당 도구는 경로와 관계없이 항상 권한 요청
 *
 * PreToolUse 응답 형식:
 *   허용 → {}
 *   차단 → { "decision": "block", "reason": "..." }
 *
 * 환경 변수:
 *   PERMISSION_PORT           — 봇 HTTP 서버 포트 (기본 8099)
 *   PERMISSION_REQUIRED_TOOLS — 추가로 항상 권한 요청할 도구 (쉼표 구분)
 *   AI_PROJECT_DIR            — 프로젝트 루트 (없으면 봇 .env에서 자동 읽기)
 */

'use strict';

const http = require('http');
const path = require('path');
const fs = require('fs');

// ===== 설정 로드 =====
const PERMISSION_PORT = parseInt(process.env.PERMISSION_PORT || '8099', 10);
const PERMISSION_REQUIRED_TOOLS = (process.env.PERMISSION_REQUIRED_TOOLS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

// AI_PROJECT_DIR: 환경 변수에 없으면 봇의 .env 파일에서 읽기
// (훅은 독립 프로세스이므로 dotenv 수동 로드)
let AI_PROJECT_DIR = process.env.AI_PROJECT_DIR || '';
let AI_ALLOWED_DIRS_RAW = process.env.AI_ALLOWED_DIRS || '';

if (!AI_PROJECT_DIR || !AI_ALLOWED_DIRS_RAW) {
    try {
        const envPath = path.join(__dirname, '..', '..', '.env');
        if (fs.existsSync(envPath)) {
            const lines = fs.readFileSync(envPath, 'utf8').split('\n');
            for (let line of lines) {
                line = line.replace(/\r/g, ''); // Fix regex match failure with \r
                const m1 = line.match(/^AI_PROJECT_DIR\s*=\s*(.+)$/);
                if (m1 && !AI_PROJECT_DIR) {
                    AI_PROJECT_DIR = m1[1].trim().replace(/^["']|["']$/g, '');
                }
                const m2 = line.match(/^AI_ALLOWED_DIRS\s*=\s*(.+)$/);
                if (m2 && !AI_ALLOWED_DIRS_RAW) {
                    AI_ALLOWED_DIRS_RAW = m2[1].trim().replace(/^["']|["']$/g, '');
                }
            }
        }
    } catch (_) { }
}

const ALLOWED_PROJECT_DIRS = [AI_PROJECT_DIR];
if (AI_ALLOWED_DIRS_RAW) {
    const extraDirs = AI_ALLOWED_DIRS_RAW.split(/[,;]/).map(d => d.trim()).filter(Boolean);
    ALLOWED_PROJECT_DIRS.push(...extraDirs);
}

// ===== 삭제 및 위험 명령 패턴 =====
const DELETE_PATTERNS = [
    /\brm\b/i,            // Unix rm
    /\bdel\b/i,           // Windows del
    /\brmdir\b/i,         // rmdir
    /\brd\b/i,            // rd (Windows rmdir 단축)
    /remove-item/i,       // PowerShell Remove-Item
    /git\s+clean/i,       // git clean (추적되지 않은 파일 삭제)
    /\bshred\b/i,         // shred
    /\bwipe\b/i,          // wipe
    /\btruncate\s+-s\s*0/i, // truncate -s 0 (파일 내용 비우기)
    /\bunlink\b/i,        // unlink
    // 위험한 Git 명령어 필터
    /git\s+push\s+.*(?:-f|--force)/i, // git push -f
    /git\s+reset\s+.*(?:--hard|--mixed)/i, // git reset --hard/--mixed
    /git\s+branch\s+.*-[dD]/i,         // git branch -D
    /git\s+rebase/i,                   // git rebase
];

// ===== 외부 경로 여부 확인 =====
function isExternalPath(targetPath) {
    if (!targetPath) return false;
    try {
        for (const projectDir of ALLOWED_PROJECT_DIRS) {
            if (!projectDir) continue;
            const resolved = path.resolve(projectDir, targetPath);
            const target = path.normalize(resolved).toLowerCase();
            const base = path.normalize(projectDir).toLowerCase();
            const baseWithSep = base.endsWith(path.sep) ? base : base + path.sep;

            if (target === base || target.startsWith(baseWithSep)) {
                return false; // 허용된 경로 중 하나에 포함됨 (내부 경로)
            }
        }
        return true; // 매칭되는 허용 디렉토리가 없음 (외부 경로)
    } catch (_) {
        return false; // 판단 불가 시 허용
    }
}

// ===== 권한 필요 여부 판단 =====
function needsPermission(toolName, toolInput) {
    const tool = toolName || '';
    const input = toolInput || {};

    // PERMISSION_REQUIRED_TOOLS에 명시된 도구는 항상 권한 필요
    if (PERMISSION_REQUIRED_TOOLS.includes(tool.toLowerCase())) {
        return { needed: true, reason: 'forced' };
    }

    switch (tool) {
        case 'Read': {
            // 프로젝트 외부 파일 읽기 → 권한 필요
            const fp = input.file_path || '';
            if (isExternalPath(fp)) {
                return { needed: true, reason: 'external_read' };
            }
            return { needed: false };
        }

        case 'Write':
        case 'Edit':
        case 'NotebookEdit': {
            // 프로젝트 내부 생성/수정 → 자동 허용
            // 프로젝트 외부 → 권한 필요
            const fp = input.file_path || input.notebook_path || '';
            if (isExternalPath(fp)) {
                return { needed: true, reason: 'external_write' };
            }
            return { needed: false };
        }

        case 'Glob': {
            const p = input.path || '';
            if (p && isExternalPath(p)) {
                return { needed: true, reason: 'external_glob' };
            }
            return { needed: false };
        }

        case 'Grep': {
            const p = input.path || '';
            if (p && isExternalPath(p)) {
                return { needed: true, reason: 'external_grep' };
            }
            return { needed: false };
        }

        case 'Bash': {
            // 삭제 명령 감지
            const cmd = input.command || '';
            if (DELETE_PATTERNS.some(pat => pat.test(cmd))) {
                return { needed: true, reason: 'delete_command' };
            }
            return { needed: false };
        }

        default:
            return { needed: false };
    }
}

// ===== 메인 로직 =====
let inputData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => { inputData += chunk; });
process.stdin.on('end', () => {
    let permReq;
    try {
        permReq = JSON.parse(inputData);
    } catch (_) {
        writeAllow();
        return;
    }

    const toolName = permReq.tool_name || '';
    const toolInput = permReq.tool_input || {};
    const { needed, reason } = needsPermission(toolName, toolInput);

    if (!needed) {
        writeAllow();
        return;
    }

    // 이유를 봇이 사용자에게 설명할 수 있도록 필드 추가
    permReq._reason = reason;

    // 봇 HTTP 서버로 권한 요청 전달
    const body = JSON.stringify(permReq);
    const options = {
        hostname: '127.0.0.1',
        port: PERMISSION_PORT,
        path: '/permission',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body),
        },
    };

    const req = http.request(options, (res) => {
        let resData = '';
        res.on('data', (d) => { resData += d; });
        res.on('end', () => {
            try {
                const decision = JSON.parse(resData);
                // 봇이 반환한 PreToolUse 결정을 그대로 출력
                process.stdout.write(JSON.stringify(decision));
            } catch (_) {
                writeDeny('응답 파싱 실패');
            }
            process.exit(0);
        });
    });

    req.on('error', () => {
        // 봇 서버 연결 실패 시 자동 허용 (봇 미실행 상태 대비)
        writeAllow();
        process.exit(0);
    });

    // 봇 서버 응답 최대 대기: 10분
    req.setTimeout(600000, () => {
        writeDeny('타임아웃');
        req.destroy();
        process.exit(0);
    });

    req.write(body);
    req.end();
});

// PreToolUse 허용: 빈 객체
function writeAllow() {
    process.stdout.write('{}');
    process.exit(0);
}

// PreToolUse 차단: { decision: 'block', reason: '...' }
function writeDeny(reason) {
    process.stdout.write(JSON.stringify({
        decision: 'block',
        reason: reason || '거부됨',
    }));
    process.exit(0);
}
