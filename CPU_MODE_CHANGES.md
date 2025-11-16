# CPU Mode Configuration - Summary of Changes

## Overview
The LexVision system has been configured to run in **CPU-only mode by default**. This makes the system more accessible and eliminates the need for NVIDIA GPU hardware and CUDA drivers.

## Changes Made

### 1. Backend Modifications (backend/backend.py)

#### GPUOptimizer Class
- Added `force_cpu` parameter to `__init__()` method
- Modified `optimize_torch_settings()` to skip GPU optimizations when in CPU mode
- Device selection now respects the `force_cpu` flag

#### BodyDetector Class
- Added `force_cpu` parameter to `__init__()` method
- Model initialization now checks `force_cpu` flag before moving to GPU
- Detection method updated to explicitly use CPU device when forced

#### Main Functions
- `generate_mjpeg()`: Reads `FORCE_CPU` environment variable (defaults to "1")
- `process_video()`: Reads `FORCE_CPU` environment variable (defaults to "1")
- `main()`: Reads `FORCE_CPU` environment variable and displays appropriate startup message

### 2. Requirements Update (requirements.txt)
- Changed from GPU-specific PyTorch (>=2.7.1) to generic PyTorch (>=2.0.0)
- Added comments explaining CPU-only mode
- Included instructions for enabling GPU support if needed

### 3. New Configuration File (.env.example)
Created a comprehensive environment configuration template with:
- `FORCE_CPU=1` as the default setting
- Documentation for all available environment variables
- Clear comments explaining each option

### 4. README Updates (README.md)
- Updated Features section to highlight CPU mode as default
- Removed GPU as a prerequisite
- Added detailed "CPU vs GPU Mode" section in Environment Variables
- Updated troubleshooting section with CPU-specific guidance
- Modified startup script descriptions to reflect CPU mode

## How to Use

### Running in CPU Mode (Default)
1. Install dependencies: `pip install -r requirements.txt`
2. Run the system: `python start_system.py` or `start_system.bat`
3. The system will automatically use CPU mode

### Switching to GPU Mode (Optional)
1. Install GPU-enabled PyTorch:
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   ```
2. Create a `.env` file:
   ```bash
   cp .env.example .env
   ```
3. Edit `.env` and set:
   ```
   FORCE_CPU=0
   ```
4. Run the system normally

## Performance Expectations

### CPU Mode
- **FPS**: 5-15 frames per second (depends on CPU)
- **Memory**: ~2GB RAM
- **Hardware**: Works on any modern CPU
- **Best for**: Testing, development, low-traffic scenarios

### GPU Mode
- **FPS**: 30+ frames per second
- **Memory**: ~8GB GPU RAM
- **Hardware**: NVIDIA GPU with CUDA support
- **Best for**: Production, high-traffic scenarios, multiple cameras

## Environment Variable Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `FORCE_CPU` | `1` | Force CPU mode (1=enabled, 0=use GPU if available) |
| `PORT` | `8000` | Backend server port |
| `CAMERA_INDEX` | `0` | Camera device index |
| `CAMERA_SOURCE` | - | RTSP URL or video file path (overrides CAMERA_INDEX) |
| `DETECT_CONF_THRESHOLD` | `0.3` | Detection confidence threshold (0.0-1.0) |
| `CORS_ORIGINS` | `*` | Comma-separated list of allowed CORS origins |
| `UVICORN_RELOAD` | `0` | Enable auto-reload for development |

## Technical Details

### Code Flow for CPU/GPU Selection
1. Environment variable `FORCE_CPU` is read at startup
2. If `FORCE_CPU=1` (or "true"/"yes"), system forces CPU mode
3. If `FORCE_CPU=0` (or "false"/"no"), system checks for CUDA availability
4. Device is set accordingly: `torch.device('cpu')` or `torch.device('cuda')`
5. All model operations respect the selected device

### Files Modified
- `backend/backend.py` - Core backend logic (9 locations modified)
- `requirements.txt` - Dependency specifications
- `README.md` - Documentation updates
- `.env.example` - New configuration template (created)

## Benefits of CPU Mode

1. **Universal Compatibility**: Works on Windows, Mac, Linux without special hardware
2. **Simpler Installation**: No CUDA drivers or GPU-specific libraries needed
3. **Lower Cost**: No expensive GPU hardware required
4. **Easier Debugging**: More predictable behavior without GPU complexities
5. **Energy Efficient**: Lower power consumption for small deployments

## Migration Guide

If you were previously using GPU mode and want to switch to CPU mode:

1. **No code changes needed** - just set environment variable
2. **Reinstall PyTorch** (optional, to remove GPU version):
   ```bash
   pip uninstall torch torchvision
   pip install -r requirements.txt
   ```
3. **Set FORCE_CPU=1** in your environment or `.env` file
4. **Restart the system**

## Testing

To verify CPU mode is active, check the console output when starting the backend:
- You should see: `💻 Running in CPU mode (GPU disabled)`
- You should see: `Using device: cpu`
- You should see: `Model will run on CPU`

If you see GPU-related messages, check that `FORCE_CPU=1` is properly set.
