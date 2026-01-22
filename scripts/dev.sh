#!/bin/bash
# Development startup script for Tenstorrent Simulator Playground (Unix/WSL)
# Run from project root: ./scripts/dev.sh

set -e

echo "🚀 Starting Tenstorrent Simulator Playground..."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Kill existing processes
echo -e "${YELLOW}Stopping existing processes...${NC}"
pkill -f "uvicorn playground" || true
pkill -f "vite" || true
sleep 1

# Start Backend
echo -e "\n${GREEN}📦 Starting Backend (FastAPI)...${NC}"
cd "$PROJECT_ROOT/backend"

if [ ! -d ".venv" ]; then
    echo -e "${YELLOW}Creating backend venv...${NC}"
    uv sync
fi

source .venv/bin/activate
uvicorn playground.main:app --host 127.0.0.1 --port 8000 &
BACKEND_PID=$!

# Wait for backend
echo "Waiting for backend..."
for i in {1..10}; do
    if curl -s http://127.0.0.1:8000/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend ready at http://127.0.0.1:8000${NC}"
        break
    fi
    sleep 1
done

# Start Frontend
echo -e "\n${GREEN}🎨 Starting Frontend (Vite)...${NC}"
cd "$PROJECT_ROOT/frontend"

if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing frontend dependencies...${NC}"
    npm install
fi

npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
