@echo off
echo Installing SURGE-SNAKE Python dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt
echo.
echo Installation complete!
pause
