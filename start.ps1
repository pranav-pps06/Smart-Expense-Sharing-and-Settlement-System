# Smart Expense Sharing System - PowerShell Start Script

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Smart Expense Sharing System - Quick Start" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check MySQL
Write-Host "[1/4] Checking MySQL service..." -ForegroundColor Yellow
$mysqlService = Get-Service -Name "MySQL*" -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'}
if ($mysqlService) {
    Write-Host "✓ MySQL is running" -ForegroundColor Green
} else {
    Write-Host "WARNING: MySQL service not detected or not running" -ForegroundColor Red
    Write-Host "Please start MySQL: net start MySQL80" -ForegroundColor Yellow
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne 'y') { exit }
}

# Check MongoDB
Write-Host ""
Write-Host "[2/4] Checking MongoDB service..." -ForegroundColor Yellow
$mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue | Where-Object {$_.Status -eq 'Running'}
if ($mongoService) {
    Write-Host "✓ MongoDB is running" -ForegroundColor Green
} else {
    Write-Host "WARNING: MongoDB service not detected or not running" -ForegroundColor Red
    Write-Host "Please start MongoDB: net start MongoDB" -ForegroundColor Yellow
}

# Check .env file
Write-Host ""
Write-Host "[3/4] Checking configuration..." -ForegroundColor Yellow
if (Test-Path "backend\.env") {
    Write-Host "✓ Configuration file found" -ForegroundColor Green
} else {
    Write-Host "ERROR: .env file not found in backend folder!" -ForegroundColor Red
    Write-Host "Please configure backend\.env file first" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit
}

# Start servers
Write-Host ""
Write-Host "[4/4] Starting servers..." -ForegroundColor Yellow

# Start backend in new window
Write-Host "Starting Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'Starting Backend Server...' -ForegroundColor Green; npm start"

# Wait a bit
Start-Sleep -Seconds 2

# Start frontend in new window
Write-Host "Starting Frontend Development Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'Starting Frontend Dev Server...' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✓ Application is starting!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Backend:  http://localhost:3000" -ForegroundColor White
Write-Host "Frontend: http://localhost:5173" -ForegroundColor White
Write-Host ""
Write-Host "Two PowerShell windows should have opened." -ForegroundColor Yellow
Write-Host "Check them for any errors." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
