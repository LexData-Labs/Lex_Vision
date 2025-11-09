@echo off
echo 🚀 Starting CCTV System with GPU Acceleration...
echo.

echo 📍 Current directory: %CD%
echo.

echo 🔧 Step 1: Activating Python Virtual Environment...
call venv\Scripts\activate.bat
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to activate virtual environment
    echo Please ensure venv exists and run: venv\Scripts\activate.bat
    pause
    exit /b 1
)
echo ✅ Virtual environment activated
echo.

echo 🖥️ Step 2: Checking GPU Status...
python -c "import torch; print(f'CUDA Available: {torch.cuda.is_available()}'); print(f'GPU Device: {torch.cuda.get_device_name() if torch.cuda.is_available() else \"N/A\"}')"
echo.

echo 🚀 Step 3: Starting Backend Server...
echo Starting FastAPI server on http://localhost:8000
echo Press Ctrl+C to stop the backend
echo.
start "Backend Server" cmd /k "venv\Scripts\activate.bat && python backend\backend.py"
echo.

echo ⏳ Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo 🌐 Step 4: Starting Frontend...
echo Starting React dev server on http://localhost:5173
echo Press Ctrl+C to stop the frontend
echo.
start "Frontend Server" cmd /k "cd frontend && npm run dev"
echo.

echo 🎯 Step 5: Opening Web Interface...
echo Waiting 5 seconds for services to start...
timeout /t 5 /nobreak >nul

echo 🌐 Opening web interface...
start http://localhost:5173
start http://localhost:8000/docs

echo.
echo ✅ System started successfully!
echo.
echo 📱 Access Points:
echo    Frontend: http://localhost:5173
echo    Backend:  http://localhost:8001
echo    API Docs: http://localhost:8000/docs
echo.
echo 🖥️ GPU Monitor: python main.py gpu
echo 🧪 GPU Test:   python test_gpu.py
echo.
echo Press any key to exit this launcher...
pause >nul
