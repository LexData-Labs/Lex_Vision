# 🚀 Lex Vision - Complete Project Analysis & Run Guide

## 📋 Project Overview

**Lex Vision** is a real-time CCTV monitoring system with:
- **Body Detection**: YOLOv8-based person detection
- **Face Recognition**: Employee identification using face_recognition library
- **Web Interface**: Modern React + TypeScript frontend
- **REST API**: FastAPI backend with real-time video streaming
- **GPU Acceleration**: Automatic GPU optimization for RTX 4060

---

## 📁 Project Structure

```
Lex_Vision/
├── backend/
│   └── backend.py          # ⭐ ALL BACKEND CODE (merged into one file)
│       ├── GPUOptimizer    # GPU optimization & monitoring
│       ├── BodyDetector    # YOLOv8 body detection
│       ├── FaceRecognizer  # Face detection & recognition
│       └── FastAPI App     # REST API + Video streaming
│
├── frontend/                # React + TypeScript frontend
│   ├── src/
│   │   ├── pages/          # Admin/Employee dashboards
│   │   ├── components/    # UI components
│   │   └── services/       # API client
│   └── package.json
│
├── data/
│   └── employee_faces/     # Employee face images (25+ employees)
│
├── start_system.py         # 🎯 Main startup script (Python)
├── start_system.bat        # 🎯 Main startup script (Windows)
└── requirements.txt        # Python dependencies
```

---

## 🔧 Prerequisites

### Required:
- ✅ **Python 3.8+** (Python 3.11 recommended)
- ✅ **Node.js 16+** and npm
- ✅ **Webcam or CCTV camera**

### Optional (but recommended):
- ✅ **CUDA-capable GPU** (NVIDIA GPU with CUDA support)
- ✅ **8GB+ GPU memory** (for optimal performance)

---

## 📦 Installation Steps

### Step 1: Install Python Dependencies

```bash
# Activate virtual environment (if using venv)
# Windows:
venv\Scripts\activate

# Linux/Mac:
source venv/bin/activate

# Install all Python packages
pip install -r requirements.txt
```

**Key Dependencies:**
- `ultralytics` - YOLOv8 for body detection
- `face-recognition` - Face recognition
- `fastapi` + `uvicorn` - Web server
- `torch` + `torchvision` - GPU acceleration
- `opencv-python` - Video processing

### Step 2: Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

**This installs:**
- React 18
- TypeScript
- Vite
- shadcn/ui components
- Tailwind CSS

### Step 3: Verify Employee Data

Ensure employee face images are in `data/employee_faces/`:
- ✅ 25+ employee images already present
- ✅ Images named with employee ID/name format

---

## 🎯 How to Run the Project

### ⭐ **Method 1: Automatic Startup (RECOMMENDED)**

This starts both backend and frontend automatically:

**Windows:**
```bash
start_system.bat
```

**Linux/Mac:**
```bash
python start_system.py
```

**What happens:**
1. ✅ Checks GPU status
2. ✅ Starts backend server (port 8000)
3. ✅ Starts frontend server (port 5173)
4. ✅ Opens browser automatically
5. ✅ Shows all access URLs

**To stop:** Press `Ctrl+C` in the terminal

---

### **Method 2: Run Backend Only**

```bash
python backend/backend.py
```

**What runs automatically:**
- ✅ GPU optimization
- ✅ Video processing (body detection)
- ✅ Face recognition
- ✅ FastAPI server

**Access:**
- API Server: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Video Feed: http://localhost:8000/video_feed

---

### **Method 3: Run Frontend Only**

```bash
cd frontend
npm run dev
```

**Access:**
- Frontend UI: http://localhost:5173

---

### **Method 4: Manual (Two Terminals)**

**Terminal 1 - Backend:**
```bash
python backend/backend.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

---

## 🌐 Access Points

Once running, access the system at:

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend Web UI** | http://localhost:5173 | Main user interface |
| **Backend API** | http://localhost:8000 | REST API server |
| **API Documentation** | http://localhost:8000/docs | Interactive API docs |
| **Video Feed Stream** | http://localhost:8000/video_feed | MJPEG video stream |

---

## 🔐 Login Credentials

**Admin Access:**
- Username: `admin`
- Password: `any` (placeholder authentication)

**Employee Access:**
- Username: `any`
- Password: `any` (placeholder authentication)

---

## ⚙️ Configuration (Environment Variables)

You can configure the system using environment variables:

```bash
# Backend port (default: 8000)
set PORT=8000

# Camera device index (default: 0)
set CAMERA_INDEX=0

# Camera source (file path or RTSP URL)
set CAMERA_SOURCE=rtsp://your-camera-url

