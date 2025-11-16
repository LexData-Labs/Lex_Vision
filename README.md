# 🎯 LexVision - CCTV Body and Face Detection System

A real-time CCTV monitoring system with automatic body detection and face recognition for employee attendance tracking.

## ✨ Features

- 🎥 **Real-time Body Detection** - YOLOv8-based person detection
- 👤 **Face Recognition** - Automatic employee identification
- 💻 **CPU Mode by Default** - Works on any system without GPU
- 🚀 **Optional GPU Acceleration** - Can be enabled for faster processing
- 🌐 **Modern Web UI** - React + TypeScript with shadcn/ui
- 📡 **REST API** - FastAPI with interactive documentation
- 📹 **Live Video Streaming** - MJPEG stream with real-time overlays
- 📊 **Attendance Logging** - Automatic attendance recording
- 🔐 **Role-based Access** - Admin and Employee dashboards

## Prerequisites

- Python 3.8 or higher
- Node.js 16+ and npm (for frontend)
- Webcam or CCTV camera

**Note**: This system now runs in **CPU-only mode by default**. GPU support is optional and can be enabled if needed.

## Installation

### 1. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 2. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 3. Prepare Employee Data

- Place employee face images in the `data/employee_faces/` directory
- Images should be named with employee ID or name (e.g., `800001_John_Doe.jpg`)

## How to Run

### Option 1: Run Everything Automatically (Recommended)

**Windows:**
```bash
start_system.bat
```

**Linux/Mac:**
```bash
python start_system.py
```

This will:
- ✅ Check system status
- ✅ Start backend server in CPU mode (port 8000)
- ✅ Start frontend server (port 5173)
- ✅ Open browser automatically

### Option 2: Run Backend Only

```bash
python backend/backend.py
```

Backend will be available at:
- API Server: http://localhost:8000
- API Documentation: http://localhost:8000/docs
- Video Feed: http://localhost:8000/video_feed

### Option 3: Run Frontend Only

```bash
cd frontend
npm run dev
```

Frontend will be available at: http://localhost:5173

### Option 4: Run Manually (Separate Terminals)

**Terminal 1 - Backend:**
```bash
python backend/backend.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

## Access Points

Once running, access the system at:

- **Frontend Web UI**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Video Feed Stream**: http://localhost:8000/video_feed

## Default Login

- **Admin**: username: `admin`, password: `any`
- **Employee**: username: `any`, password: `any`

## Environment Variables

You can configure the system using environment variables. Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Available variables:

- `FORCE_CPU`: Force CPU-only mode (default: 1 = enabled, 0 = use GPU if available)
- `PORT`: Backend server port (default: 8000)
- `CAMERA_INDEX`: Camera device index (default: 0)
- `CAMERA_SOURCE`: Camera source (file path or RTSP URL)
- `DETECT_CONF_THRESHOLD`: Detection confidence threshold (default: 0.3)
- `CORS_ORIGINS`: CORS allowed origins (comma-separated)
- `UVICORN_RELOAD`: Enable auto-reload (default: 0)

### CPU vs GPU Mode

**CPU Mode (Default - Recommended for most users)**:
- Set `FORCE_CPU=1` in your `.env` file
- Lower memory requirements (~2GB RAM)
- No CUDA/GPU drivers needed
- Slower inference speed (~5-15 FPS)
- Works on all systems

**GPU Mode (Optional - For advanced users with NVIDIA GPUs)**:
- Set `FORCE_CPU=0` in your `.env` file
- Requires NVIDIA GPU with CUDA support
- Install GPU-enabled PyTorch: `pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118`
- Higher memory requirements (~8GB GPU RAM)
- Faster inference speed (~30+ FPS)
- Requires CUDA drivers installed

## Project Structure

```
Lex_Vision/
├── backend/
│   └── backend.py          # All backend code (merged)
├── frontend/               # React frontend application
├── data/
│   └── employee_faces/    # Employee face images
├── start_system.py         # Python startup script
├── start_system.bat        # Windows startup script
└── requirements.txt        # Python dependencies
```

## Troubleshooting

1. **Camera not detected**: Check camera permissions and try different `CAMERA_INDEX` values (0, 1, 2...)
2. **Slow performance**: This is normal in CPU mode. For faster processing, enable GPU mode (see Environment Variables)
3. **Out of memory errors**: Reduce `DETECT_CONF_THRESHOLD` or close other applications
4. **Port already in use**: Change `PORT` environment variable or stop other services
5. **Frontend not connecting**: Ensure backend is running on port 8000
6. **Face recognition not working**: Ensure employee face images are in `data/employee_faces/` directory

## Stop the System

Press `Ctrl+C` in the terminal where you started the system.
