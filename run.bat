@echo off
chcp 65001 > nul
cd /d "%~dp0"
echo ============================================
echo  카카오톡 일본어 회화봇 - 스킬 서버 시작
echo ============================================
echo.
python server.py
echo.
echo 서버가 종료되었습니다.
pause
