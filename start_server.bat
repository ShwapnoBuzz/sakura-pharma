@echo off
cd /d "%~dp0"
echo Sakura Pharma: http://localhost:8765  (bondho korte ei window close korun)
start "" http://localhost:8765/index.html
python -m http.server 8765 || py -m http.server 8765
pause
