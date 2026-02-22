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

**Step 2: Install and authenticate AI CLIs**

You only need to set up the AI(s) you plan to use. Claude is recommended as the primary.

---

#### Claude CLI

**Install**

Windows (PowerShell):
```powershell
irm https://claude.ai/install.ps1 | iex
```
macOS / Linux:
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**Authenticate — Option A: Account login** (Claude Pro / Max subscription)

Run `claude` once — the first-time wizard opens a browser for OAuth sign-in with your claude.ai account. No extra steps after that.

**Authenticate — Option B: API key** (pay-as-you-go, no subscription needed)

1. Go to [console.anthropic.com](https://console.anthropic.com) → **API Keys** → create a key
2. When `claude` prompts for an API key on first run, paste it — or set the environment variable:
   ```bash
   # Windows PowerShell (permanent)
   [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY","sk-ant-...", "User")
   # macOS / Linux (.bashrc / .zshrc)
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

---

#### Gemini CLI

**Install**
```bash
npm install -g @google/gemini-cli
```

**Authenticate — Option A: Google account login** (free quota available)

Run `gemini` once → select **Login with Google** → browser opens → sign in with your Google account. Done.

**Authenticate — Option B: API key** (Google AI Studio)

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → **Create API Key**
2. Set the environment variable:
   ```bash
   # Windows PowerShell (permanent)
   [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY","AIza...", "User")
   # macOS / Linux (.bashrc / .zshrc)
   export GEMINI_API_KEY="AIza..."
   ```

---

After authenticating, find the CLI paths — you'll need these for `.env`:
```bash
where claude    # Windows  →  copy to CLAUDE_EXE
where gemini    # Windows  →  copy to GEMINI_EXE
```

---

**Step 3: Get your Telegram credentials**

**Bot Token** — talk to [@BotFather](https://t.me/BotFather) on Telegram:
1. Send `/newbot`
2. Choose a name (e.g. `My Dev Bot`)
3. Choose a username ending in `bot` (e.g. `mydev_bot`)
4. BotFather replies with your token: `123456789:AAF...`

**Chat ID** — find your personal chat ID:
1. Send any message to your new bot
2. Open this URL in a browser (replace `<TOKEN>` with your token):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. Look for `"chat":{"id":` in the response — that number is your Chat ID

**Step 4: Create your `.env`**
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

**Step 5: Start the bot**
```
Double-click  run.bat
```
or manually:
```bash
node index.js
```

**Step 6: Send a message on Telegram**

Send any natural language message to your bot. The AI agent will respond and take action.

```
You:  로그인 기능 구현해줘
Bot:  🧠 Claude Agent 작업 시작…
      (Claude reads your project files, writes code, responds)
```

---

### Mode 2 — With Unreal Engine (Build + Editor + Blueprint Editing)

Complete all steps in Mode 1, then follow these additional steps.

**Step 7: Set UE paths in `.env`**
```env
UPROJECT_PATH=D:\YourProject\YourProject.uproject
ENGINE_PATH=D:\Program Files\Epic Games\UE_5.x\Engine
```

**Step 8: Place context files in your project directory (`AI_PROJECT_DIR`)**

| File | Purpose |
|------|---------|
| `CLAUDE.md` | Claude project context, coding conventions, and signal rules |
| `GEMINI.md` | Same for Gemini CLI |
| `TODO.md` | Shared task list — both AIs read this at session start |

**Step 9: (Optional) Set up Unreal MCP for Blueprint editing**

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

**Step 10: Use it**

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

**2단계: AI CLI 설치 및 인증**

사용할 AI만 설정하면 됩니다. Claude를 기본으로 권장합니다.

---

#### Claude CLI

**설치**

Windows (PowerShell):
```powershell
irm https://claude.ai/install.ps1 | iex
```
macOS / Linux:
```bash
curl -fsSL https://claude.ai/install.sh | bash
```

**인증 방법 A — 계정 로그인** (Claude Pro / Max 구독 필요)

터미널에서 `claude`를 한 번 실행하면 최초 실행 마법사가 브라우저를 열어 claude.ai 계정으로 OAuth 로그인합니다. 이후 추가 설정 없음.

**인증 방법 B — API 키** (구독 없이 종량제 사용)

1. [console.anthropic.com](https://console.anthropic.com) → **API Keys** → 키 생성
2. `claude` 최초 실행 시 키 입력 프롬프트에 붙여넣기 — 또는 환경변수로 설정:
   ```powershell
   # Windows PowerShell (영구 설정)
   [System.Environment]::SetEnvironmentVariable("ANTHROPIC_API_KEY","sk-ant-...", "User")
   ```
   ```bash
   # macOS / Linux (.bashrc / .zshrc에 추가)
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

---

#### Gemini CLI

**설치**
```bash
npm install -g @google/gemini-cli
```

**인증 방법 A — Google 계정 로그인** (무료 할당량 제공)

터미널에서 `gemini`를 한 번 실행 → **Login with Google** 선택 → 브라우저에서 Google 계정 로그인. 완료.

**인증 방법 B — API 키** (Google AI Studio)

1. [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) → **Create API Key** → 키 복사
2. 환경변수로 설정:
   ```powershell
   # Windows PowerShell (영구 설정)
   [System.Environment]::SetEnvironmentVariable("GEMINI_API_KEY","AIza...", "User")
   ```
   ```bash
   # macOS / Linux (.bashrc / .zshrc에 추가)
   export GEMINI_API_KEY="AIza..."
   ```

---

인증 완료 후 CLI 경로 확인 — `.env`에 입력할 값입니다:
```bash
where claude    # Windows  →  CLAUDE_EXE에 입력
where gemini    # Windows  →  GEMINI_EXE에 입력
```

---

**3단계: 텔레그램 인증 정보 준비**

**봇 토큰** — 텔레그램에서 [@BotFather](https://t.me/BotFather)에게 말을 겁니다:
1. `/newbot` 전송
2. 봇 이름 입력 (예: `My Dev Bot`)
3. 봇 아이디 입력 — 반드시 `bot`으로 끝나야 함 (예: `mydev_bot`)
4. BotFather가 토큰을 전송: `123456789:AAF...`

**채팅 ID** — 내 개인 채팅 ID 확인:
1. 방금 만든 봇에게 아무 메시지나 전송
2. 아래 URL을 브라우저에서 열기 (`<TOKEN>` 자리에 발급받은 토큰 입력):
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
3. 응답 JSON에서 `"chat":{"id":` 뒤에 있는 숫자가 채팅 ID

**4단계: `.env` 생성**
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

**5단계: 봇 시작**
```
run.bat 더블클릭
```
또는 수동:
```bash
node index.js
```

**6단계: 텔레그램에서 메시지 전송**

자연어로 무엇이든 보내세요. AI 에이전트가 응답하고 행동합니다.

```
나:   로그인 기능 구현해줘
봇:   🧠 Claude Agent 작업 시작…
      (Claude가 프로젝트 파일을 읽고, 코드를 작성하고, 응답)
```

---

### 모드 2 — 언리얼 엔진 연동 (빌드 + 에디터 + 블루프린트 수정)

모드 1을 완료한 후 아래 단계를 추가로 진행합니다.

**7단계: `.env`에 UE 경로 설정**
```env
UPROJECT_PATH=D:\YourProject\YourProject.uproject
ENGINE_PATH=D:\Program Files\Epic Games\UE_5.x\Engine
```

**8단계: 프로젝트 디렉터리 (`AI_PROJECT_DIR`)에 컨텍스트 파일 배치**

| 파일 | 용도 |
|------|------|
| `CLAUDE.md` | Claude 프로젝트 컨텍스트, 코딩 컨벤션, 시그널 규칙 |
| `GEMINI.md` | Gemini CLI용 동일 내용 |
| `TODO.md` | 공유 작업 목록 — 모든 AI가 세션 시작 시 읽음 |

**9단계: (선택) Unreal MCP 설정 — 블루프린트 수정**

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

**10단계: 사용**

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

### 보안 설정 (선택)

#### BLOCKED_COMMANDS — 절대 실행 금지

`.env`에 위험 명령 패턴을 추가하면, 봇 시작 시 `.claude/settings.local.json`에 deny 규칙으로 자동 등록됩니다. Claude는 해당 명령을 절대 실행하지 않습니다.

```env
BLOCKED_COMMANDS=rm -rf,del /f /s /q,DROP TABLE,format
```

#### CONFIRM_COMMANDS — 텔레그램 y/n 승인

특정 키워드가 포함된 메시지는 AI에 전달되기 전에 텔레그램으로 승인 요청을 보냅니다.

```env
CONFIRM_COMMANDS=git push,npm publish,git reset --hard
```

```
사용자:  "main에 push 해줘"
봇:      🔐 승인 필요 — 확인 키워드: git push
         진행하시겠습니까? y — 진행  n — 취소
사용자:  y
봇:      ✅ 승인되었습니다. 작업을 시작합니다…
```

`CONFIRM_TIMEOUT_MINUTES` 설정 시간(기본 3분) 내 응답이 없으면 자동 취소됩니다.

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
| AI permissions | Claude runs with `--dangerously-skip-permissions`; restrict via `BLOCKED_COMMANDS` and `.claude/settings.local.json` deny list |
| Secrets | Never commit `.env` (included in `.gitignore`) |

#### BLOCKED_COMMANDS — Always Denied

Add dangerous command patterns to `BLOCKED_COMMANDS` in `.env`. The bot registers them as deny rules in `.claude/settings.local.json` at startup. Claude will refuse to execute matching commands and explain why.

```env
# Claude can never run these, regardless of what the user asks
BLOCKED_COMMANDS=rm -rf,del /f /s /q,DROP TABLE,format
```

These are written as `Bash(<pattern>:*)` deny rules into `AI_PROJECT_DIR/.claude/settings.local.json`.

#### CONFIRM_COMMANDS — Telegram y/n Approval

Add keywords to `CONFIRM_COMMANDS`. When a user message contains any of these keywords, the bot asks for approval **before** forwarding to the AI. The AI only runs after explicit `y` confirmation.

```env
# These keywords in a user message trigger a Telegram y/n prompt
CONFIRM_COMMANDS=git push,npm publish,git reset --hard
```

**Flow:**
```
User:  "main에 push 해줘"
Bot:   🔐 승인 필요
       확인 키워드: git push
       진행하시겠습니까? y — 진행  n — 취소
       (`CONFIRM_TIMEOUT_MINUTES`분 내 응답 없으면 자동 취소)

User:  y
Bot:   ✅ 승인되었습니다. 작업을 시작합니다…
       🧠 Claude Agent 작업 시작…
```

> If neither `y` nor `n` is received within `CONFIRM_TIMEOUT_MINUTES` minutes (default: 3), the request is automatically cancelled.

---

## License

MIT
