# Tenstorrent Simulator Playground - Windows Setup Script
# This script sets up the WSL2 environment for running simulations

param(
    [switch]$SkipWSLCheck,
    [string]$WslDistro = "Ubuntu"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=== Tenstorrent Simulator Playground Setup ===" -ForegroundColor Cyan
Write-Host ""

# =============================================================================
# Check Prerequisites
# =============================================================================

Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check if WSL is available
if (-not $SkipWSLCheck) {
    try {
        $wslVersion = wsl --version 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "WSL not found"
        }
        Write-Host "  [OK] WSL is installed" -ForegroundColor Green
    }
    catch {
        Write-Host "  [ERROR] WSL is not installed or not enabled" -ForegroundColor Red
        Write-Host ""
        Write-Host "Please install WSL2 first:" -ForegroundColor Yellow
        Write-Host "  1. Open PowerShell as Administrator"
        Write-Host "  2. Run: wsl --install"
        Write-Host "  3. Restart your computer"
        Write-Host "  4. Run this script again"
        exit 1
    }

    # Check if the specified distribution exists
    $distros = wsl -l -q 2>&1 | Where-Object { $_ -ne "" }
    if ($distros -notcontains $WslDistro) {
        Write-Host "  [ERROR] WSL distribution '$WslDistro' not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available distributions:" -ForegroundColor Yellow
        $distros | ForEach-Object { Write-Host "    - $_" }
        Write-Host ""
        Write-Host "Install Ubuntu with: wsl --install -d Ubuntu" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "  [OK] WSL distribution '$WslDistro' found" -ForegroundColor Green
}

# Check Node.js
try {
    $nodeVersion = node --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Node.js $nodeVersion installed" -ForegroundColor Green
    }
    else {
        throw "Node.js not found"
    }
}
catch {
    Write-Host "  [WARNING] Node.js not found - required for frontend" -ForegroundColor Yellow
    Write-Host "    Install from: https://nodejs.org/" -ForegroundColor Gray
}

# Check Python/uv
try {
    $uvVersion = uv --version 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  [OK] uv $uvVersion installed" -ForegroundColor Green
    }
    else {
        throw "uv not found"
    }
}
catch {
    Write-Host "  [WARNING] uv not found - will attempt to install" -ForegroundColor Yellow
}

Write-Host ""

# =============================================================================
# Setup WSL2 Environment
# =============================================================================

Write-Host "Setting up WSL2 environment..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  NOTE: The WSL2 setup requires sudo access." -ForegroundColor Yellow
Write-Host "  You may be prompted for your WSL password." -ForegroundColor Yellow
Write-Host ""

# Create a temporary script file with Unix line endings
$wslSetupScript = @'
#!/bin/bash
set -e

echo ""
echo "=== WSL2 Simulator Setup ==="
echo ""

# Install system dependencies
echo "Installing system dependencies..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3 python3-pip wget curl git

# Install ttnn
echo "Installing ttnn..."
pip3 install ttnn torch --break-system-packages --quiet --index-url https://download.pytorch.org/whl/cpu 2>/dev/null || pip3 install ttnn torch --quiet --index-url https://download.pytorch.org/whl/cpu

# Setup ttsim
echo "Setting up ttsim simulator..."
mkdir -p ~/ttsim
cd ~/ttsim

TTSIM_VERSION="v1.3.1"

# Download Wormhole simulator
if [ ! -f "libttsim_wh.so" ]; then
    wget -q https://github.com/tenstorrent/ttsim/releases/download/${TTSIM_VERSION}/libttsim_wh.so
    echo "  Downloaded Wormhole simulator"
fi

# Download Blackhole simulator
if [ ! -f "libttsim_bh.so" ]; then
    wget -q https://github.com/tenstorrent/ttsim/releases/download/${TTSIM_VERSION}/libttsim_bh.so
    echo "  Downloaded Blackhole simulator"
fi

# Clone tt-metal for SOC descriptors
if [ ! -d "$HOME/tt-metal" ]; then
    echo "Cloning tt-metal for SOC descriptors..."
    git clone --depth 1 -q https://github.com/tenstorrent/tt-metal.git ~/tt-metal
fi

# Copy SOC descriptors for both architectures
cp ~/tt-metal/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml ~/ttsim/soc_descriptor.yaml 2>/dev/null || true
cp ~/tt-metal/tt_metal/soc_descriptors/wormhole_b0_80_arch.yaml ~/ttsim/wormhole_soc_descriptor.yaml 2>/dev/null || true
cp ~/tt-metal/tt_metal/soc_descriptors/blackhole_140_arch.yaml ~/ttsim/blackhole_soc_descriptor.yaml 2>/dev/null || true

