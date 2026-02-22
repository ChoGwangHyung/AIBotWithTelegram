require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// ===== PID 파일 관리 =====
const PID_FILE = path.join(__dirname, 'bot.pid');
fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');
process.on('exit',   () => { try { fs.unlinkSync(PID_FILE); } catch (_) {} });
process.on('SIGINT',  () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));

// ===== ENV =====
const token            = process.env.TELEGRAM_BOT_TOKEN;
const authorizedChatId = process.env.AUTHORIZED_CHAT_ID;
const AI_PRIORITY      = (process.env.AI_PRIORITY || 'claude,gemini').split(',').map(s => s.trim().toLowerCase());
const CLAUDE_RETRY_DELAY_MS = parseInt(process.env.PRIORITY_RETRY_DELAY_MINUTES || '60', 10) * 60 * 1000;

// ===== PATHS (from .env) =====
const CLAUDE_EXE     = process.env.CLAUDE_EXE     || 'claude';
const GEMINI_EXE     = process.env.GEMINI_EXE     || 'gemini';
const AI_PROJECT_DIR = process.env.AI_PROJECT_DIR || process.cwd();
const UPROJECT_PATH  = process.env.UPROJECT_PATH  || '';
const ENGINE_PATH    = process.env.ENGINE_PATH     || '';
const UBT_BAT        = ENGINE_PATH ? path.join(ENGINE_PATH, 'Build\\BatchFiles\\Build.bat')         : '';
const EDITOR_EXE     = ENGINE_PATH ? path.join(ENGINE_PATH, 'Binaries\\Win64\\UnrealEditor.exe')    : '';
const HAS_UE         = Boolean(UPROJECT_PATH && ENGINE_PATH);

if (!token || !authorizedChatId) {
    console.error("❌ .env에 TELEGRAM_BOT_TOKEN 또는 AUTHORIZED_CHAT_ID가 없습니다!");
    process.exit(1);
}

const bot = new TelegramBot(token, { polling: true });
const START_TIME = Math.floor(Date.now() / 1000);

// ===== 터미널 출력 유틸 =====
const DIVIDER     = '─'.repeat(52);
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
console.log(`${DIVIDER_FAT}\n`);

// ===== AUTHORIZATION =====
function isAuthorized(msg) {
    const chatId = msg.chat.id.toString();
    if (chatId !== authorizedChatId) {
        console.warn(`⚠️  미인증 접근: Chat ID ${chatId}`);
        bot.sendMessage(chatId, "⛔ 이 봇을 사용할 권한이 없습니다.");
        return false;
    }
    return true;
}

// ===== UE COMMANDS =====
function noUEWarning(chatId) {
    bot.sendMessage(chatId, "⚠️ UE 경로가 설정되지 않아 이 기능을 사용할 수 없습니다.\n.env에 UPROJECT_PATH와 ENGINE_PATH를 설정하세요.");
}

function killEditor(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    bot.sendMessage(chatId, "🛑 에디터 강제 종료 중...");
    exec('taskkill /IM UnrealEditor.exe /F', (err) => {
        bot.sendMessage(chatId, err ? "ℹ️ 실행 중인 에디터가 없습니다." : "✅ 에디터 종료 완료.");
        if (onDone) setTimeout(() => onDone(!err), 1000);
    });
}

let isBuilding = false;
function buildProject(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    if (isBuilding) { bot.sendMessage(chatId, "⏳ 이미 빌드 중입니다."); return; }
    bot.sendMessage(chatId, "🔨 [UBT] AllInBoardEditor Win64 Development 빌드 시작...");
    isBuilding = true;
    const p = spawn(UBT_BAT, ['AllInBoardEditor', 'Win64', 'Development', UPROJECT_PATH, '-waitmutex'], { shell: true });
    let out    = "";
    let errOut = "";
    p.stdout.on('data', (d) => { out += d; console.log(`  [UBT] ${d.toString().trim()}`); });
    p.stderr.on('data', (d) => { errOut += d; console.error(`  [UBT ERR] ${d.toString().trim()}`); });
    p.on('close', (code) => {
        isBuilding = false;
        const ok = code === 0;
        if (ok) {
            bot.sendMessage(chatId, "✅ 빌드 성공!");
        } else {
            const combined = [out, errOut].filter(Boolean).join('\n').trim();
            bot.sendMessage(chatId, `❌ 빌드 실패 (exit code ${code})\n\`\`\`\n${combined.slice(-500)}\n\`\`\``);
        }
        if (onDone) onDone(ok);
    });
}

