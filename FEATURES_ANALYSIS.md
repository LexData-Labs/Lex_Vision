# 🎯 LexVision - Feature Analysis

## Project Overview
**LexVision** is a real-time CCTV monitoring system with automatic body detection and face recognition for employee attendance tracking. It combines computer vision, web technologies, and modern UI/UX to provide a comprehensive attendance management solution.

---

## 🎥 Core Features

### 1. **Real-Time Body Detection**
- **Technology**: YOLOv8 (You Only Look Once) neural network
- **Capability**: Detects persons in real-time video streams
- **Performance**: 
  - CPU Mode: ~5-15 FPS (default, works on any system)
  - GPU Mode: ~30+ FPS (optional, requires NVIDIA GPU)
- **Visualization**: Blue bounding boxes around detected persons
- **Configurable**: Confidence threshold adjustable via environment variables

### 2. **Face Recognition System**
- **Technology**: `face_recognition` library (dlib-based)
- **Capability**: Automatic employee identification from face images
- **Features**:
  - Loads employee faces from `data/employee_faces/` directory
  - Supports multiple image formats (PNG, JPG, JPEG)
  - Automatic face encoding and matching
  - Fallback to Haar Cascade if face_recognition fails
- **Visualization**: Green bounding boxes with employee name and ID
- **Employee Management**: 
  - Auto-loads employees from filenames (format: `ID_Name.jpg`)
  - Supports employee ID mapping from separate files
  - Currently loaded: 25+ employees

### 3. **Live Video Streaming**
- **Protocol**: MJPEG (Motion JPEG) stream
- **Endpoint**: `/video_feed`
- **Features**:
  - Real-time video with detection overlays
  - Automatic camera detection and fallback
  - Supports webcam, RTSP streams, and video files
  - Frame skipping for performance optimization
  - Automatic camera reconnection on failure
- **Resolution**: Configurable (default: 1280x720)
- **FPS Display**: Real-time FPS counter overlay

### 4. **Attendance Logging**
- **Automatic Recording**: Logs detected faces and bodies automatically
- **Timezone Support**: Bangladesh timezone (Asia/Dhaka, UTC+6)
- **Data Storage**: In-memory storage (up to 1000 records)
- **Record Format**:
  - Employee ID
  - Employee Name
  - Timestamp (ISO format)
- **API Endpoints**:
  - `GET /attendance` - List all attendance records
  - `POST /attendance` - Manually create attendance record

---

## 🌐 Web Application Features

### Frontend Technology Stack
- **Framework**: React 18.3.1 with TypeScript
- **UI Library**: shadcn/ui (Radix UI components)
- **Styling**: Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6
- **Client-Side AI**: TensorFlow.js for client-side face detection
- **Build Tool**: Vite

### 5. **Role-Based Access Control**
- **Two User Roles**:
  - **Administrator**: Full system access
  - **Employee**: Limited access to personal dashboard
- **Authentication**: Simple token-based auth (dummy tokens)
- **Protected Routes**: Role-based route protection
- **Default Credentials**:
  - Admin: `admin` / `any`
  - Employee: `any` / `any`

### 6. **Admin Dashboard**
- **Pages**:
  - **Dashboard**: Overview and statistics
  - **Face Recognition**: Manage employee faces and recognition
  - **Logs**: View attendance logs and system logs
  - **Alerts**: System alerts and notifications
  - **Users**: User management interface
  - **Settings**: System configuration

### 7. **Employee Dashboard**
- **Limited Access**: Personal dashboard view
- **Features**: View personal attendance records

### 8. **Employee Management**
- **CRUD Operations**:
  - `GET /employees` - List all employees
  - `POST /employees` - Create new employee
  - `POST /employees/upload` - Upload employee with face image
  - `GET /employees/{id}` - Get specific employee
  - `POST /employees/reload` - Reload employees from filesystem
- **Image Upload**: Automatic face image processing and storage
- **Auto-Discovery**: Automatically loads employees from face images

---

## 🔧 Technical Features

### 9. **GPU Optimization (Optional)**
- **GPU Optimizer Class**: Dedicated GPU management
- **Features**:
  - CUDA optimization settings
  - Mixed precision training support
  - GPU memory pre-allocation
  - GPU monitoring and status reporting
  - Automatic memory cache clearing
