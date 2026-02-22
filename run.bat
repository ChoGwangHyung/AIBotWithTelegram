@echo off
chcp 65001 >nul
echo [AIBot] 기존 봇 인스턴스 종료 중...

powershell -NoProfile -Command ^
  "Get-WmiObject Win32_Process -Filter \"name='node.exe'\" | Where-Object { $_.CommandLine -like '*AIBotWithTelegram*' } | ForEach-Object { Write-Host \"  PID $($_.ProcessId) 종료\"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

timeout /t 2 /nobreak >nul
echo [AIBot] 봇을 새 터미널에서 시작합니다...
start "AIBot - Telegram" cmd /k "chcp 65001 >nul && cd /d D:\Projects\AIBotWithTelegram && node index.js"
