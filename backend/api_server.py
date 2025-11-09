from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import uvicorn
import os

# ----------------------------------------------------------------------------
# FastAPI initialisation and CORS
# ----------------------------------------------------------------------------
app = FastAPI(title="CCTV Attendance API", version="0.1.0")

origins_env = os.getenv("CORS_ORIGINS", "*,http://localhost:5173,http://localhost:8081,http://localhost:8082").split(",")
origins = [o.strip() for o in origins_env if o.strip()]
allow_credentials = True
if any(o == "*" for o in origins):
    # FastAPI CORS does not allow '*' with allow_credentials=True
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Explicit OPTIONS handler to satisfy strict browsers/proxies
from fastapi.responses import JSONResponse
@app.options("/{rest_of_path:path}")
async def preflight_handler():
    return JSONResponse(status_code=204, content=None)

# ----------------------------------------------------------------------------
# Schema models
# ----------------------------------------------------------------------------
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class Employee(BaseModel):
    id: str
    name: str

class AttendanceRecord(BaseModel):
    employee_id: str
    name: str
    timestamp: str  # ISO 8601 string for simplicity; consider datetime

# ----------------------------------------------------------------------------
# In-memory demo stores (replace with DB later)
# ----------------------------------------------------------------------------
_employees: Dict[str, Employee] = {}
_attendance: List[AttendanceRecord] = []

# ----------------------------------------------------------------------------
# Auth endpoints (placeholder; integrate JWT & DB later)
# ----------------------------------------------------------------------------
@app.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    # Demo auth: accept any non-empty credentials; grant admin for username 'admin'
    if not credentials.username or not credentials.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password required")
    role = "administrator" if credentials.username.lower() == "admin" else "employee"
    return LoginResponse(access_token="dummy", role=role)

# ----------------------------------------------------------------------------
# Employee CRUD (simplified)
# ----------------------------------------------------------------------------
@app.get("/employees", response_model=List[Employee])
async def list_employees():
    return list(_employees.values())

@app.post("/employees", response_model=Employee, status_code=status.HTTP_201_CREATED)
async def create_employee(emp: Employee):
    if emp.id in _employees:
        raise HTTPException(status_code=400, detail="Employee already exists")
    _employees[emp.id] = emp
    return emp

@app.get("/employees/{emp_id}", response_model=Employee)
async def get_employee(emp_id: str):
    if emp_id not in _employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _employees[emp_id]

# ----------------------------------------------------------------------------
# Attendance endpoints (placeholder)
# ----------------------------------------------------------------------------

from fastapi.responses import StreamingResponse
import cv2, time
from .body_detector import BodyDetector
from .face_recognizer import FaceRecognizer


# ----------------------------------------------------------------------------
# Live video stream (MJPEG) with overlays
# ----------------------------------------------------------------------------

def _open_video_capture():
    """Robust camera/source opener for Linux/Windows/RTSP/USB.

    Respects env CAMERA_SOURCE (path/rtsp url) or CAMERA_INDEX (int). Falls back
    to probing indices 0..5. Uses V4L2 on Linux for better reliability.
    """
    source_env = os.getenv("CAMERA_SOURCE")
    if source_env:
        # Try string source (file path or RTSP/HTTP URL)
        cap = cv2.VideoCapture(source_env, cv2.CAP_FFMPEG)
        if cap.isOpened():
            return cap, f"source={source_env}"
    # Fallback to numeric index
    try:
        base_index = int(os.getenv("CAMERA_INDEX", "0"))
    except ValueError:
        base_index = 0
    
    # Try different backends for Linux
    backends = [cv2.CAP_V4L2, cv2.CAP_GSTREAMER, None]  # V4L2 for Linux, then GStreamer, then default
    
    for backend in backends:
        if backend is not None:
            cap = cv2.VideoCapture(base_index, backend)
            if cap.isOpened():
                backend_name = "CAP_V4L2" if backend == cv2.CAP_V4L2 else "CAP_GSTREAMER"
                return cap, f"index={base_index} ({backend_name})"
            cap.release()
        else:
            # Try without backend flag
            cap = cv2.VideoCapture(base_index)
            if cap.isOpened():
                return cap, f"index={base_index} (default)"
            cap.release()
    
    # Probe a few indices with different backends
    for idx in range(0, 6):
        for backend in backends:
            if backend is not None:
                cap = cv2.VideoCapture(idx, backend)
                if cap.isOpened():
                    backend_name = "CAP_V4L2" if backend == cv2.CAP_V4L2 else "CAP_GSTREAMER"
                    return cap, f"index={idx} ({backend_name})"
                cap.release()
            else:
                cap = cv2.VideoCapture(idx)
                if cap.isOpened():
                    return cap, f"index={idx} (default)"
                cap.release()
    
    # Final fallback failed
    raise RuntimeError("Could not open any camera. Permission denied or camera in use. Try: sudo usermod -a -G video $USER")


