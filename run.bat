@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ============================================
echo  일본어 학습장 - 서버 시작
echo ============================================
echo.
echo  PC: http://localhost:8000
echo  폰: http://172.30.1.78:8000 (같은 와이파이)
echo  HTTPS(녹음·설치 가능): run_tunnel.bat 더블클릭
echo.
python server.py
echo.
echo 서버가 종료되었습니다.
pause