- **Monitoring**: Real-time GPU utilization, temperature, memory usage
- **Device Support**: Optimized for RTX 4060 (configurable)

### 10. **CPU Mode (Default)**
- **Purpose**: Works on any system without GPU
- **Benefits**:
  - Lower memory requirements (~2GB RAM)
  - No CUDA/GPU drivers needed
  - Universal compatibility
- **Performance**: Slower but functional (~5-15 FPS)

### 11. **Camera Management**
- **Multi-Source Support**:
  - Webcam (default index 0)
  - RTSP streams
  - Video files
  - Custom camera sources
- **Auto-Detection**: Automatically tries multiple camera indices
- **Backend Selection**: Platform-specific camera backends
  - Windows: DirectShow preferred
  - Linux: V4L2, GStreamer
- **Error Handling**: Automatic reconnection on camera failure

### 12. **REST API**
- **Framework**: FastAPI
- **Documentation**: Interactive Swagger UI at `/docs`
- **Endpoints**:
  - Authentication: `/login`
  - Employees: `/employees/*`
  - Attendance: `/attendance`
  - Video: `/video_feed`
  - Health: `/health`
  - Frame Processing: `/process_frame`
- **CORS**: Configurable CORS origins
- **Response Format**: JSON with proper status codes

### 13. **Frame Processing API**
- **Endpoint**: `POST /process_frame`
- **Purpose**: Process single frames from client devices
- **Input**: JPEG image upload
- **Output**: Detection results with bounding boxes and face recognition
- **Use Case**: Mobile/remote device integration

---

## 🎨 UI/UX Features

### 14. **Modern Web Interface**
- **Design System**: shadcn/ui components
- **Components Available**:
  - Accordion, Alert, Avatar, Badge, Button
  - Calendar, Card, Chart, Dialog, Dropdown
  - Form, Input, Label, Progress, Select
  - Table, Tabs, Toast, Tooltip, and more
- **Responsive Design**: Mobile-friendly layout
- **Theme Support**: Dark/light mode (via next-themes)

### 15. **Video Feed Components**
- **BackendVideoFeed**: Server-side camera stream
- **ClientCameraStream**: Client-side camera access
- **LiveVideoFeed**: Combined live feed viewer
- **DetectionLogs**: Real-time detection logging

### 16. **Layout Components**
- **AppSidebar**: Navigation sidebar
- **TopBar**: Top navigation bar
- **DashboardLayout**: Main dashboard layout wrapper

---

## ⚙️ Configuration & Environment

### 17. **Environment Variables**
- `FORCE_CPU`: Force CPU-only mode (default: 1)
- `PORT`: Backend server port (default: 8000)
- `CAMERA_INDEX`: Camera device index (default: 0)
- `CAMERA_SOURCE`: Camera source (file path or RTSP URL)
- `DETECT_CONF_THRESHOLD`: Detection confidence (default: 0.3)
- `CORS_ORIGINS`: CORS allowed origins
- `UVICORN_RELOAD`: Enable auto-reload (default: 0)

### 18. **Startup Scripts**
- **Windows**: `start_system.bat` - One-click startup
- **Cross-Platform**: `start_system.py` - Python startup script
- **Features**:
  - Automatic dependency checking
  - Backend and frontend startup
  - Health checks
  - Browser auto-open
  - Graceful shutdown

---

## 📊 Data Management

### 19. **Employee Data Structure**
- **Storage**: `data/employee_faces/` directory
- **File Naming**: `{ID}_{Name}.jpg` format
- **Supported Formats**: PNG, JPG, JPEG
- **Employee IDs**: Loaded from filenames or separate text files
- **Current Count**: 25+ employees loaded

### 20. **Attendance Records**
- **Storage**: In-memory (up to 1000 records)
- **Fields**:
  - `employee_id`: Employee identifier
  - `name`: Employee name
  - `timestamp`: ISO format timestamp (Bangladesh timezone)
- **Auto-Logging**: Both recognized and unknown faces logged

---

## 🔍 Advanced Features

### 21. **Video Processing**
- **CLI Function**: `process_video()` for batch processing
- **Features**:
  - Video file processing
  - Output video generation
  - Real-time display option
  - FPS tracking
  - GPU memory monitoring
  - Timestamp overlay

