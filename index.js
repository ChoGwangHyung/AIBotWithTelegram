require('dotenv').config();
process.env.NTBA_FIX_350 = 1; // Fix for multipart/form-data
// Fix for spawn EINVAL in node-telegram-bot-api polling under Node 22+ with proxy
delete process.env.http_proxy;
delete process.env.https_proxy;
delete process.env.HTTP_PROXY;
delete process.env.HTTPS_PROXY;

const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

// ===== PID 파일 관리 =====
const PID_FILE = path.join(__dirname, 'bot.pid');
const TERM_PID_FILE = path.join(__dirname, 'term.pid');

// node.js 자신의 PID
fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');

// process.ppid: 이 node.js를 실행한 부모 cmd.exe의 PID
// run.bat이 taskkill /PID <ppid> /F /T 를 호출하면
// 해당 터미널 창과 그 자식(node, claude 등)이 모두 종료됨
if (process.ppid) {
    fs.writeFileSync(TERM_PID_FILE, process.ppid.toString(), 'utf8');
}

process.on('exit', () => {
    try { fs.unlinkSync(PID_FILE); } catch (_) { }
    try { fs.unlinkSync(TERM_PID_FILE); } catch (_) { }
});
process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// ===== ENV =====
const token = process.env.TELEGRAM_BOT_TOKEN;
const authorizedChatId = process.env.AUTHORIZED_CHAT_ID;
const AI_PRIORITY = (process.env.AI_PRIORITY || 'claude,gemini').split(',').map(s => s.trim().toLowerCase());
const CLAUDE_RETRY_DELAY_MS = parseInt(process.env.PRIORITY_RETRY_DELAY_MINUTES || '60', 10) * 60 * 1000;
const CONFIRM_TIMEOUT_MS = parseInt(process.env.CONFIRM_TIMEOUT_MINUTES || '3', 10) * 60 * 1000;
const PERMISSION_PORT = parseInt(process.env.PERMISSION_PORT || '8099', 10);

// ===== PATHS (from .env) =====
const CLAUDE_EXE = process.env.CLAUDE_EXE || 'claude';
const GEMINI_EXE = process.env.GEMINI_EXE || 'gemini';
const AI_PROJECT_DIR = process.env.AI_PROJECT_DIR || process.cwd();
const UPROJECT_PATH = process.env.UPROJECT_PATH || '';
const ENGINE_PATH = process.env.ENGINE_PATH || '';
const UBT_BAT = ENGINE_PATH ? path.join(ENGINE_PATH, 'Build\\BatchFiles\\Build.bat') : '';
const EDITOR_EXE = ENGINE_PATH ? path.join(ENGINE_PATH, 'Binaries\\Win64\\UnrealEditor.exe') : '';
const HAS_UE = Boolean(UPROJECT_PATH && ENGINE_PATH);

// ===== SECURITY =====
const BLOCKED_COMMANDS = (process.env.BLOCKED_COMMANDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);
const CONFIRM_COMMANDS = (process.env.CONFIRM_COMMANDS || '')
    .split(',').map(s => s.trim()).filter(Boolean);

// PERMISSION_REQUIRED_TOOLS: 기본 스마트 정책 외에 추가로 항상 권한이 필요한 도구 목록
// (비어있어도 기본 스마트 정책은 동작함 — 삭제/외부경로 감지)
const PERMISSION_REQUIRED_TOOLS = (process.env.PERMISSION_REQUIRED_TOOLS || '')
    .split(',').map(s => s.trim()).filter(Boolean);

// 훅 스크립트가 있으면 권한 시스템 활성화 (PreToolUse 훅 등록)
const HOOK_SCRIPT_PATH = path.join(__dirname, '.claude', 'hooks', 'permission-handler.js');
const USE_PERMISSION_SYSTEM = fs.existsSync(HOOK_SCRIPT_PATH);

