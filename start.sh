#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/backend"
pip install -r requirements.txt -q
uvicorn main:app --reload --reload-exclude "data/*" --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

cd "../frontend"
npm install --silent
npm run dev -- --host 0.0.0.0 --port 1421 &
FRONTEND_PID=$!

echo "Backend  PID $BACKEND_PID  →  http://localhost:8000"
echo "Frontend PID $FRONTEND_PID →  http://localhost:1421"
echo "Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" INT TERM EXIT
wait