let isGenerating = false;
function generateProject(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    if (isGenerating) { bot.sendMessage(chatId, "⏳ 이미 생성 중입니다."); return; }
    bot.sendMessage(chatId, "⚙️ Visual Studio 프로젝트 파일 생성 중...");
    isGenerating = true;
    const p = spawn(UBT_BAT, ['-projectfiles', `-project=${UPROJECT_PATH}`, '-game', '-rocket', '-progress'], { shell: true });
    let out    = "";
    let errOut = "";
    p.stdout.on('data', (d) => { out += d; console.log(`  [GEN] ${d.toString().trim()}`); });
    p.stderr.on('data', (d) => { errOut += d; console.error(`  [GEN ERR] ${d.toString().trim()}`); });
    p.on('close', (code) => {
        isGenerating = false;
        const ok = code === 0;
        if (ok) {
            bot.sendMessage(chatId, "✅ .sln 재생성 완료!");
        } else {
            const combined = [out, errOut].filter(Boolean).join('\n').trim();
            bot.sendMessage(chatId, `❌ 생성 실패 (exit code ${code})\n\`\`\`\n${combined.slice(-400)}\n\`\`\``);
        }
        if (onDone) onDone(ok);
    });
}

function runEditor(chatId, onDone = null) {
    if (!HAS_UE) { noUEWarning(chatId); if (onDone) onDone(false); return; }
    bot.sendMessage(chatId, "🚀 언리얼 에디터 실행 중...");
    const p = spawn(EDITOR_EXE, [UPROJECT_PATH], { detached: true, stdio: 'ignore' });
    p.unref();
    bot.sendMessage(chatId, "✅ 에디터 실행 명령 전달 완료.");
    if (onDone) setTimeout(() => onDone(true), 2000);
}

// ===== AI 공통 — 시그널 처리 =====
// AI 에이전트가 응답에 포함할 수 있는 시그널:
//   [BUILD_REQUESTED]         → UBT 빌드 실행
//   [RUN_EDITOR_REQUESTED]    → 에디터 실행
//   [KILL_EDITOR_REQUESTED]   → 에디터 강제 종료
//   [GENERATE_REQUESTED]      → .sln 프로젝트 파일 재생성
function handleSignals(chatId, message, agentLabel) {
    const hasBuild    = message.includes('[BUILD_REQUESTED]');
    const hasRun      = message.includes('[RUN_EDITOR_REQUESTED]');
    const hasKill     = message.includes('[KILL_EDITOR_REQUESTED]');
    const hasGenerate = message.includes('[GENERATE_REQUESTED]');

    const clean = message
        .replace(/\[BUILD_REQUESTED\]/g, '')
        .replace(/\[RUN_EDITOR_REQUESTED\]/g, '')
        .replace(/\[KILL_EDITOR_REQUESTED\]/g, '')
        .replace(/\[GENERATE_REQUESTED\]/g, '')
        .trim();

    if (clean) {
        const MAX = 3900;
        bot.sendMessage(chatId, `${agentLabel}:\n\n${clean.length > MAX ? clean.slice(0, MAX) + '\n\n…(터미널에서 전체 확인)' : clean}`);
    } else if (!hasBuild && !hasRun && !hasKill && !hasGenerate) {
        bot.sendMessage(chatId, `✅ ${agentLabel} 작업 완료.`);
    }

    // 시그널 순서대로 실행: kill → generate → build (→ run)
    if (hasKill) {
        bot.sendMessage(chatId, `🛑 ${agentLabel}: 에디터 종료 요청`);
        killEditor(chatId);
    }
    if (hasGenerate) {
        bot.sendMessage(chatId, `⚙️ ${agentLabel}: 프로젝트 파일 생성 요청`);
        generateProject(chatId);
    }
    if (hasBuild && hasRun) {
        bot.sendMessage(chatId, `🔨 ${agentLabel}: 빌드 → 에디터 실행 진행합니다!`);
        buildProject(chatId, (ok) => {
            if (ok) runEditor(chatId);
            else bot.sendMessage(chatId, "❌ 빌드 실패로 에디터 실행 취소.");
        });
    } else if (hasBuild) {
        bot.sendMessage(chatId, `🔨 ${agentLabel}: 빌드 시작!`);
        buildProject(chatId);
    } else if (hasRun) {
        bot.sendMessage(chatId, `🚀 ${agentLabel}: 에디터 실행!`);
        runEditor(chatId);
    }
}