// ===== MESSAGES (한국어 고정) =====
const MESSAGES = {
    unauthorized: '⛔ 이 봇을 사용할 권한이 없습니다.',
    noUEPath: '⚠️ UE 경로가 설정되지 않아 이 기능을 사용할 수 없습니다.\n.env에 UPROJECT_PATH와 ENGINE_PATH를 설정하세요.',
    killingEditor: '🛑 에디터 강제 종료 중...',
    noEditorRunning: 'ℹ️ 실행 중인 에디터가 없습니다.',
    editorKilled: '✅ 에디터 종료 완료.',
    buildStart: '🔨 [UBT] AllInBoardEditor Win64 Development 빌드 시작...',
    alreadyBuilding: '⏳ 이미 빌드 중입니다.',
    buildSuccess: '✅ 빌드 성공!',
    buildFail: (code, log) => `❌ 빌드 실패 (exit code ${code})\n\`\`\`\n${log}\n\`\`\``,
    generateStart: '⚙️ Visual Studio 프로젝트 파일 생성 중...',
    alreadyGenerating: '⏳ 이미 생성 중입니다.',
    generateSuccess: '✅ .sln 재생성 완료!',
    generateFail: (code, log) => `❌ 생성 실패 (exit code ${code})\n\`\`\`\n${log}\n\`\`\``,
    editorStarting: '🚀 언리얼 에디터 실행 중...',
    editorStarted: '✅ 에디터 실행 명령 전달 완료.',
    allAIBusy: '⚠️ 모든 AI가 현재 사용 중이거나 한도 초과 상태입니다. 잠시 후 다시 시도하세요.',
    approvalNeeded: (matched, min) =>
        `🔐 *승인 필요*\n\n아래 키워드가 포함된 작업입니다:\n\`${matched}\`\n\n` +
        `진행하시겠습니까?\n*y* — 진행   *n* — 취소\n_(${min}분 내 응답 없으면 자동 취소)_`,
    approvalTimeout: '⏰ 시간 초과 — 작업이 자동 취소되었습니다.',
    approved: '✅ 승인되었습니다. 작업을 시작합니다…',
    rejected: '🚫 작업이 취소되었습니다.',
    invalidApproval: '⚠️ *y* (진행) 또는 *n* (취소)으로 답해주세요.',
    permissionRequest: (tool, detail, min) =>
        `🔑 *권한 요청*\n\nClaude가 다음 작업을 수행하려 합니다:\n` +
        `도구: \`${tool}\`\n${detail ? detail + '\n' : ''}` +
        `\n허가하시겠습니까?\n*1* — 세션 동안 항상 허용\n*2* — 이번 한 번만 허용\n*3* — 거부\n` +
        `_(${min}분 내 응답 없으면 자동 거부)_`,
    permissionAllowedSession: (tool) => `✅ 세션 동안 허용: \`${tool}\``,
    permissionAllowedOnce: (tool) => `✅ 한 번 허용: \`${tool}\``,
    permissionDenied: (tool) => `🚫 거부됨: \`${tool}\``,
    permissionTimeout: '⏰ 시간 초과 — 권한 요청이 자동 거부되었습니다.',
    invalidPermission: '⚠️ *1* (세션 허용), *2* (한 번 허용), *3* (거부)로 답해주세요.',
    claudeStart: (resume) => `🧠 Claude Agent 작업 시작…${resume ? '\n(이전 세션 이어서 진행)' : ''}`,
    claudeTokenLimit: (min) => `⚠️ Claude 토큰 한도 도달. Gemini로 전환합니다.\n(Claude는 약 ${min}분 후 재시도)`,
    claudeError: (msg) => `❌ Claude 실행 오류: ${msg}`,
    geminiHandoff: '🔄 Claude 한도 초과 → Gemini로 인수인계합니다...',
    geminiStart: '♊ Gemini Agent 작업 시작...',
    geminiError: (msg) => `❌ Gemini 실행 오류: ${msg}`,
    taskDone: (label) => `✅ ${label} 작업 완료.`,
    signalKill: (label) => `🛑 ${label}: 에디터 종료 요청`,
    signalGenerate: (label) => `⚙️ ${label}: 프로젝트 파일 생성 요청`,
    signalBuildRun: (label) => `🔨 ${label}: 빌드 → 에디터 실행 진행합니다!`,
    signalBuildRunFail: '❌ 빌드 실패로 에디터 실행 취소.',
    signalBuild: (label) => `🔨 ${label}: 빌드 시작!`,
    signalRun: (label) => `🚀 ${label}: 에디터 실행!`,
    startMessage: (aiStatus, hasUE) =>
        `✅ 환영합니다!\n\nAI 우선순위: ${aiStatus}\n` +
        `UE 연동: ${hasUE ? '✅ 활성화' : '⬜ 비활성화'}\n\n` +
        `모든 메시지는 AI 에이전트에게 전달됩니다.\n` +
        `AI가 필요에 따라 빌드·에디터 실행 등을 자동으로 처리합니다.\n\n` +
        `관리 명령어:\n` +
        `⚙️ /ping       — 상태 확인\n` +
        `⚙️ /newsession — Claude 세션 초기화\n` +
        `⚙️ /setreset   — Claude 한도 수동 초기화`,
    pingMessage: (claudeStatus, sessionInfo, hasUE) =>
        `🏓 Pong!\nClaude: ${claudeStatus}\n세션: ${sessionInfo}\nUE 연동: ${hasUE ? '✅' : '⬜ 비활성화'}`,
    claudeAvailable: '✅ 사용 가능',
    claudeRateLimit: (min) => `⏳ 한도초과 (${min}분 후 재시도)`,
    sessionActive: (id) => `유지중 (${id}…)`,
    sessionNone: '없음',
    sessionReset: '✅ Claude 토큰 한도가 수동으로 초기화되었습니다.',
    newSession: '🔄 Claude 세션이 초기화되었습니다. 다음 메시지부터 새 대화 시작.',
    stats: (elapsed, inTok, outTok, cost) => {
        let msg = `📊 완료 | ⏱ ${elapsed}`;
        if (inTok != null) msg += ` | 입력 ${inTok.toLocaleString()} 토큰`;
        if (outTok != null) msg += ` | 출력 ${outTok.toLocaleString()} 토큰`;
        if (cost != null) msg += ` | $${cost.toFixed(4)}`;
        return msg;
    },
    toolUsed: (tool, detail) => `🔧 ${tool}${detail ? ': ' + detail : ''}`,
};

