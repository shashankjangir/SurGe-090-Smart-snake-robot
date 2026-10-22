@echo off
python -m pip install -r "%~dp0requirements.txt"
if errorlevel 1 exit /b 1
echo Installation complete.
