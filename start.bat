@echo off
echo ============================================
echo Smart Expense Sharing System - Quick Start
echo ============================================
echo.

REM Check if MySQL is running
echo [1/4] Checking MySQL service...
sc query MySQL80 >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MySQL service not found. Trying MySQL...
    sc query MySQL >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: MySQL service is not running!
        echo Please start MySQL manually or run: net start MySQL80
        pause
        exit /b 1
    )
)
echo ✓ MySQL is running

REM Check if MongoDB is running
echo.
echo [2/4] Checking MongoDB service...
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo WARNING: MongoDB service might not be running
    echo If you encounter connection errors, run: net start MongoDB
) else (
    echo ✓ MongoDB is running
)

REM Check if .env file exists
echo.
echo [3/4] Checking configuration...
if not exist "backend\.env" (
    echo ERROR: .env file not found in backend folder!
    echo Please configure backend\.env file first
    pause
    exit /b 1
)
echo ✓ Configuration file found

REM Start backend
echo.
echo [4/4] Starting Backend Server...
echo Opening new window for backend...
start "Backend Server" cmd /k "cd /d backend && npm start"

REM Wait a few seconds for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend
echo.
echo Starting Frontend Development Server...
echo Opening new window for frontend...
start "Frontend Dev Server" cmd /k "cd /d frontend && npm run dev"

echo.
echo ============================================
echo ✓ Application is starting!
echo ============================================
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:5173
echo.
echo Two terminal windows should have opened.
echo Check them for any errors.
echo.
echo Press any key to exit this window...
pause >nul