# Install SFPI if not present
if [ ! -d "/opt/tenstorrent/sfpi" ]; then
    echo "Installing SFPI firmware..."
    SFPI_VERSION="7.17.0"
    wget -q https://github.com/tenstorrent/sfpi/releases/download/${SFPI_VERSION}/sfpi_${SFPI_VERSION}_x86_64_debian.deb -O /tmp/sfpi.deb
    sudo dpkg -i /tmp/sfpi.deb 2>/dev/null || true
    rm -f /tmp/sfpi.deb
fi

# Configure environment
BASHRC_MARKER="# Tenstorrent Playground Environment"
if ! grep -q "$BASHRC_MARKER" ~/.bashrc 2>/dev/null; then
    cat >> ~/.bashrc << 'ENVEOF'

# Tenstorrent Playground Environment
export TT_METAL_HOME=~/tt-metal
export TT_METAL_SIMULATOR=~/ttsim/libttsim_wh.so
export TT_METAL_SLOW_DISPATCH_MODE=1
ENVEOF
fi

echo ""
echo "=== Verifying Installation ==="

# Test imports
python3 -c "import ttnn; print('  [OK] ttnn imported successfully')" 2>/dev/null || echo "  [ERROR] ttnn import failed"
python3 -c "import torch; print('  [OK] torch imported successfully')" 2>/dev/null || echo "  [ERROR] torch import failed"

echo ""
echo "=== WSL2 Setup Complete ==="
'@

# Write script to temp file with Unix line endings (LF only)
$tempScript = [System.IO.Path]::GetTempFileName()
$wslSetupScript -replace "`r`n", "`n" | Set-Content -Path $tempScript -NoNewline -Encoding utf8

# Convert Windows path to WSL path and run
$wslTempPath = wsl wslpath -u $tempScript.Replace('\', '/')
wsl -d $WslDistro bash $wslTempPath

# Clean up
Remove-Item $tempScript -ErrorAction SilentlyContinue

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] WSL2 setup failed" -ForegroundColor Red
    exit 1
}

Write-Host ""

# =============================================================================
# Setup Windows Components
# =============================================================================

Write-Host "Setting up Windows components..." -ForegroundColor Yellow

$projectRoot = Split-Path -Parent $PSScriptRoot

# Install uv if not present
if (-not (Get-Command uv -ErrorAction SilentlyContinue)) {
    Write-Host "  Installing uv..." -ForegroundColor Gray
    Invoke-RestMethod https://astral.sh/uv/install.ps1 | Invoke-Expression
}

# Setup backend
Write-Host "  Setting up backend..." -ForegroundColor Gray
Push-Location "$projectRoot\backend"
try {
    uv sync 2>&1 | Out-Null
    Write-Host "  [OK] Backend dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "  [WARNING] Backend setup incomplete" -ForegroundColor Yellow
}
Pop-Location

# Setup frontend
Write-Host "  Setting up frontend..." -ForegroundColor Gray
Push-Location "$projectRoot\frontend"
try {
    npm install 2>&1 | Out-Null
    Write-Host "  [OK] Frontend dependencies installed" -ForegroundColor Green
}
catch {
    Write-Host "  [WARNING] Frontend setup incomplete - is Node.js installed?" -ForegroundColor Yellow
}
Pop-Location

# Create .env if it doesn't exist
$envFile = "$projectRoot\.env"
$envExample = "$projectRoot\.env.example"
if (-not (Test-Path $envFile) -and (Test-Path $envExample)) {
    Copy-Item $envExample $envFile
    Write-Host "  [OK] Created .env from .env.example" -ForegroundColor Green
}

Write-Host ""

# =============================================================================
# Summary
# =============================================================================

Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host ""
Write-Host "To start the playground:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Option 1 - Use the dev script:" -ForegroundColor White
Write-Host "    .\scripts\dev.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  Option 2 - Start manually:" -ForegroundColor White
Write-Host "    # Terminal 1 (Backend):" -ForegroundColor Gray
Write-Host "    cd backend" -ForegroundColor Gray
Write-Host "    uv run uvicorn playground.main:app --reload" -ForegroundColor Gray
Write-Host ""
Write-Host "    # Terminal 2 (Frontend):" -ForegroundColor Gray
Write-Host "    cd frontend" -ForegroundColor Gray
Write-Host "    npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "Then open http://localhost:5173 in your browser" -ForegroundColor Yellow
Write-Host ""
