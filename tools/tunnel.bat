@echo off
title 일본어 학습장 HTTPS 터널
echo ====================================================
echo  폰에서 쓸 "https" 주소를 만듭니다.
echo  (먼저 python server.py 가 실행 중이어야 해요)
echo ====================================================
echo.
echo  잠깐 뒤 아래에 https://xxxx.trycloudflare.com 주소가
echo  나타나면 그 주소를 폰 브라우저에 입력하세요.
echo  주소는 실행할 때마다 새로 발급됩니다.
echo.
"%ProgramFiles(x86)%\cloudflared\cloudflared.exe" tunnel --url http://localhost:8000 --no-autoupdate
pause