function t(key, ...args) {
    const msg = MESSAGES[key];
    if (msg === undefined) return key;
    return typeof msg === 'function' ? msg(...args) : msg;
}

// ===== BLOCKED COMMANDS — settings.local.json =====
function setupBlockedCommands() {
    if (BLOCKED_COMMANDS.length === 0) return;
    const targets = ['.claude', '.gemini'];
    for (const target of targets) {
        const settingsDir = path.join(AI_PROJECT_DIR, target);
        const settingsPath = path.join(settingsDir, 'settings.local.json');
        try {
            let settings = {};
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }
            if (!settings.permissions) settings.permissions = {};
            if (!settings.permissions.deny) settings.permissions.deny = [];

            const existing = new Set(settings.permissions.deny);
            for (const cmd of BLOCKED_COMMANDS) existing.add(`Bash(${cmd}:*)`);
            settings.permissions.deny = [...existing];

            if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            console.log(`  [보안] 차단 등록 완료 (${target}): ${BLOCKED_COMMANDS.join(', ')}`);
        } catch (err) {
            console.error(`  [보안] settings.local.json 갱신 실패 (${target}):`, err.message);
        }
    }
}
setupBlockedCommands();

// ===== PERMISSION SYSTEM =====
const sessionAllowedTools = new Set(); // 세션 동안 항상 허용된 도구명 (소문자)
let pendingPermissionReq = null;       // { chatId, toolName, callback, timer }
let activeClaudeChatId = null;       // 현재 Claude 작업 중인 채팅 ID

function setupPermissionHook() {
    if (!USE_PERMISSION_SYSTEM) return;
    const hookScriptPath = path.join(__dirname, '.claude', 'hooks', 'permission-handler.js');
    if (!fs.existsSync(hookScriptPath)) {
        console.warn('  [권한] 훅 스크립트 없음 — permission-handler.js를 확인하세요.');
        return;
    }

    const targets = ['.claude'];
    for (const target of targets) {
        const aiDir = path.join(AI_PROJECT_DIR, target);
        const settingsPath = path.join(aiDir, 'settings.json');
        try {
            if (!fs.existsSync(aiDir)) fs.mkdirSync(aiDir, { recursive: true });

            let settings = {};
            if (fs.existsSync(settingsPath)) {
                settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            }

            if (!settings.hooks) settings.hooks = {};
            // 이전 PermissionRequest 훅 제거
            delete settings.hooks.PermissionRequest;

            const hookEventName = 'PreToolUse';

            settings.hooks[hookEventName] = [{
                matcher: '*',
                hooks: [{ type: 'command', command: `node "${hookScriptPath}"` }],
            }];

            fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
            console.log(`  [권한] ${hookEventName} 훅 등록 완료 (${target}) → ${AI_PROJECT_DIR}`);
        } catch (err) {
            console.error(`  [권한] 훅 설정 실패 (${target}):`, err.message);
        }
    }
    if (PERMISSION_REQUIRED_TOOLS.length > 0) {
        console.log(`  [권한] 추가 강제 도구: ${PERMISSION_REQUIRED_TOOLS.join(', ')}`);
    }
}
setupPermissionHook();

// HTTP 서버 — permission-handler.js와 통신
function handlePermissionRequest(permReq, callback) {
    if (!activeClaudeChatId) {
        callback(makePermDecision(true));
        return;
    }

    const chatId = activeClaudeChatId;
    const toolName = permReq.tool_name || 'unknown';
    const input = permReq.tool_input || {};

    // 세션 허용 목록에 있으면 자동 허용
    if (sessionAllowedTools.has(toolName.toLowerCase())) {
        console.log(`  [권한] 세션 허용 (캐시) — ${toolName}`);
        callback(makePermDecision(true));
        return;
    }

    // 이유 레이블
    const REASON_LABEL = {
        external_read: '⚠️ 프로젝트 외부 파일 읽기',
        external_write: '⚠️ 프로젝트 외부 파일 쓰기/수정',
        external_glob: '⚠️ 프로젝트 외부 경로 검색',
        external_grep: '⚠️ 프로젝트 외부 경로 검색',
        delete_command: '🗑️ 파일/폴더 삭제 명령',
        forced: '🔒 권한 필요 도구',
    };

    const reason = permReq._reason || '';
    const reasonLabel = REASON_LABEL[reason] || '';

    // 상세 정보 요약
    let contentDetail = '';
    if (input.command) contentDetail = input.command.slice(0, 80);
    else if (input.file_path) contentDetail = input.file_path;
    else if (input.path) contentDetail = input.path;

    // 이유 + 내용을 합쳐서 detail로 전달
    const detail = [reasonLabel, contentDetail].filter(Boolean).join('\n');

    const timeoutMin = Math.round(CONFIRM_TIMEOUT_MS / 60000);
    bot.sendMessage(chatId, t('permissionRequest', toolName, detail, timeoutMin), { parse_mode: 'Markdown' });

    const timer = setTimeout(() => {
        if (pendingPermissionReq) {
            pendingPermissionReq = null;
            bot.sendMessage(chatId, t('permissionTimeout'));
            callback(makePermDecision(false, 'timeout'));
        }
    }, CONFIRM_TIMEOUT_MS);

    pendingPermissionReq = { chatId, toolName, callback, timer };
}