def generate_mjpeg(conf_threshold: float = 0.3):
    body_det = BodyDetector()
    # Get the project root directory (parent of backend)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    face_rec = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))

    cap, source_label = _open_video_capture()

    # Optimize for FPS - keep original resolution but optimize other settings
    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)  # Back to original resolution
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)  # Back to original resolution
        cap.set(cv2.CAP_PROP_FPS, 30)  # Set target FPS
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer lag
    except Exception:
        pass
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frame_skip = 0
    detection_interval = 3  # Process detection every 3rd frame for better FPS
    last_body_boxes = []
    last_face_results = []

    while True:
        success, frame = cap.read()
        if not success or frame is None:
            time.sleep(0.01)  # Reduced sleep time
            continue

        frame_skip += 1
        
        # Process detection only every N frames to improve FPS
        if frame_skip % detection_interval == 0:
            # Allow override via env
            env_conf = os.getenv("DETECT_CONF_THRESHOLD")
            eff_conf = float(env_conf) if env_conf is not None else conf_threshold
            last_body_boxes = body_det.detect(frame, eff_conf)
            
            # Only process faces if bodies are detected
            last_face_results = []
            if last_body_boxes:
                for bx in last_body_boxes:
                    x1, y1, x2, y2, _ = bx
                    # Add margin for better face detection
                    margin = 10
                    region = frame[max(0, y1-margin):min(height, y2+margin), 
                                 max(0, x1-margin):min(width, x2+margin)]
                    if region.size == 0:
                        continue
                    locs = face_rec.detect_faces(region)
                    adjusted = [(t+max(0, y1-margin), r+max(0, x1-margin), 
                               b+max(0, y1-margin), l+max(0, x1-margin)) for t, r, b, l in locs]
                    if adjusted:
                        last_face_results.extend(face_rec.recognize_faces(frame, adjusted))
        
        # Draw using last detected results
        frame = body_det.draw_boxes(frame, last_body_boxes)
        frame = face_rec.draw_faces(frame, last_face_results)

        # Record attendance events only when detection occurs (every 3rd frame)
        if frame_skip % detection_interval == 0:
            try:
                from datetime import datetime
                for (_t, _r, _b, _l), name in last_face_results:
                    if name and name != "Unknown":
                        _attendance.insert(0, AttendanceRecord(
                            employee_id=face_rec.known_face_ids.get(name, name),
                            name=name,
                            timestamp=datetime.utcnow().isoformat()
                        ))
                        if len(_attendance) > 1000:
                            del _attendance[1000:]
            except Exception:
                pass

        # Optimize JPEG encoding for speed
        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]  # Reduced quality for speed
        ret, jpeg = cv2.imencode('.jpg', frame, encode_params)
        if not ret:
            continue
        yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')

    cap.release()


@app.get("/video_feed")
async def video_feed():
    return StreamingResponse(generate_mjpeg(), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/health")
async def health():
    return JSONResponse({
        "status": "ok",
        "camera_index": int(os.getenv("CAMERA_INDEX", "0")),
        "conf_threshold": float(os.getenv("DETECT_CONF_THRESHOLD", "0.3")),
        "cors_origins": origins,
    })
@app.get("/attendance", response_model=List[AttendanceRecord])
async def list_attendance():
    return _attendance

@app.post("/attendance", response_model=AttendanceRecord, status_code=status.HTTP_201_CREATED)
async def create_attendance(record: AttendanceRecord):
    _attendance.insert(0, record)
    # keep only recent 1000
    if len(_attendance) > 1000:
        del _attendance[1000:]
    return record

# ----------------------------------------------------------------------------
# Application entrypoint for development
# ----------------------------------------------------------------------------
if __name__ == "__main__":
    reload_flag = os.getenv("UVICORN_RELOAD", "0") in ("1", "true", "True")
    port_str = os.getenv("PORT", "8000")
    try:
        port_val = int(port_str)
    except ValueError:
        port_val = 8000
    uvicorn.run("backend.api_server:app", host="0.0.0.0", port=port_val, reload=reload_flag)

