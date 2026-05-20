#!/bin/bash
set -e

echo "==================================="
echo "  RentIQ - AI Rental Pricing Tool"
echo "==================================="

# Check for API key
if [ ! -f "backend/.env" ]; then
  if [ -z "$ANTHROPIC_API_KEY" ]; then
    echo ""
    echo "⚠️  No Anthropic API key found!"
    echo "   Either set ANTHROPIC_API_KEY env var or create backend/.env"
    echo "   with ANTHROPIC_API_KEY=your_key_here"
    echo ""
    read -p "Enter your Anthropic API key: " api_key
    echo "ANTHROPIC_API_KEY=$api_key" > backend/.env
    echo "✓ API key saved to backend/.env"
  else
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" > backend/.env
    echo "✓ API key loaded from environment"
  fi
fi

# Start backend
echo ""
echo "▶ Starting backend on http://localhost:8000 ..."
cd backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 2
echo "✓ Backend running (PID: $BACKEND_PID)"

# Start frontend
echo ""
echo "▶ Starting frontend on http://localhost:5173 ..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "==================================="
echo "  ✅ App running!"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo "==================================="
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for both
wait $BACKEND_PID $FRONTEND_PID