# Detection confidence threshold (default: 0.3)
set DETECT_CONF_THRESHOLD=0.3

# CORS origins (comma-separated)
set CORS_ORIGINS=http://localhost:5173,http://localhost:8080

# Enable auto-reload (default: 0)
set UVICORN_RELOAD=1
```

---

## 🎬 What Happens When You Run

### Backend (`backend/backend.py`):

1. **GPU Optimization** (automatic)
   - Checks for CUDA availability
   - Applies PyTorch optimizations
   - Pre-allocates GPU memory
   - Shows GPU status

2. **Video Processing** (automatic)
   - Opens camera (index 0 or from env)
   - Detects bodies using YOLOv8
   - Recognizes faces within detected bodies
   - Streams processed video via MJPEG

3. **API Server** (automatic)
   - FastAPI server starts on port 8000
   - Provides REST endpoints
   - Streams video feed
   - Records attendance automatically

### Frontend (`npm run dev`):

1. **React Dev Server** starts on port 5173
2. **Hot reload** enabled for development
3. **Connects** to backend API automatically

---

## 🔍 Key Features

### Automatic Features (No Commands Needed):
- ✅ **GPU Optimization** - Enabled automatically
- ✅ **Body Detection** - Runs on every 3rd frame
- ✅ **Face Recognition** - Only processes detected bodies
- ✅ **Attendance Logging** - Records recognized employees
- ✅ **Video Streaming** - Real-time MJPEG stream

### Performance Optimizations:
- Frame skipping (processes every 3rd frame)
- Face detection only within body regions
- GPU-accelerated inference
- Optimized JPEG encoding (75% quality)

---

## 🐛 Troubleshooting

### Issue: Camera Not Detected

**Solution:**
```bash
# Try different camera indices
set CAMERA_INDEX=1
python backend/backend.py

# Or use RTSP/HTTP stream
set CAMERA_SOURCE=rtsp://your-camera-url
python backend/backend.py
```

### Issue: GPU Not Working

**Check:**
```bash
python -c "import torch; print(torch.cuda.is_available())"
```

**Solution:**
- Install CUDA-compatible PyTorch
- Check GPU drivers
- System will work on CPU (slower)

### Issue: Port Already in Use

**Solution:**
```bash
# Change backend port
set PORT=8001
python backend/backend.py

# Or change frontend port
cd frontend
npm run dev -- --port 5174
```

### Issue: Frontend Can't Connect to Backend

**Check:**
1. Backend is running on port 8000
2. No firewall blocking connections
3. CORS settings in backend allow frontend origin

### Issue: Module Not Found Errors

**Solution:**
```bash
# Reinstall Python dependencies
pip install -r requirements.txt

# Reinstall frontend dependencies
cd frontend
npm install
```

---

## 📊 System Requirements

### Minimum:
- CPU: 4 cores
- RAM: 8GB
- Storage: 5GB free space
- Camera: USB webcam or IP camera

### Recommended:
- CPU: 8+ cores
- RAM: 16GB
- GPU: NVIDIA RTX 3060 or better (8GB+ VRAM)
- Camera: 1080p or higher

---

## 🎯 Quick Start Summary

**Fastest way to run:**

```bash
# 1. Install dependencies (one time)
pip install -r requirements.txt
cd frontend && npm install && cd ..

# 2. Run everything
python start_system.py
```

**That's it!** The system will:
- ✅ Start backend with GPU optimization
- ✅ Start frontend
- ✅ Open browser
- ✅ Begin processing video automatically

---

## 📝 Notes

- **All backend code** is in `backend/backend.py` (single file)
- **Video processing** runs automatically when backend starts
- **No separate commands** needed for GPU or video processing
- **Attendance** is logged automatically when faces are recognized
- **Data** is stored in-memory (restart clears it)

---

## 🛑 Stopping the System

**If using `start_system.py`:**
- Press `Ctrl+C` in the terminal
- Both services will stop automatically

**If running separately:**
- Press `Ctrl+C` in each terminal window

---

## 📚 Additional Resources

- **API Documentation**: http://localhost:8000/docs (when backend is running)
- **Employee Faces**: `data/employee_faces/` directory
- **Backend Code**: `backend/backend.py` (all in one file)

---

## ✅ Verification Checklist

Before running, ensure:
- [ ] Python 3.8+ installed
- [ ] Node.js 16+ installed
- [ ] Dependencies installed (`pip install -r requirements.txt`)
- [ ] Frontend dependencies installed (`cd frontend && npm install`)
- [ ] Camera connected and accessible
- [ ] Ports 8000 and 5173 available
- [ ] Employee faces in `data/employee_faces/` directory

---

**Ready to run?** Just execute: `python start_system.py` 🚀


