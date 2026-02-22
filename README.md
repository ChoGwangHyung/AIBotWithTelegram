# AIBotWithTelegram

> Control your projects and AI agents via Telegram — with optional Unreal Engine integration

---

## Quick Start (English)

### Mode 1 — AI Chat Only

Use Claude or Gemini as a remote AI agent via Telegram, without any Unreal Engine setup.

**Step 1: Install dependencies**
```bash
git clone https://github.com/<your-username>/AIBotWithTelegram.git
cd AIBotWithTelegram
npm install
```

**Step 2: Create your `.env`**
```bash
cp .env.example .env
```
Fill in the required values:
```env
TELEGRAM_BOT_TOKEN=your_bot_token_here
AUTHORIZED_CHAT_ID=your_telegram_chat_id

AI_PRIORITY=claude,gemini
PRIORITY_RETRY_DELAY_MINUTES=60

CLAUDE_EXE=C:\Users\you\.local\bin\claude.exe
GEMINI_EXE=C:\Users\you\AppData\Roaming\npm\gemini.cmd

# AI working directory — where CLAUDE.md / GEMINI.md / TODO.md live
AI_PROJECT_DIR=D:\YourProject
```
Leave `UPROJECT_PATH` and `ENGINE_PATH` empty or omit them.

**Step 3: Start the bot**
```
Double-click  run.bat
```
or manually:
```bash
node index.js
```

**Step 4: Send a message on Telegram**

Send any natural language message to your bot. The AI agent will respond and take action.

```
You:  로그인 기능 구현해줘
Bot:  🧠 Claude Agent 작업 시작…
      (Claude reads your project files, writes code, responds)
```

---

### Mode 2 — With Unreal Engine (Build + Editor + Blueprint Editing)

Complete all steps in Mode 1, then follow these additional steps.

**Step 5: Set UE paths in `.env`**
```env
UPROJECT_PATH=D:\YourProject\YourProject.uproject
ENGINE_PATH=D:\Program Files\Epic Games\UE_5.x\Engine
```

**Step 6: Place context files in your project directory (`AI_PROJECT_DIR`)**

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude project context, coding conventions, and signal rules |
| `GEMINI.md` | Same for Gemini CLI |
| `TODO.md` | Shared task list — both AIs read this at session start |

**Step 7: (Optional) Set up Unreal MCP for Blueprint editing**