// PreToolUse 훅 응답 형식
// allow → {}
// block → { decision: 'block', reason: '...' }
function makePermDecision(allow, reason) {
    if (allow) return {};
    return { decision: 'block', reason: reason || '거부됨' };
}

const permissionServer = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/permission') {
        let body = '';
        req.on('data', (d) => { body += d; });
        req.on('end', () => {
            try {
                const permReq = JSON.parse(body);
                handlePermissionRequest(permReq, (decision) => {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(decision));
                });
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: err.message }));
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});
permissionServer.listen(PERMISSION_PORT, '127.0.0.1', () => {
    console.log(`  [권한] HTTP 서버 → 127.0.0.1:${PERMISSION_PORT}`);
});
permissionServer.on('error', (err) => {
    console.error(`  [권한] HTTP 서버 오류:`, err.message);
});

// ===== BOT =====
if (!token || !authorizedChatId) {
    console.error("❌ .env에 TELEGRAM_BOT_TOKEN 또는 AUTHORIZED_CHAT_ID가 없습니다!");
    process.exit(1);
}

const bot = new TelegramBot(token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    },
    request: {
        agentOptions: {
            keepAlive: true,
            family: 4
        }
    }
});
const START_TIME = Math.floor(Date.now() / 1000);

// ===== 터미널 출력 유틸 =====
const DIVIDER = '─'.repeat(52);
const DIVIDER_FAT = '═'.repeat(52);

function printHeader(label, text) {
    console.log(`\n${DIVIDER_FAT}`);
    console.log(`  ${label}`);
    if (text) console.log(`  ${text.length > 80 ? text.slice(0, 80) + '…' : text}`);
    console.log(DIVIDER_FAT);
}

function printSection(label) {
    console.log(`\n${DIVIDER}`);
    console.log(`  ${label}`);
    console.log(DIVIDER);
}

console.log(`\n${DIVIDER_FAT}`);
console.log(`  🤖  AIBotWithTelegram 시작`);
console.log(`  우선순위: ${AI_PRIORITY.join(' → ')}`);
console.log(`  인증 ID:  ${authorizedChatId}`);
console.log(`  AI 디렉터리: ${AI_PROJECT_DIR}`);
console.log(`  UE 기능: ${HAS_UE ? '✅ 활성화' : '⬜ 비활성화 (UPROJECT_PATH / ENGINE_PATH 미설정)'}`);
console.log(`  차단 명령: ${BLOCKED_COMMANDS.length > 0 ? BLOCKED_COMMANDS.join(', ') : '없음'}`);
console.log(`  승인 필요: ${CONFIRM_COMMANDS.length > 0 ? CONFIRM_COMMANDS.join(', ') : '없음'}`);
console.log(`  권한 시스템: ${USE_PERMISSION_SYSTEM ? `✅ 활성화 (삭제/외부경로 감지${PERMISSION_REQUIRED_TOOLS.length > 0 ? ' + 추가 강제: ' + PERMISSION_REQUIRED_TOOLS.join(', ') : ''})` : '⬜ 비활성화 (훅 스크립트 없음)'}`);
console.log(`${DIVIDER_FAT}\n`);

// ===== AUTHORIZATION =====
function isAuthorized(msg) {
    const chatId = msg.chat.id.toString();
    if (chatId !== authorizedChatId) {
        console.warn(`⚠️  미인증 접근: Chat ID ${chatId}`);
        bot.sendMessage(chatId, t('unauthorized'));
        return false;
    }
    return true;
}

// ===== UE COMMANDS =====
function noUEWarning(chatId) {
    bot.sendMessage(chatId, t('noUEPath'));
}

function killEditor(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    bot.sendMessage(chatId, t('killingEditor'));
    exec('taskkill /IM UnrealEditor.exe /F', (err) => {
        bot.sendMessage(chatId, err ? t('noEditorRunning') : t('editorKilled'));
        if (onDone) setTimeout(() => onDone(!err), 1000);
    });
}

let isBuilding = false;
function buildProject(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    if (isBuilding) { bot.sendMessage(chatId, t('alreadyBuilding')); return; }
    bot.sendMessage(chatId, t('buildStart'));
    isBuilding = true;
    const p = spawn(UBT_BAT, ['AllInBoardEditor', 'Win64', 'Development', UPROJECT_PATH, '-waitmutex'], { shell: true });
    let out = "", errOut = "";
    p.stdout.on('data', (d) => { out += d; console.log(`  [UBT] ${d.toString().trim()}`); });
    p.stderr.on('data', (d) => { errOut += d; console.error(`  [UBT ERR] ${d.toString().trim()}`); });
    p.on('close', (code) => {
        isBuilding = false;
        if (code === 0) {
            bot.sendMessage(chatId, t('buildSuccess'));
        } else {
            const combined = [out, errOut].filter(Boolean).join('\n').trim();
            bot.sendMessage(chatId, t('buildFail', code, combined.slice(-500)));
        }
        if (onDone) onDone(code === 0);
    });
}