// 도구명 한글화 (터미널 가독성)
function friendlyToolName(name) {
    const map = {
        Read: '파일 읽기', Write: '파일 쓰기', Edit: '파일 수정',
        Glob: '파일 검색', Grep: '내용 검색', Bash: '명령 실행',
        Task: '서브에이전트', WebFetch: '웹 요청', WebSearch: '웹 검색',
    };
    return map[name] || name;
}

function summarizeInput(input) {
    if (!input) return '';
    const str = JSON.stringify(input);
    return str.length > 120 ? str.slice(0, 120) + '…' : str;
}

// ===== 토큰 한도 감지 =====
const TOKEN_LIMIT_PATTERNS = [
    /rate[\s_-]?limit/i, /context[\s_-]?window/i, /context[\s_-]?length/i,
    /max[\s_-]?token/i,  /token[\s_-]?limit/i,
    /overloaded/i,       /quota[\s_-]?exceeded/i,
    /529/, /too[\s_-]?large/i, /prompt[\s_-]?too[\s_-]?long/i,
];
function isTokenLimitError(text) {
    return TOKEN_LIMIT_PATTERNS.some(p => p.test(text));
}

// ===== AI 상태 & 우선순위 =====
let claudeSessionId       = null;
let claudeLastTokenError  = 0;
let isClaudeRunning       = false;
let isGeminiRunning       = false;

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
        if (ai === 'claude' && isClaudeRunning) { continue; }
        if (ai === 'gemini' && isGeminiRunning) { continue; }
        return ai;
    }
    return null;
}

function routeToAI(chatId, text) {
    const ai = getActiveAI();
    if (ai === null) {
        bot.sendMessage(chatId, "⚠️ 모든 AI가 현재 사용 중이거나 한도 초과 상태입니다. 잠시 후 다시 시도하세요.");
        return;
    }
    printHeader(
        ai === 'claude' ? '🤖 CLAUDE' : '♊ GEMINI',
        `[📨 사용자] ${text}`
    );
    if (ai === 'claude') sendToClaude(chatId, text);
    else sendToGemini(chatId, text, null);
}

// ===== GEMINI =====
function sendToGemini(chatId, originalRequest, partialOutput) {
    isGeminiRunning = true;

    const isHandoff = partialOutput !== null;
    if (isHandoff) {
        bot.sendMessage(chatId, "🔄 Claude 한도 초과 → Gemini로 인수인계합니다...");
        printSection('🔄 Gemini 인수인계 시작');
    } else {
        bot.sendMessage(chatId, "♊ Gemini Agent 작업 시작...");
        printSection('♊ Gemini 응답');
    }

    const context = isHandoff
        ? ['[Claude → Gemini 인수인계]', '', '=== 원래 요청 ===', originalRequest, '',
           partialOutput ? `=== Claude 부분 결과 ===\n${partialOutput.slice(0, 3000)}` : '(없음)'].join('\n')
        : originalRequest;

    const args = isHandoff
        ? ['-y', '--output-format', 'text', '-p',
           '위 인수인계 내용을 바탕으로 원래 요청을 이어서 완료해주세요. GEMINI.md와 TODO.md를 참고하세요.']
        : ['-y', '--output-format', 'text', '-p', originalRequest];

    const geminiProcess = spawn(GEMINI_EXE, args, {
        cwd: AI_PROJECT_DIR,
        stdio: isHandoff ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'],
        shell: false,
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
        bot.sendMessage(chatId, `❌ Gemini 실행 오류: ${err.message}`);
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

    if (claudeSessionId) {
        console.log(`  [세션 유지] resume: ${claudeSessionId.slice(0, 16)}…`);
    }

    bot.sendMessage(chatId, `🧠 Claude Agent 작업 시작…${claudeSessionId ? '\n(이전 세션 이어서 진행)' : ''}`);

    const claudeEnv = { ...process.env };
    delete claudeEnv.CLAUDECODE;

    const args = [
        '-p', '--dangerously-skip-permissions',
        '--output-format', 'stream-json', '--verbose',
    ];
    if (claudeSessionId) args.push('--resume', claudeSessionId);
    args.push(text);

    const proc = spawn(CLAUDE_EXE, args, {
        cwd: AI_PROJECT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: claudeEnv,
    });

    let streamBuf    = "";
    let finalResult  = "";
    let stderrText   = "";
    let lastToolName = "";

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
                            const summary  = summarizeInput(block.input);
                            console.log(`\n  [🔧 ${friendly}]${summary ? '  ' + summary : ''}`);
                        }
                    }
                }

                // ── 툴 결과 (user 메시지 내 tool_result)
                if (obj.type === 'user' && Array.isArray(obj.message?.content)) {
                    for (const block of obj.message.content) {
                        if (block.type === 'tool_result') {
                            const raw = typeof block.content === 'string'
                                ? block.content
                                : JSON.stringify(block.content);
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
        console.error(`  [SPAWN ERR]`, err);
        bot.sendMessage(chatId, `❌ Claude 실행 오류: ${err.message}`);
    });

    proc.on('close', (code) => {
        isClaudeRunning = false;
        process.stdout.write('\n');
        printSection(`🤖 Claude 완료 (exit ${code})`);

        // 토큰 한도 감지 → Gemini 폴백
        if (code !== 0 && isTokenLimitError(stderrText)) {
            console.log(`  [⚠️  토큰 한도] Gemini로 전환합니다.`);
            claudeLastTokenError = Date.now();
            claudeSessionId = null;
            bot.sendMessage(chatId,
                `⚠️ Claude 토큰 한도 도달. Gemini로 전환합니다.\n` +
                `(Claude는 약 ${Math.round(CLAUDE_RETRY_DELAY_MS / 60000)}분 후 재시도)`
            );
            return sendToGemini(chatId, text, finalResult);
        }

        handleSignals(chatId, finalResult, '🤖 Claude');
    });
}