Install the [Unreal MCP server](https://github.com/chongdashu/unreal-mcp) plugin into your project. Configure Claude CLI to use it:

```json
// ~/.claude/mcp_servers.json  (or .claude/mcp_servers.json in your project)
{
  "unreal": {
    "command": "node",
    "args": ["D:\\Projects\\MCP\\Unreal_mcp\\index.js"],
    "cwd": "D:\\Projects\\MCP\\Unreal_mcp"
  }
}
```

**Step 8: Use it**

Just send natural language. The AI decides everything — when to build, when to run the editor, when to modify Blueprints.

```
You:  로그인 버튼 UI 만들어줘
Bot:  🧠 Claude Agent 작업 시작…
      (Claude writes C++ code)
      🔨 Claude: 빌드 시작!
      (UBT builds the project)
      🚀 Claude: 에디터 실행!
      (Unreal Editor launches)
      (Claude modifies Blueprint via MCP)
      Bot:  ✅ 완료
```

> No need to say "build" or "run the editor" — the AI judges when these are needed.

---

## 빠른 시작 (한국어)

### 모드 1 — AI 채팅 전용

언리얼 엔진 없이 Claude 또는 Gemini를 텔레그램으로 원격 AI 에이전트로 사용합니다.

**1단계: 의존성 설치**
```bash
git clone https://github.com/<your-username>/AIBotWithTelegram.git
cd AIBotWithTelegram
npm install
```

**2단계: `.env` 생성**
```bash
cp .env.example .env
```
아래 값을 채워 넣습니다:
```env
TELEGRAM_BOT_TOKEN=텔레그램_봇_토큰
AUTHORIZED_CHAT_ID=내_채팅_ID

AI_PRIORITY=claude,gemini
PRIORITY_RETRY_DELAY_MINUTES=60

CLAUDE_EXE=C:\Users\you\.local\bin\claude.exe
GEMINI_EXE=C:\Users\you\AppData\Roaming\npm\gemini.cmd

# AI 작업 디렉터리 — CLAUDE.md / GEMINI.md / TODO.md가 있는 프로젝트 루트
AI_PROJECT_DIR=D:\YourProject
```
`UPROJECT_PATH`와 `ENGINE_PATH`는 비워두거나 생략합니다.

**3단계: 봇 시작**
```
run.bat 더블클릭
```
또는 수동:
```bash
node index.js
```

**4단계: 텔레그램에서 메시지 전송**

자연어로 무엇이든 보내세요. AI 에이전트가 응답하고 행동합니다.

```
나:   로그인 기능 구현해줘
봇:   🧠 Claude Agent 작업 시작…
      (Claude가 프로젝트 파일을 읽고, 코드를 작성하고, 응답)
```

---

### 모드 2 — 언리얼 엔진 연동 (빌드 + 에디터 + 블루프린트 수정)

모드 1을 완료한 후 아래 단계를 추가로 진행합니다.

**5단계: `.env`에 UE 경로 설정**
```env
UPROJECT_PATH=D:\YourProject\YourProject.uproject
ENGINE_PATH=D:\Program Files\Epic Games\UE_5.x\Engine
```

**6단계: 프로젝트 디렉터리 (`AI_PROJECT_DIR`)에 컨텍스트 파일 배치**

| 파일 | 용도 |
|------|------|
| `CLAUDE.md` | Claude 프로젝트 컨텍스트, 코딩 컨벤션, 시그널 규칙 |
| `GEMINI.md` | Gemini CLI용 동일 내용 |
| `TODO.md` | 공유 작업 목록 — 모든 AI가 세션 시작 시 읽음 |

**7단계: (선택) Unreal MCP 설정 — 블루프린트 수정**

[Unreal MCP 서버](https://github.com/chongdashu/unreal-mcp) 플러그인을 프로젝트에 설치합니다. Claude CLI에서 사용하도록 설정:

```json
// ~/.claude/mcp_servers.json  (또는 프로젝트 내 .claude/mcp_servers.json)
{
  "unreal": {
    "command": "node",
    "args": ["D:\\Projects\\MCP\\Unreal_mcp\\index.js"],
    "cwd": "D:\\Projects\\MCP\\Unreal_mcp"
  }
}
```

**8단계: 사용**

자연어로 보내면 됩니다. AI가 빌드, 에디터 실행, 블루프린트 수정 등 모든 것을 스스로 판단합니다.

```
나:   로그인 버튼 UI 만들어줘
봇:   🧠 Claude Agent 작업 시작…
      (Claude가 C++ 코드 작성)
      🔨 Claude: 빌드 시작!
      (UBT 빌드 진행)
      🚀 Claude: 에디터 실행!
      (언리얼 에디터 실행)
      (Claude가 MCP를 통해 블루프린트 수정)
      봇:  ✅ 완료
```

> "빌드해줘", "에디터 켜줘"라고 말하지 않아도 됩니다. AI가 상황에 맞게 자동으로 판단합니다.

---

## Reference

### Overview

AIBotWithTelegram is a Node.js Telegram bot that uses AI agents (Claude / Gemini) to remotely control your development environment.

- 🧠 **Natural language commands** — the AI decides what actions to take
- 🔄 **Automatic AI fallback** — when the primary AI hits its token limit, the bot switches to the next AI with full context handoff
- 🔗 **Session continuity** — Claude maintains its conversation session across messages
- 🏗️ **UE build & editor control** — triggered automatically by AI signals (optional)
- 🎨 **Blueprint editing** — via Unreal MCP server (optional)

### All `.env` Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Telegram bot token from @BotFather |
| `AUTHORIZED_CHAT_ID` | ✅ | Only this chat ID can use the bot |
| `AI_PRIORITY` | ✅ | Comma-separated AI order, e.g. `claude,gemini` |
| `PRIORITY_RETRY_DELAY_MINUTES` | — | Minutes before retrying primary AI (default: 60) |
| `CLAUDE_EXE` | ✅ | Path to `claude.exe` CLI |
| `GEMINI_EXE` | ✅ | Path to `gemini.cmd` CLI |
| `AI_PROJECT_DIR` | ✅ | Working directory for AI agents (project root) |
| `UPROJECT_PATH` | UE only | Path to your `.uproject` file |
| `ENGINE_PATH` | UE only | Unreal Engine root directory |

**Getting your Chat ID**: Send any message to your bot, then visit:
`https://api.telegram.org/bot<TOKEN>/getUpdates`

**Finding CLI paths:**
```bash
where claude    # Windows
where gemini    # Windows
```

### Claude Permissions (`.claude/settings.local.json`)

Place this file inside `AI_PROJECT_DIR` to control what Claude can access:

```json
{
  "permissions": {
    "allow": [
      "Bash(git:*)",
      "Bash(node:*)",
      "Bash(npm:*)"
    ],
    "deny": [
      "Bash(git remote rm:*)",
      "Bash(git remote remove:*)",
      "Bash(rm -rf:*)"
    ]
  }
}
```

The bot runs Claude with `--dangerously-skip-permissions`. Always restrict dangerous operations via the deny list.

### Bot Commands

| Command | Action |
|---------|--------|
| `/start` | Show welcome message and current status |
| `/ping` | Check AI availability and session status |
| `/newsession` | Reset Claude conversation session |
| `/setreset` | Manually clear primary AI token limit timer |
| **Any other text** | Forwarded to AI agent |

### AI Signal System

AI agents include signals in their responses to trigger follow-up actions:

| Signal | Bot Action |
|--------|------------|
| `[BUILD_REQUESTED]` | Run UBT build |
| `[RUN_EDITOR_REQUESTED]` | Launch Unreal Editor |
| `[KILL_EDITOR_REQUESTED]` | Force-kill Unreal Editor |
| `[GENERATE_REQUESTED]` | Regenerate `.sln` project files |
| BUILD + RUN together | Build → then launch editor on success |

### Architecture

```
Telegram ──→ Bot Router
              ├─ /start /ping /newsession /setreset  (management)
              └─ Everything else → AI Routing  (AI_PRIORITY order)
                   ├─ Claude  (primary)
                   │    ├─ Session continuity  (--resume <session_id>)
                   │    ├─ stream-json  → real-time terminal output
                   │    ├─ MCP tools   → Blueprint editing  (optional)
                   │    └─ Token limit  → handoff to next AI
                   └─ Gemini  (fallback)
                        ├─ Context passed via stdin
                        └─ Same signal system

AI response signals → Bot executes:
  [BUILD_REQUESTED]       → UBT build
  [RUN_EDITOR_REQUESTED]  → launch editor
  [KILL_EDITOR_REQUESTED] → kill editor
  [GENERATE_REQUESTED]    → regenerate .sln
```

### Security

**This bot is designed for local/personal use only.**

| Aspect | Detail |
|--------|--------|
| Network | Telegram outbound polling only — **no inbound ports opened** |
| Authentication | Only `AUTHORIZED_CHAT_ID` messages are processed |
| AI permissions | Claude runs with `--dangerously-skip-permissions`; restrict via `.claude/settings.local.json` deny list |
| Secrets | Never commit `.env` (included in `.gitignore`) |

---

## License

MIT
