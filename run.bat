@echo off
chcp 65001 >nul
echo [AIBot] 기존 봇 인스턴스 종료 중...

set PID_FILE=D:\Projects\AIBotWithTelegram\bot.pid

if exist "%PID_FILE%" (
    set /p OLD_PID=<"%PID_FILE%"
    echo   PID %OLD_PID% 종료 시도...
    taskkill /PID %OLD_PID% /F >nul 2>&1
    del "%PID_FILE%" >nul 2>&1
    echo   완료.
) else (
    echo   실행 중인 인스턴스 없음.
)

timeout /t 1 /nobreak >nul
echo [AIBot] 봇을 새 터미널에서 시작합니다...
start "AIBot - Telegram" cmd /k "chcp 65001 >nul && cd /d D:\Projects\AIBotWithTelegram && node index.js"