### 22. **Face Detection Algorithms**
- **Primary**: `face_recognition` library (dlib)
- **Fallback**: OpenCV Haar Cascade
- **Face Encoding**: 128-dimensional face encodings
- **Matching**: Distance-based face matching

### 23. **Body Detection Optimization**
- **Frame Skipping**: Process every Nth frame for performance
- **Detection Interval**: Configurable detection frequency
- **Region of Interest**: Face detection only in body regions
- **IoU Calculation**: Intersection over Union for box filtering

### 24. **Timezone Handling**
- **Primary Timezone**: Bangladesh (Asia/Dhaka, UTC+6)
- **Fallback Support**: 
  - Python 3.9+: `zoneinfo`
  - Older Python: `pytz` or manual offset
- **Display Format**: `YYYY-MM-DD HH:MM:SS`
- **ISO Format**: For API responses

---

## 🚀 Performance Features

### 25. **Optimization Strategies**
- **Frame Skipping**: Reduces processing load
- **Detection Intervals**: Configurable detection frequency
- **Memory Management**: Automatic cleanup and limits
- **GPU Memory Pre-allocation**: Faster inference
- **CUDA Optimizations**: cuDNN benchmark mode

### 26. **Error Handling**
- **Camera Failures**: Automatic reconnection attempts
- **Model Loading**: Fallback to download if local file missing
- **Frame Processing**: Graceful error handling with error frames
- **API Errors**: Proper HTTP status codes and error messages

---

## 📱 Integration Features

### 27. **Client-Side Processing**
- **TensorFlow.js**: Client-side face detection
- **WebGL Backend**: GPU acceleration in browser
- **BlazeFace Model**: Lightweight face detection
- **Face Landmarks**: Advanced face feature detection

### 28. **API Integration**
- **React Query**: Efficient API data fetching
- **Automatic Refetching**: Real-time data updates
- **Error Handling**: Comprehensive error management
- **Loading States**: User-friendly loading indicators

---

## 🔐 Security Features

### 29. **CORS Configuration**
- **Configurable Origins**: Environment-based CORS settings
- **Credential Support**: Conditional credential handling
- **Wildcard Support**: Development mode support

### 30. **Authentication**
- **Token-Based**: Simple token authentication
- **Role Validation**: Server-side role checking
- **Protected Routes**: Client and server-side protection

---

## 📈 Monitoring & Logging

### 31. **System Health**
- **Health Endpoint**: `/health` for system status
- **GPU Monitoring**: Real-time GPU statistics
- **Camera Status**: Camera connection status
- **Configuration Display**: Current system settings

### 32. **Detection Logging**
- **Real-Time Logs**: Live detection events
- **Attendance Tracking**: Automatic attendance logging
- **Unknown Detection**: Logs unknown faces/bodies
- **Timestamp Tracking**: Precise time logging

---

## 🎯 Use Cases

1. **Employee Attendance Tracking**: Automatic check-in/check-out
2. **Security Monitoring**: Real-time person detection
3. **Access Control**: Face-based access verification
4. **Time Tracking**: Automated time logging
5. **Visitor Management**: Unknown person detection
6. **Remote Monitoring**: Web-based CCTV viewing

---

## 📦 Dependencies Summary

### Backend
- **Computer Vision**: ultralytics (YOLOv8), face_recognition, opencv-python
- **Web Framework**: FastAPI, uvicorn
- **Deep Learning**: PyTorch, torchvision
- **Utilities**: numpy, pillow, matplotlib

### Frontend
- **Core**: React, TypeScript, Vite
- **UI**: shadcn/ui, Tailwind CSS, Radix UI
- **AI**: TensorFlow.js, BlazeFace
- **Data**: React Query, date-fns
- **Charts**: Recharts

---

## 🎉 Summary

**LexVision** is a comprehensive CCTV-based attendance system with:
- ✅ Real-time body and face detection
- ✅ Modern web interface
- ✅ Role-based access control
- ✅ Automatic attendance logging
- ✅ GPU/CPU flexibility
- ✅ RESTful API
- ✅ Employee management
- ✅ Multi-camera support
- ✅ Timezone handling
- ✅ Production-ready architecture

The system is designed to work out-of-the-box in CPU mode while providing optional GPU acceleration for enhanced performance.

