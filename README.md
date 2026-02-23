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
# Comma-separated list of additional directories the AI can access without permission prompts
AI_ALLOWED_DIRS=D:\YourOtherProject
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

> `run.bat` automatically closes any previously opened bot terminal window before launching a new one.

**Step 6: Send a message on Telegram**

Send any natural language message to your bot. The AI agent will respond and take action.

```
You:  로그인 기능 구현해줘
Bot:  🧠 Claude Agent 작업 시작…
      🔧 파일 읽기: AIBLoginWidget.cpp
      🔧 파일 수정: AIBLoginWidget.h
      (Claude reads your project files, writes code, responds)
      📊 완료 | ⏱ 47초 | 입력 8,210 토큰 | 출력 1,340 토큰
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
# 권한 요청 없이 추가로 접근 가능한 디렉터리 목록 (쉼표 구성)
AI_ALLOWED_DIRS=D:\YourOtherProject
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

> `run.bat`은 이전에 열린 봇 터미널 창을 자동으로 닫고 새 창을 엽니다.

**6단계: 텔레그램에서 메시지 전송**

자연어로 무엇이든 보내세요. AI 에이전트가 응답하고 행동합니다.

```
나:   로그인 기능 구현해줘
봇:   🧠 Claude Agent 작업 시작…
      🔧 파일 읽기: AIBLoginWidget.cpp
      🔧 파일 수정: AIBLoginWidget.h
      (Claude가 프로젝트 파일을 읽고, 코드를 작성하고, 응답)
      📊 완료 | ⏱ 47초 | 입력 8,210 토큰 | 출력 1,340 토큰
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

## 기능 상세

### 실시간 진행 상황 전송

Claude가 작업하는 동안 각 도구 사용을 텔레그램으로 즉시 전송하고, 완료 후 통계를 보여줍니다.

```
🔧 파일 읽기: AIBLoginWidget.cpp
🔧 내용 검색: AuthorizedChatId
🔧 파일 수정: AIBLoginWidget.h
🔧 명령 실행: git status

📊 완료 | ⏱ 1분 23초 | 입력 12,450 토큰 | 출력 1,820 토큰
```

"reading 1 file..." 같은 Claude Code의 진행 정보가 텔레그램에서 실시간으로 확인됩니다. 실행 시간은 작업 완료 후 합산하여 표시됩니다.

---

### 권한 시스템 (Smart Permission)

`.claude/hooks/permission-handler.js`가 존재하면 자동으로 활성화됩니다. Claude가 특정 작업을 시도할 때 텔레그램으로 허가를 요청합니다.

#### 기본 정책

| 상황 | 처리 |
|------|------|
| `AI_PROJECT_DIR` 내부 파일 읽기 / 쓰기 / 수정 | ✅ 자동 허용 |
| `AI_PROJECT_DIR` **외부** 파일 접근 | 🔑 권한 요청 |
| `rm`, `del`, `rmdir`, `rd`, `Remove-Item`, `git clean` 등 **삭제 명령** | 🔑 권한 요청 |

#### 권한 요청 메시지 예시

```
🔑 권한 요청

Claude가 다음 작업을 수행하려 합니다:
도구: `Bash`
🗑️ 파일/폴더 삭제 명령
rm -rf ./temp

허가하시겠습니까?
1 — 세션 동안 항상 허용
2 — 이번 한 번만 허용
3 — 거부
(3분 내 응답 없으면 자동 거부)
```

| 응답 | 동작 |
|------|------|
| `1` | 세션 동안 같은 도구는 다시 묻지 않음 |
| `2` | 이번 한 번만 허용 |
| `3` | 거부 — Claude에게 권한 거부 전달 |
| 응답 없음 | `CONFIRM_TIMEOUT_MINUTES` 경과 후 자동 거부 |

#### 추가 강제 도구 지정

기본 정책 외에 특정 도구를 **경로와 관계없이 항상** 권한 요청하려면:

```env
# 예: 웹 요청과 Bash 명령은 항상 허가 요청
PERMISSION_REQUIRED_TOOLS=WebFetch,Bash
```

---

### 보안 3단계 레이어

| 레이어 | 설정 | 동작 시점 |
|--------|------|-----------|
| **1. 완전 차단** | `BLOCKED_COMMANDS` | 봇 시작 시 `.claude/settings.local.json` deny 규칙 등록 → Claude가 해당 명령 자체를 거부 |
| **2. 사전 승인** | `CONFIRM_COMMANDS` | 사용자 메시지가 AI에 전달되기 **전** → 텔레그램 y/n 승인 |
| **3. 런타임 권한** | 훅 시스템 (항상 활성) | Claude가 도구를 **실행하려 할 때** → 텔레그램 1/2/3 승인 |

