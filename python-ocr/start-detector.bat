@echo off
REM Start Target Detection Service (Windows)

echo Starting Target Detection Service...
echo ======================================
echo.

cd /d "%~dp0"

REM Check if virtual environment exists
if not exist "venv\" (
    echo Error: Virtual environment not found!
    echo Please create it first:
    echo   python -m venv venv
    echo   venv\Scripts\activate
    echo   pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Check if required packages are installed
echo Checking dependencies...
python -c "import cv2, flask, flask_cors, numpy, PIL" 2>nul
if errorlevel 1 (
    echo Installing required packages...
    pip install -r requirements.txt
)

echo.
echo Starting Flask service on http://localhost:5001
echo Press Ctrl+C to stop
echo ======================================
echo.

REM Start the service
python target_detector.py

pause
