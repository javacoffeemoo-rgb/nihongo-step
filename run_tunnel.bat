@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 일본어 학습장 - 서버 + HTTPS 터널
echo ====================================================
echo  일본어 학습장 (서버 + HTTPS 터널) 한 번에 실행
echo ====================================================
echo.
echo [1/2] 학습 서버를 새 창에서 시작합니다...
start "일본어 학습 서버" cmd /k python server.py
timeout /t 2 /nobreak > nul
echo [2/2] HTTPS 터널을 엽니다. 잠시 기다리면 아래에
echo       https://xxxx.trycloudflare.com 주소가 나옵니다.
echo.
echo       그 주소를 폰 브라우저에 입력하세요.
echo       (이 창을 닫으면 터널이 끊깁니다)
echo.
"%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000 --no-autoupdate
pause