let isGenerating = false;
function generateProject(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    if (isGenerating) { bot.sendMessage(chatId, t('alreadyGenerating')); return; }
    bot.sendMessage(chatId, t('generateStart'));
    isGenerating = true;
    const p = spawn(UBT_BAT, ['-projectfiles', `-project=${UPROJECT_PATH}`, '-game', '-rocket', '-progress'], { shell: true });
    let out = "", errOut = "";
    p.stdout.on('data', (d) => { out += d; console.log(`  [GEN] ${d.toString().trim()}`); });
    p.stderr.on('data', (d) => { errOut += d; console.error(`  [GEN ERR] ${d.toString().trim()}`); });
    p.on('close', (code) => {
        isGenerating = false;
        if (code === 0) {
            bot.sendMessage(chatId, t('generateSuccess'));
        } else {
            const combined = [out, errOut].filter(Boolean).join('\n').trim();
            bot.sendMessage(chatId, t('generateFail', code, combined.slice(-400)));
        }
        if (onDone) onDone(code === 0);
    });
}

function runEditor(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    bot.sendMessage(chatId, t('editorStarting'));
    const p = spawn(EDITOR_EXE, [UPROJECT_PATH], { detached: true, stdio: 'ignore' });
    p.unref();
    bot.sendMessage(chatId, t('editorStarted'));
    if (onDone) setTimeout(() => onDone(true), 2000);
}

// ===== 시그널 처리 =====
// 반환값: 메인 답변 메시지의 Promise
// 통계 등 후속 메시지는 이 Promise가 resolve된 뒤에 전송해야 순서가 보장됨
function handleSignals(chatId, message, agentLabel) {
    const hasBuild = message.includes('[BUILD_REQUESTED]');
    const hasRun = message.includes('[RUN_EDITOR_REQUESTED]');
    const hasKill = message.includes('[KILL_EDITOR_REQUESTED]');
    const hasGenerate = message.includes('[GENERATE_REQUESTED]');

    const clean = message
        .replace(/\[BUILD_REQUESTED\]/g, '')
        .replace(/\[RUN_EDITOR_REQUESTED\]/g, '')
        .replace(/\[KILL_EDITOR_REQUESTED\]/g, '')
        .replace(/\[GENERATE_REQUESTED\]/g, '')
        .trim();

    // 메인 답변 전송 — Promise를 보존해 반환
    let mainP;
    if (clean) {
        const MAX = 3900;
        mainP = bot.sendMessage(chatId, `${agentLabel}:\n\n${clean.length > MAX ? clean.slice(0, MAX) + '\n\n…(터미널에서 전체 확인)' : clean}`);
    } else if (!hasBuild && !hasRun && !hasKill && !hasGenerate) {
        mainP = bot.sendMessage(chatId, t('taskDone', agentLabel));
    } else {
        mainP = Promise.resolve();
    }

    if (hasKill) {
        bot.sendMessage(chatId, t('signalKill', agentLabel));
        killEditor(chatId);
    }
    if (hasGenerate) {
        bot.sendMessage(chatId, t('signalGenerate', agentLabel));
        generateProject(chatId);
    }
    if (hasBuild && hasRun) {
        bot.sendMessage(chatId, t('signalBuildRun', agentLabel));
        buildProject(chatId, (ok) => {
            if (ok) runEditor(chatId);
            else bot.sendMessage(chatId, t('signalBuildRunFail'));
        });
    } else if (hasBuild) {
        bot.sendMessage(chatId, t('signalBuild', agentLabel));
        buildProject(chatId);
    } else if (hasRun) {
        bot.sendMessage(chatId, t('signalRun', agentLabel));
        runEditor(chatId);
    }

    return mainP;
}

// ===== 도구명 한국어 =====
function friendlyToolName(name) {
    const map = {
        Read: '파일 읽기',
        Write: '파일 쓰기',
        Edit: '파일 수정',
        Glob: '파일 검색',
        Grep: '내용 검색',
        Bash: '명령 실행',
        Task: '서브에이전트',
        WebFetch: '웹 요청',
        WebSearch: '웹 검색',
        NotebookEdit: '노트북 수정',
    };
    return map[name] || name;
}

function summarizeInput(input) {
    if (!input) return '';
    const str = JSON.stringify(input);
    return str.length > 120 ? str.slice(0, 120) + '…' : str;
}

// 텔레그램 표시용 도구 상세 (간결하게)
function getTelegramDetail(toolName, input) {
    if (!input) return '';
    if (input.command) return input.command.slice(0, 60);
    if (input.file_path) return path.basename(input.file_path);
    if (input.path) return path.basename(input.path);
    if (input.pattern) return input.pattern.slice(0, 60);
    if (input.query) return input.query.slice(0, 60);
    if (input.url) return input.url.slice(0, 60);
    return '';
}

