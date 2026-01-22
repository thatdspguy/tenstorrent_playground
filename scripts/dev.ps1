#!/usr/bin/env pwsh
# Development startup script for Tenstorrent Simulator Playground
# Run from project root: .\scripts\dev.ps1

$ErrorActionPreference = "Stop"

Write-Host "Starting Tenstorrent Simulator Playground..." -ForegroundColor Cyan

# Get script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Kill any existing processes
Write-Host "Stopping existing processes..." -ForegroundColor Yellow
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "*vite*" } | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start Backend
Write-Host "`nStarting Backend (FastAPI)..." -ForegroundColor Green
$BackendPath = Join-Path $ProjectRoot "backend"
$PythonExe = Join-Path $BackendPath ".venv\Scripts\python.exe"

if (-not (Test-Path $PythonExe)) {
    Write-Host "Backend venv not found. Running uv sync..." -ForegroundColor Yellow
    Push-Location $BackendPath
    uv sync
    Pop-Location
}

Start-Process -FilePath $PythonExe `
    -ArgumentList "-m", "uvicorn", "playground.main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $BackendPath `
    -NoNewWindow

# Wait for backend to start
Write-Host "Waiting for backend..." -ForegroundColor Gray
$maxAttempts = 10
$attempt = 0
do {
    Start-Sleep -Seconds 1
    $attempt++
    try {
        $response = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/health" -TimeoutSec 2 -ErrorAction SilentlyContinue
        if ($response.status -eq "healthy") {
            Write-Host "Backend ready at http://127.0.0.1:8000" -ForegroundColor Green
            break
        }
    } catch {
        Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    }
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host "Backend may not have started. Check for errors." -ForegroundColor Yellow
}

# Start Frontend
Write-Host "`nStarting Frontend (Vite)..." -ForegroundColor Green
$FrontendPath = Join-Path $ProjectRoot "frontend"

if (-not (Test-Path (Join-Path $FrontendPath "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    Push-Location $FrontendPath
    npm install
    Pop-Location
}

Push-Location $FrontendPath
npm run dev
Pop-Location