#### BLOCKED_COMMANDS — 절대 실행 금지

```env
BLOCKED_COMMANDS=rm -rf,del /f /s /q,DROP TABLE,format
```

봇 시작 시 `AI_PROJECT_DIR/.claude/settings.local.json`에 deny 규칙으로 자동 등록됩니다.

#### CONFIRM_COMMANDS — AI 전달 전 사전 승인

특정 키워드가 포함된 요청은 AI에 전달되기 전에 텔레그램으로 y/n을 묻습니다.

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

---

## Reference

### Overview

AIBotWithTelegram is a Node.js Telegram bot that uses AI agents (Claude / Gemini) to remotely control your development environment.

- 🧠 **Natural language commands** — the AI decides what actions to take
- 🔄 **Automatic AI fallback** — when the primary AI hits its token limit, the bot switches to the next AI with full context handoff
- 🔗 **Session continuity** — Claude maintains its conversation session across messages
- 📡 **Live progress** — tool usage sent to Telegram in real time; execution time and token stats on completion
- 🔑 **Smart permission system** — delete commands and out-of-project file access require Telegram approval
- 🏗️ **UE build & editor control** — triggered automatically by AI signals (optional)
- 🎨 **Blueprint editing** — via Unreal MCP server (optional)

### All `.env` Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | ✅ | — | Telegram bot token from @BotFather |
| `AUTHORIZED_CHAT_ID` | ✅ | — | Only this chat ID can use the bot |
| `AI_PRIORITY` | ✅ | `claude,gemini` | Comma-separated AI order |
| `PRIORITY_RETRY_DELAY_MINUTES` | — | `60` | Minutes before retrying primary AI after token limit |
| `CLAUDE_EXE` | ✅ | `claude` | Path to `claude.exe` CLI |
| `GEMINI_EXE` | ✅ | `gemini` | Path to `gemini.cmd` CLI |
| `AI_PROJECT_DIR` | ✅ | `cwd` | Working directory for AI agents (project root) |
| `AI_ALLOWED_DIRS` | — | — | Comma-separated list of additional allowed directories |
| `BLOCKED_COMMANDS` | — | — | Patterns Claude can never execute (OS-level deny rules) |
| `CONFIRM_COMMANDS` | — | — | Keywords requiring Telegram y/n approval before AI runs |
| `CONFIRM_TIMEOUT_MINUTES` | — | `3` | Minutes before pending approval auto-cancels |
| `PERMISSION_REQUIRED_TOOLS` | — | — | Tools that always require 1/2/3 permission (on top of smart policy) |
| `PERMISSION_PORT` | — | `8099` | Internal HTTP port for the permission hook server |
| `UPROJECT_PATH` | UE only | — | Path to your `.uproject` file |
| `ENGINE_PATH` | UE only | — | Unreal Engine root directory |

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
              ├─ Pending approval (y/n)   ← CONFIRM_COMMANDS
              ├─ Pending permission (1/2/3) ← runtime hook
              └─ Everything else → AI Routing  (AI_PRIORITY order)
                   ├─ Claude  (primary)
                   │    ├─ Session continuity  (--resume <session_id>)
                   │    ├─ stream-json  → real-time tool events → Telegram
                   │    ├─ PreToolUse hook → 1/2/3 approval
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

Permission Hook (always active):
  Claude tool_use
    ├─ path inside AI_PROJECT_DIR  → auto-allow
    ├─ path outside AI_PROJECT_DIR → 1/2/3 prompt
    └─ delete command              → 1/2/3 prompt
```

### Security

**This bot is designed for local/personal use only.**

| Aspect | Detail |
|--------|--------|
| Network | Telegram outbound polling only — **no inbound ports opened** |
| Authentication | Only `AUTHORIZED_CHAT_ID` messages are processed |
| Layer 1 — Blocked | `BLOCKED_COMMANDS` → deny rules in `.claude/settings.local.json` at startup |
| Layer 2 — Pre-flight | `CONFIRM_COMMANDS` → y/n approval before AI receives the request |
| Layer 3 — Runtime | PreToolUse hook → 1/2/3 approval when Claude uses a tool |
| Secrets | Never commit `.env` (included in `.gitignore`) |

#### Permission Hook File Structure

```
AIBotWithTelegram/
├── index.js                          ← HTTP server (port PERMISSION_PORT)
└── .claude/
    └── hooks/
        └── permission-handler.js     ← Hook script (called by Claude Code)
```

At startup the bot writes a `PreToolUse` hook entry into `AI_PROJECT_DIR/.claude/settings.json`. When Claude wants to execute a tool, Claude Code calls `permission-handler.js` before every tool use. The script posts to the bot's HTTP server; the bot sends a Telegram message and waits for the user's `1` / `2` / `3` reply.

---

## License

MIT