function formatElapsed(ms) {
    const totalSec = Math.round(ms / 1000);
    if (totalSec < 60) return `${totalSec}초`;
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}분 ${sec}초`;
}

// ===== 토큰 한도 감지 =====
const TOKEN_LIMIT_PATTERNS = [
    /rate[\s_-]?limit/i, /context[\s_-]?window/i, /context[\s_-]?length/i,
    /max[\s_-]?token/i, /token[\s_-]?limit/i,
    /overloaded/i, /quota[\s_-]?exceeded/i,
    /529/, /too[\s_-]?large/i, /prompt[\s_-]?too[\s_-]?long/i,
];
function isTokenLimitError(text) {
    return TOKEN_LIMIT_PATTERNS.some(p => p.test(text));
}

// ===== AI 상태 =====
let claudeSessionId = null;
let claudeLastTokenError = 0;
let isClaudeRunning = false;
let isGeminiRunning = false;

function isClaudeAvailable() {
    return Date.now() - claudeLastTokenError >= CLAUDE_RETRY_DELAY_MS;
}

function getActiveAI() {
    for (const ai of AI_PRIORITY) {
        if (ai === 'claude' && !isClaudeAvailable()) {
            const remainMin = Math.ceil((CLAUDE_RETRY_DELAY_MS - (Date.now() - claudeLastTokenError)) / 60000);
            console.log(`  [AI 라우터] Claude 대기 중 (남은 시간 약 ${remainMin}분) → 다음 AI로`);
            continue;
        }
        if (ai === 'claude' && isClaudeRunning) continue;
        if (ai === 'gemini' && isGeminiRunning) continue;
        return ai;
    }
    return null;
}

// ===== 승인 대기 상태 =====
let pendingApproval = null; // { chatId, text, ai, timer }

function dispatchToAI(chatId, text, ai) {
    printHeader(
        ai === 'claude' ? '🤖 CLAUDE' : '♊ GEMINI',
        `[📨 사용자] ${text}`
    );
    if (ai === 'claude') sendToClaude(chatId, text);
    else sendToGemini(chatId, text, null);
}

function routeToAI(chatId, text) {
    const ai = getActiveAI();
    if (ai === null) {
        bot.sendMessage(chatId, t('allAIBusy'));
        return;
    }

    if (CONFIRM_COMMANDS.length > 0) {
        const matched = CONFIRM_COMMANDS.filter(p => text.toLowerCase().includes(p.toLowerCase()));
        if (matched.length > 0) {
            console.log(`  [보안] 승인 요청: ${matched.join(', ')}`);
            const min = Math.round(CONFIRM_TIMEOUT_MS / 60000);
            bot.sendMessage(chatId, t('approvalNeeded', matched.join(', '), min), { parse_mode: 'Markdown' });
            const timer = setTimeout(() => {
                if (pendingApproval && pendingApproval.chatId === chatId) {
                    pendingApproval = null;
                    console.log('  [보안] 승인 타임아웃 — 자동 취소');
                    bot.sendMessage(chatId, t('approvalTimeout'));
                }
            }, CONFIRM_TIMEOUT_MS);
            pendingApproval = { chatId, text, ai, timer };
            return;
        }
    }

    dispatchToAI(chatId, text, ai);
}

// ===== GEMINI =====
function sendToGemini(chatId, originalRequest, partialOutput) {
    isGeminiRunning = true;
    const isHandoff = partialOutput !== null;

    if (isHandoff) {
        bot.sendMessage(chatId, t('geminiHandoff'));
        printSection('🔄 Gemini 인수인계 시작');
    } else {
        bot.sendMessage(chatId, t('geminiStart'));
        printSection('♊ Gemini 응답');
    }

    const context = isHandoff
        ? ['[Claude → Gemini 인수인계]', '', '=== 원래 요청 ===', originalRequest, '',
            partialOutput ? `=== Claude 부분 결과 ===\n${partialOutput.slice(0, 3000)}` : '(없음)'].join('\n')
        : originalRequest;

    const args = isHandoff
        ? ['-y', '--output-format', 'text',
            '위 인수인계 내용을 바탕으로 원래 요청을 이어서 완료해주세요. GEMINI.md와 TODO.md를 참고하세요.']
        : ['-y', '--output-format', 'text', originalRequest];

    const geminiProcess = spawn(GEMINI_EXE, args, {
        cwd: AI_PROJECT_DIR,
        stdio: isHandoff ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, CI: '1' },
        shell: true,
    });

    if (isHandoff) {
        geminiProcess.stdin.write(context, 'utf8');
        geminiProcess.stdin.end();
    }

    let output = "";
    geminiProcess.stdout.on('data', (d) => {
        const chunk = d.toString();
        output += chunk;
        process.stdout.write(chunk);
    });
    geminiProcess.stderr.on('data', (d) => { console.error(`  [GEMINI ERR] ${d.toString().trim()}`); });
    geminiProcess.on('error', (err) => {
        isGeminiRunning = false;
        bot.sendMessage(chatId, t('geminiError', err.message));
    });
    geminiProcess.on('close', (code) => {
        isGeminiRunning = false;
        process.stdout.write('\n');
        printSection(`♊ Gemini 완료 (exit ${code})`);
        handleSignals(chatId, output, '♊ Gemini');
    });
}

// ===== CLAUDE =====
function sendToClaude(chatId, text) {
    isClaudeRunning = true;
    activeClaudeChatId = chatId;

    if (claudeSessionId) {
        console.log(`  [세션 유지] resume: ${claudeSessionId.slice(0, 16)}…`);
    }

    bot.sendMessage(chatId, t('claudeStart', !!claudeSessionId));

    const claudeEnv = { ...process.env };
    delete claudeEnv.CLAUDECODE;

    // --dangerously-skip-permissions: 항상 포함 (비대화형 -p 모드 필수)
    // PreToolUse 훅이 권한 제어를 담당하므로 Claude 내장 프롬프트는 불필요
    const args = ['-p', '--dangerously-skip-permissions',
        '--output-format', 'stream-json', '--verbose'];
    if (claudeSessionId) args.push('--resume', claudeSessionId);
    args.push(text);

    const proc = spawn(CLAUDE_EXE, args, {
        cwd: AI_PROJECT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: claudeEnv,
    });

    const startTime = Date.now();
    let streamBuf = "";
    let finalResult = "";
    let stderrText = "";
    let lastToolName = "";
    let totalUsage = null;
    let totalCost = null;

    proc.stdout.on('data', (data) => {
        streamBuf += data.toString();
        const lines = streamBuf.split('\n');
        streamBuf = lines.pop();

        for (const line of lines) {
            if (!line.trim()) continue;
            try {
                const obj = JSON.parse(line);

                // ── 어시스턴트 메시지 (텍스트 + 툴 호출)
                if (obj.type === 'assistant' && Array.isArray(obj.message?.content)) {
                    for (const block of obj.message.content) {
                        if (block.type === 'text' && block.text) {
                            process.stdout.write(block.text);
                        }
                        if (block.type === 'tool_use') {
                            lastToolName = block.name;
                            const friendly = friendlyToolName(block.name);
                            const summary = summarizeInput(block.input);
                            console.log(`\n  [🔧 ${friendly}]${summary ? '  ' + summary : ''}`);

                            // 텔레그램으로 즉시 전송
                            const detail = getTelegramDetail(block.name, block.input);
                            bot.sendMessage(chatId, t('toolUsed', friendly, detail));
                        }
                    }
                    // 어시스턴트 메시지 단위 usage 누적
                    if (obj.message?.usage) {
                        if (!totalUsage) totalUsage = {};
                        const u = obj.message.usage;
                        totalUsage.input_tokens = (totalUsage.input_tokens || 0) + (u.input_tokens || 0);
                        totalUsage.output_tokens = (totalUsage.output_tokens || 0) + (u.output_tokens || 0);
                    }
                }

                // ── 툴 결과
                if (obj.type === 'user' && Array.isArray(obj.message?.content)) {
                    for (const block of obj.message.content) {
                        if (block.type === 'tool_result') {
                            const raw = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
                            const preview = raw.replace(/\n+/g, ' ').slice(0, 100);
                            console.log(`  [✅ ${friendlyToolName(lastToolName)} 결과] ${preview}${raw.length > 100 ? '…' : ''}`);
                        }
                    }
                }

                // ── 최종 결과
                if (obj.type === 'result') {
                    finalResult = obj.result || '';
                    if (obj.session_id) {
                        claudeSessionId = obj.session_id;
                        console.log(`\n  [💾 세션 저장] ${claudeSessionId.slice(0, 16)}…`);
                    }
                    if (obj.is_error) stderrText += JSON.stringify(obj) + '\n';
                    // result 레벨 usage (있을 경우 덮어씀)
                    if (obj.usage) totalUsage = obj.usage;
                    if (obj.total_cost_usd != null) totalCost = obj.total_cost_usd;
                }

            } catch (_) { /* 비JSON 라인 무시 */ }
        }
    });

    proc.stderr.on('data', (data) => {
        const err = data.toString().trim();
        stderrText += err + '\n';
        if (err) console.error(`\n  [CLAUDE ERR] ${err}`);
    });

    proc.on('error', (err) => {
        isClaudeRunning = false;
        activeClaudeChatId = null;
        console.error(`  [SPAWN ERR]`, err);
        bot.sendMessage(chatId, t('claudeError', err.message));
    });

    proc.on('close', (code) => {
        isClaudeRunning = false;
        activeClaudeChatId = null;
        process.stdout.write('\n');
        printSection(`🤖 Claude 완료 (exit ${code})`);

        // 토큰 한도 감지 → Gemini 폴백 (통계 없이 즉시 전환)
        if (code !== 0 && isTokenLimitError(stderrText)) {
            console.log(`  [⚠️  토큰 한도] Gemini로 전환합니다.`);
            claudeLastTokenError = Date.now();
            claudeSessionId = null;
            bot.sendMessage(chatId, t('claudeTokenLimit', Math.round(CLAUDE_RETRY_DELAY_MS / 60000)));
            sendToGemini(chatId, text, finalResult);
            return;
        }

        // elapsed를 Claude 완료 시점 기준으로 미리 계산
        const elapsed = Date.now() - startTime;
        const elapsedStr = formatElapsed(elapsed);

        // 1. 답변 먼저 — handleSignals 가 메인 메시지 Promise 반환
        // 2. Telegram이 답변 수신을 확인한 뒤에만 통계 전송 (순서 보장)
        handleSignals(chatId, finalResult, '🤖 Claude').then(() => {
            bot.sendMessage(chatId, t('stats', elapsedStr,
                totalUsage?.input_tokens ?? null,
                totalUsage?.output_tokens ?? null,
                totalCost
            ));
        });
    });
}

// ===== MESSAGE ROUTER =====
bot.on('message', (msg) => {
    if (msg.date < START_TIME) return;
    if (!isAuthorized(msg)) return;
    if (!msg.text) return;

    const chatId = msg.chat.id.toString();
    const text = msg.text.trim();
    const lower = text.toLowerCase();

    printHeader('📨 텔레그램 메시지 수신', text);

    // ── 권한 요청 대기 중 처리 (1 / 2 / 3)
    if (pendingPermissionReq && pendingPermissionReq.chatId === chatId) {
        if (text === '1') {
            clearTimeout(pendingPermissionReq.timer);
            const { toolName, callback } = pendingPermissionReq;
            pendingPermissionReq = null;
            sessionAllowedTools.add(toolName.toLowerCase());
            console.log(`  [권한] 세션 허용 — ${toolName}`);
            bot.sendMessage(chatId, t('permissionAllowedSession', toolName), { parse_mode: 'Markdown' });
            callback(makePermDecision(true));
        } else if (text === '2') {
            clearTimeout(pendingPermissionReq.timer);
            const { toolName, callback } = pendingPermissionReq;
            pendingPermissionReq = null;
            console.log(`  [권한] 한 번 허용 — ${toolName}`);
            bot.sendMessage(chatId, t('permissionAllowedOnce', toolName), { parse_mode: 'Markdown' });
            callback(makePermDecision(true));
        } else if (text === '3') {
            clearTimeout(pendingPermissionReq.timer);
            const { toolName, callback } = pendingPermissionReq;
            pendingPermissionReq = null;
            console.log(`  [권한] 거부 — ${toolName}`);
            bot.sendMessage(chatId, t('permissionDenied', toolName), { parse_mode: 'Markdown' });
            callback(makePermDecision(false, 'User denied'));
        } else {
            bot.sendMessage(chatId, t('invalidPermission'), { parse_mode: 'Markdown' });
        }
        return;
    }

    // ── 승인 대기 중인 요청 처리 (y / n)
    if (pendingApproval && pendingApproval.chatId === chatId) {
        if (lower === 'y' || lower === 'yes') {
            clearTimeout(pendingApproval.timer);
            const { text: originalText, ai } = pendingApproval;
            pendingApproval = null;
            console.log('  [보안] 승인됨 — AI 실행');
            bot.sendMessage(chatId, t('approved'));
            dispatchToAI(chatId, originalText, ai);
        } else if (lower === 'n' || lower === 'no') {
            clearTimeout(pendingApproval.timer);
            pendingApproval = null;
            console.log('  [보안] 거부됨 — 작업 취소');
            bot.sendMessage(chatId, t('rejected'));
        } else {
            bot.sendMessage(chatId, t('invalidApproval'), { parse_mode: 'Markdown' });
        }
        return;
    }

    // ── 빌트인 명령어
    if (lower === '/start') {
        const aiStatus = AI_PRIORITY.map(ai => {
            if (ai === 'claude') return `Claude${isClaudeAvailable() ? ' ✅' : ' ⏳(한도초과)'}`;
            return `Gemini ✅`;
        }).join(' → ');
        return bot.sendMessage(chatId, t('startMessage', aiStatus, HAS_UE));
    }

    if (lower === '/ping') {
        const remainMin = isClaudeAvailable() ? 0 : Math.ceil((CLAUDE_RETRY_DELAY_MS - (Date.now() - claudeLastTokenError)) / 60000);
        const claudeStatus = isClaudeAvailable() ? t('claudeAvailable') : t('claudeRateLimit', remainMin);
        const sessionInfo = claudeSessionId ? t('sessionActive', claudeSessionId.slice(0, 8)) : t('sessionNone');
        return bot.sendMessage(chatId, t('pingMessage', claudeStatus, sessionInfo, HAS_UE));
    }

    if (lower === '/setreset') {
        claudeLastTokenError = 0;
        claudeSessionId = null;
        console.log('  [수동] Claude 토큰 한도 초기화');
        return bot.sendMessage(chatId, t('sessionReset'));
    }

    if (lower === '/newsession') {
        claudeSessionId = null;
        return bot.sendMessage(chatId, t('newSession'));
    }

    // 모든 텍스트 → AI 에이전트
    routeToAI(chatId, text);
});