// ===== MESSAGE ROUTER =====
bot.on('message', (msg) => {
    if (msg.date < START_TIME) return;
    if (!isAuthorized(msg)) return;
    if (!msg.text) return;

    const chatId = msg.chat.id.toString();
    const text   = msg.text.trim();
    const lower  = text.toLowerCase();

    printHeader('📨 텔레그램 메시지 수신', text);

    if (lower === '/start') {
        const aiStatus = AI_PRIORITY.map(ai => {
            if (ai === 'claude') return `Claude${isClaudeAvailable() ? ' ✅' : ' ⏳(한도초과)'}`;
            return `Gemini ✅`;
        }).join(' → ');
        return bot.sendMessage(chatId,
            `✅ 환영합니다!\n\n` +
            `AI 우선순위: ${aiStatus}\n` +
            `UE 연동: ${HAS_UE ? '✅ 활성화' : '⬜ 비활성화'}\n\n` +
            `모든 메시지는 AI 에이전트에게 전달됩니다.\n` +
            `AI가 필요에 따라 빌드·에디터 실행 등을 자동으로 처리합니다.\n\n` +
            `관리 명령어:\n` +
            `⚙️ /ping       — 상태 확인\n` +
            `⚙️ /newsession — Claude 세션 초기화\n` +
            `⚙️ /setreset   — Claude 한도 수동 초기화`
        );
    }

    if (lower === '/ping') {
        const remainMin = isClaudeAvailable() ? 0 : Math.ceil((CLAUDE_RETRY_DELAY_MS - (Date.now() - claudeLastTokenError)) / 60000);
        return bot.sendMessage(chatId,
            `🏓 Pong!\n` +
            `Claude: ${isClaudeAvailable() ? '✅ 사용 가능' : `⏳ 한도초과 (${remainMin}분 후 재시도)`}\n` +
            `세션: ${claudeSessionId ? `유지중 (${claudeSessionId.slice(0, 8)}…)` : '없음'}\n` +
            `UE 연동: ${HAS_UE ? '✅' : '⬜ 비활성화'}`
        );
    }

    if (lower === '/setreset') {
        claudeLastTokenError = 0;
        claudeSessionId = null;
        console.log('  [수동] Claude 토큰 한도 초기화');
        return bot.sendMessage(chatId, "✅ Claude 토큰 한도가 수동으로 초기화되었습니다.");
    }

    if (lower === '/newsession') {
        claudeSessionId = null;
        return bot.sendMessage(chatId, "🔄 Claude 세션이 초기화되었습니다. 다음 메시지부터 새 대화 시작.");
    }

    // 모든 텍스트 → AI 에이전트
    routeToAI(chatId, text);
});
