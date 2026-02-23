@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

set "BOT_DIR=D:\Projects\AIBotWithTelegram"
set "TERM_PID_FILE=%BOT_DIR%\term.pid"
set "NODE_PID_FILE=%BOT_DIR%\bot.pid"
set "OLD_TERM_PID="
set "OLD_NODE_PID="

echo [AIBot] Stopping old instance...

if exist "%NODE_PID_FILE%" (
    set /p OLD_NODE_PID=<"%NODE_PID_FILE%"
)
if exist "%TERM_PID_FILE%" (
    set /p OLD_TERM_PID=<"%TERM_PID_FILE%"
)

if defined OLD_TERM_PID (
    if defined OLD_NODE_PID (
        tasklist /FI "PID eq !OLD_NODE_PID!" /FO CSV /NH 2>nul | findstr /I "node" >nul 2>&1
        if not errorlevel 1 (
            echo   Killing terminal PID=!OLD_TERM_PID! ...
            taskkill /PID !OLD_TERM_PID! /F /T >nul 2>&1
            echo   Done.
        ) else (
            echo   Old bot already stopped.
        )
    ) else (
        echo   No valid bot PID found.
    )
) else (
    echo   No running terminal found.
)

del "%TERM_PID_FILE%" >nul 2>&1
del "%NODE_PID_FILE%" >nul 2>&1

echo [AIBot] Starting bot...
start "AIBot - Telegram" cmd /k "chcp 65001 >nul && cd /d D:\Projects\AIBotWithTelegram && node index.js"
