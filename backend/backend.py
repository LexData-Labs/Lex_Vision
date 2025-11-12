#!/usr/bin/env python3
"""
Lex Vision - CCTV Body and Face Detection System
Merged Backend - All functionality in one file for easy deployment
"""

# ============================================================================
# IMPORTS
# ============================================================================
import os
import cv2
import time
import argparse
import numpy as np
import torch
from typing import List, Dict, Any
from datetime import datetime
# Timezone support for Bangladesh time
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Fallback for Python < 3.9
    try:
        from backports.zoneinfo import ZoneInfo
    except ImportError:
        # Final fallback - use pytz if available
        try:
            import pytz
            ZoneInfo = None  # Will use pytz instead
        except ImportError:
            ZoneInfo = None
            pytz = None

# FastAPI and web server
from fastapi import FastAPI, HTTPException, status, File, UploadFile
from fastapi import Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn
import io

# Computer Vision
from ultralytics import YOLO
import face_recognition
from PIL import Image

# Multi-threading for multiple cameras
import threading
from collections import defaultdict
from queue import Queue

# GPU monitoring (optional)
try:
    import GPUtil
except ImportError:
    GPUtil = None
try:
    import psutil
except ImportError:
    psutil = None

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_bangladesh_time():
    """Get current time in Bangladesh timezone (Asia/Dhaka, UTC+6)"""
    try:
        if ZoneInfo is not None:
            # Use zoneinfo (Python 3.9+)
            return datetime.now(ZoneInfo("Asia/Dhaka"))
    except Exception:
        pass  # Silently fall through to pytz

    try:
        if pytz is not None:
            # Use pytz as fallback
            bd_tz = pytz.timezone("Asia/Dhaka")
            return datetime.now(bd_tz)
    except Exception:
        pass  # Silently fall through to manual UTC+6

    # Fallback: manually add 6 hours to UTC (not ideal but works)
    from datetime import timedelta, timezone as tz
    utc_now = datetime.now(tz.utc)
    bd_offset = tz(timedelta(hours=6))
    return utc_now.astimezone(bd_offset)

def get_bangladesh_timestamp():
    """Get current timestamp in Bangladesh timezone as ISO format string"""
    return get_bangladesh_time().isoformat()

def get_bangladesh_timestamp_display():
    """Get current timestamp in Bangladesh timezone as formatted string for display"""
    bd_time = get_bangladesh_time()
    return bd_time.strftime("%Y-%m-%d %H:%M:%S")

def draw_fps(frame, fps):
    """Draw FPS counter on the frame"""
    if fps > 0:
        fps_text = f"FPS: {fps:.1f}"
        cv2.putText(frame, fps_text, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    return frame

def resize_image(image, target_width=None, target_height=None, keep_aspect=True):
    """Resize image while optionally maintaining aspect ratio"""
    if target_width is None and target_height is None:
        return image
    
    h, w = image.shape[:2]
    
    if keep_aspect:
        if target_width is not None and target_height is not None:
            scale = min(target_width / w, target_height / h)
            new_width = int(w * scale)
            new_height = int(h * scale)
        elif target_width is not None:
            scale = target_width / w
            new_width = target_width
            new_height = int(h * scale)
        else:
            scale = target_height / h
            new_width = int(w * scale)
            new_height = target_height
    else:
        new_width = target_width if target_width else w
        new_height = target_height if target_height else h
    
    return cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LINEAR)

def get_video_properties(video_path):
    """Get video properties (width, height, fps, frame count)"""
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return None
    
    properties = {
        'width': int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)),
        'height': int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)),
        'fps': cap.get(cv2.CAP_PROP_FPS),
        'frame_count': int(cap.get(cv2.CAP_PROP_FRAME_COUNT)),
        'fourcc': cap.get(cv2.CAP_PROP_FOURCC)
    }
    
    cap.release()
    return properties

def create_video_writer(output_path, width, height, fps, fourcc=None):
    """Create a video writer for saving output video"""
    if fourcc is None:
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    return writer

def add_timestamp(frame, timestamp=None):
    """Add timestamp to the frame (uses Bangladesh time by default)"""
    if timestamp is None:
        timestamp = get_bangladesh_timestamp_display()
    
    h, w = frame.shape[:2]
    cv2.putText(frame, timestamp, (10, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return frame

def calculate_iou(box1, box2):
    """Calculate Intersection over Union (IoU) between two bounding boxes"""
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)
    
    if x2_i <= x1_i or y2_i <= y1_i:
        return 0.0
    
    intersection = (x2_i - x1_i) * (y2_i - y1_i)
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union = area1 + area2 - intersection
    
    return intersection / union if union > 0 else 0.0

# ============================================================================
# GPU OPTIMIZER CLASS
# ============================================================================

class GPUOptimizer:
    """GPU optimization and monitoring for RTX 4060"""

    def __init__(self, force_cpu=False):
        # Force CPU mode if requested
        if force_cpu:
            self.device = torch.device('cpu')
        else:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.optimization_settings = {
            'cudnn_benchmark': True,
            'cudnn_deterministic': False,
            'cuda_memory_fraction': 0.95,
            'mixed_precision': True,
            'max_memory_allocated': 7.5,
        }
        
    def optimize_torch_settings(self):
        """Apply PyTorch CUDA optimizations"""
        if self.device.type == 'cpu':
            print("💻 Running in CPU mode (GPU disabled)")
            return

        if torch.cuda.is_available():
            print("🔧 Applying PyTorch CUDA optimizations...")
            torch.backends.cudnn.benchmark = self.optimization_settings['cudnn_benchmark']
            torch.backends.cudnn.deterministic = self.optimization_settings['cudnn_deterministic']
            torch.cuda.set_per_process_memory_fraction(self.optimization_settings['cuda_memory_fraction'])

            if self.optimization_settings['mixed_precision']:
                try:
                    from torch.cuda.amp import autocast
                    print("✅ Mixed precision enabled")
                except ImportError:
                    print("⚠️  Mixed precision not available")

            print("✅ PyTorch optimizations applied")
            self.pre_allocate_gpu_memory()
        else:
            print("⚠️  CUDA not available, skipping GPU optimizations")
    
    def get_gpu_info(self) -> Dict[str, Any]:
        """Get comprehensive GPU information"""
        gpu_info = {}
        
        if torch.cuda.is_available():
            gpu_info['device_name'] = torch.cuda.get_device_name()
            gpu_info['cuda_version'] = torch.version.cuda
            gpu_info['total_memory'] = torch.cuda.get_device_properties(0).total_memory / 1024**3
            gpu_info['memory_allocated'] = torch.cuda.memory_allocated(0) / 1024**3
            gpu_info['memory_reserved'] = torch.cuda.memory_reserved(0) / 1024**3
            gpu_info['memory_free'] = gpu_info['total_memory'] - gpu_info['memory_allocated']
            
            if GPUtil:
                try:
                    gpus = GPUtil.getGPUs()
                    if gpus:
                        gpu_info['gpu_utilization'] = gpus[0].load * 100
                        gpu_info['gpu_temperature'] = gpus[0].temperature
                        gpu_info['gpu_memory_used'] = gpus[0].memoryUsed
                        gpu_info['gpu_memory_total'] = gpus[0].memoryTotal
                except:
                    pass
            
            if 'gpu_utilization' not in gpu_info:
                gpu_info['gpu_utilization'] = 'N/A'
                gpu_info['gpu_temperature'] = 'N/A'
        
        return gpu_info
    
    def print_gpu_status(self):
        """Print current GPU status"""
        gpu_info = self.get_gpu_info()
        
        if gpu_info:
            print("\n🖥️  GPU Status:")
            print(f"   Device: {gpu_info['device_name']}")
            print(f"   CUDA Version: {gpu_info['cuda_version']}")
            print(f"   Total Memory: {gpu_info['total_memory']:.1f} GB")
            print(f"   Memory Used: {gpu_info['memory_allocated']:.1f} GB")
            print(f"   Memory Free: {gpu_info['memory_free']:.1f} GB")
            
            if gpu_info['gpu_utilization'] != 'N/A':
                print(f"   GPU Utilization: {gpu_info['gpu_utilization']:.1f}%")
                print(f"   Temperature: {gpu_info['gpu_temperature']}°C")
        else:
            print("⚠️  No GPU information available")
    
    def pre_allocate_gpu_memory(self):
        """Pre-allocate GPU memory"""
        if torch.cuda.is_available():
            try:
                max_memory_gb = self.optimization_settings['max_memory_allocated']
                max_memory_bytes = int(max_memory_gb * 1024**3)
                tensor_size = max_memory_bytes // 4
                pre_alloc_tensor = torch.zeros(tensor_size, dtype=torch.float32, device=self.device)
                print(f"🚀 Pre-allocated {max_memory_gb:.1f}GB GPU memory")
                self._pre_alloc_tensor = pre_alloc_tensor
            except Exception as e:
                print(f"⚠️  Could not pre-allocate full GPU memory: {e}")
    
    def clear_gpu_cache(self):
        """Clear GPU memory cache"""
        if torch.cuda.is_available():
            if hasattr(self, '_pre_alloc_tensor'):
                del self._pre_alloc_tensor
                self._pre_alloc_tensor = None
            torch.cuda.empty_cache()
            print("🧹 GPU memory cache cleared")
    
    def monitor_gpu_usage(self, duration: int = 60, interval: float = 1.0):
        """Monitor GPU usage for a specified duration"""
        if not torch.cuda.is_available():
            print("⚠️  CUDA not available for monitoring")
            return
        
        print(f"📊 Monitoring GPU usage for {duration} seconds...")
        start_time = time.time()
        
        try:
            while time.time() - start_time < duration:
                gpu_info = self.get_gpu_info()
                print(f"\r🖥️  GPU: {gpu_info.get('gpu_utilization', 'N/A')}% | "
                      f"Memory: {gpu_info['memory_allocated']:.1f}/{gpu_info['total_memory']:.1f} GB | "
                      f"Temp: {gpu_info.get('gpu_temperature', 'N/A')}°C", end="")
                time.sleep(interval)
            print("\n✅ GPU monitoring complete")
        except KeyboardInterrupt:
            print("\n⏹️  GPU monitoring stopped by user")

# ============================================================================
# BODY DETECTOR CLASS
# ============================================================================

class BodyDetector:
    """YOLOv8-based body detection"""

    def __init__(self, model_path=None, force_cpu=False):
        torch.serialization.add_safe_globals([torch.nn.Module])

        if model_path:
            self.model = YOLO(model_path)
        else:
            try:
                self.model = YOLO('yolov8n.pt')
            except Exception as e:
                print(f"Error loading local yolov8n.pt: {e}")
                print("Downloading fresh YOLOv8n model...")
                self.model = YOLO('yolov8n')

        # Force CPU mode if requested
        if force_cpu:
            self.device = torch.device('cpu')
        else:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")

        if torch.cuda.is_available() and not force_cpu:
            self.model.to(self.device)
            print(f"Model moved to GPU: {torch.cuda.get_device_name()}")
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
        else:
            print("Model will run on CPU")

        self.target_classes = [0]  # Person class
    
    def detect(self, frame, conf_threshold=0.5):
        """Detect people in the given frame"""
        if self.device.type == 'cuda' and torch.cuda.is_available():
            if next(self.model.parameters()).device != self.device:
                self.model.to(self.device)
            results = self.model(frame, verbose=False, device=self.device)[0]
        else:
            results = self.model(frame, verbose=False, device='cpu')[0]
        
        boxes = []
        for det in results.boxes:
            cls = int(det.cls.item())
            conf = det.conf.item()
            
            if cls in self.target_classes and conf >= conf_threshold:
                x1, y1, x2, y2 = map(int, det.xyxy[0].tolist())
                boxes.append([x1, y1, x2, y2, conf])
        
        return boxes
    
    def draw_boxes(self, frame, detections, face_recognizer=None):
        """Draw bounding boxes for detected persons"""
        result_frame = frame.copy()
        blue = (255, 0, 0)
        
        for detection in detections:
            x1, y1, x2, y2, conf = detection
            cv2.rectangle(result_frame, (int(x1), int(y1)), (int(x2), int(y2)), blue, 1)
        
        return result_frame
    
    def train(self, data_yaml, epochs=50, batch_size=16, img_size=640):
        """Train the YOLOv8 model on custom dataset"""
        try:
            model = YOLO('yolov8n.pt')
        except Exception as e:
            print(f"Error loading local yolov8n.pt for training: {e}")
            model = YOLO('yolov8n')
        
        results = model.train(
            data=data_yaml,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            device=self.device
        )
        
        self.model = model
        return model

# ============================================================================
# FACE RECOGNIZER CLASS
# ============================================================================

class FaceRecognizer:
    """Face detection and recognition"""
    
    def __init__(self, employee_faces_dir):
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = {}
        self.employee_faces_dir = employee_faces_dir
        
        self.load_employee_faces()
        self.load_employee_ids()
    
    def load_employee_ids(self):
        """Load employee IDs from the employees directory"""
        employees_dir = os.path.join(os.path.dirname(self.employee_faces_dir), 'employees')
        print(f"Loading employee IDs from {employees_dir}")
        
        if not os.path.exists(employees_dir):
            print(f"Warning: Employees directory {employees_dir} does not exist")
            return
        
        for filename in os.listdir(employees_dir):
            if filename.endswith('.txt'):
                file_path = os.path.join(employees_dir, filename)
                try:
                    with open(file_path, 'r') as f:
                        lines = f.readlines()
                        employee_id = None
                        employee_name = None
                        
                        for line in lines:
                            line = line.strip()
                            if line.startswith('ID:'):
                                employee_id = line.split('ID:')[1].strip()
                            elif line.startswith('Name:'):
                                employee_name = line.split('Name:')[1].strip()
                        
                        if employee_id and employee_name:
                            self.known_face_ids[employee_name] = employee_id
                            print(f"Loaded ID for {employee_name}: {employee_id}")
                except Exception as e:
                    print(f"Error loading employee ID from {filename}: {e}")

    def load_employee_faces(self):
        """Load employee faces from the employee_faces directory"""
        print(f"Loading employee faces from {self.employee_faces_dir}")
        
        if not os.path.exists(self.employee_faces_dir):
            print(f"Warning: Employee faces directory {self.employee_faces_dir} does not exist")
            return
        
        employee_files = {}
        for file in os.listdir(self.employee_faces_dir):
            if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            base_name = file.split('.')[0]
            if '-' in base_name:
                base_name = base_name.split('-', 1)[1]
            base_name = base_name.replace('_', ' ').strip()
            
            if base_name not in employee_files:
                employee_files[base_name] = []
            employee_files[base_name].append(file)

        for employee_name, files in employee_files.items():
            face_found = False
            
            for file in files:
                if face_found:
                    break
                    
                img_path = os.path.join(self.employee_faces_dir, file)
                try:
                    image_cv = cv2.imread(img_path)
                    if image_cv is None:
                        continue
                    
                    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
                    face_locations = face_recognition.face_locations(image_rgb)
                    
                    if face_locations:
                        face_encodings = face_recognition.face_encodings(image_rgb, face_locations)
                        if len(face_encodings) > 0:
                            self.known_face_encodings.append(face_encodings[0])
                            self.known_face_names.append(employee_name)
                            print(f"Loaded face for employee: {employee_name} from {file}")
                            face_found = True
                            continue
                    
                    # Try with face cascade
                    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                    
                    if len(faces) > 0:
                        x, y, w, h = faces[0]
                        face_img = image_rgb[y:y+h, x:x+w]
                        try:
                            face_locations = face_recognition.face_locations(face_img)
                            if face_locations:
                                face_encodings = face_recognition.face_encodings(face_img, face_locations)
                                if len(face_encodings) > 0:
                                    self.known_face_encodings.append(face_encodings[0])
                                    self.known_face_names.append(employee_name)
                                    print(f"Loaded face for employee: {employee_name} from {file} (cascade)")
                                    face_found = True
                                    continue
                        except Exception:
                            pass
                            
                except Exception as e:
                    print(f"Error processing {file}: {e}")
            
            if not face_found:
                print(f"Warning: No face found for employee {employee_name} in any image")
        
        print(f"Loaded {len(self.known_face_names)} employee faces")
    
    def detect_faces(self, frame):
        """Detect faces in the given frame"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        face_locations = face_recognition.face_locations(rgb_frame)
        return face_locations
    
    def recognize_faces(self, frame, face_locations=None):
        """Recognize faces in the given frame"""
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        if face_locations is None:
            face_locations = face_recognition.face_locations(rgb_frame)
        
        if not face_locations or not self.known_face_encodings:
            return [(loc, "Unknown") for loc in face_locations]
        
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        results = []
        for face_location, face_encoding in zip(face_locations, face_encodings):
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
            name = "Unknown"
            
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
            
            results.append((face_location, name))
        
        return results
    
    def draw_faces(self, frame, recognition_results):
        """Draw face boxes and names on the frame"""
        result_frame = frame.copy()
        deep_green = (0, 128, 0)
        
        for (top, right, bottom, left), name in recognition_results:
            cv2.rectangle(result_frame, (left, top), (right, bottom), deep_green, 1)
            
            employee_id = self.known_face_ids.get(name, "")
            
            cv2.putText(result_frame, name, (left + 6, bottom - 35), 
                        cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 255), 2)
            
            if employee_id:
                cv2.putText(result_frame, employee_id, (left + 6, bottom - 10), 
                            cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 255), 2)
            
            if hasattr(self, 'detected_faces'):
                self.detected_faces[name] = (top, right, bottom, left)
            else:
                self.detected_faces = {name: (top, right, bottom, left)}
        
        return result_frame

# ============================================================================
# FASTAPI APPLICATION
# ============================================================================

app = FastAPI(title="CCTV Attendance API", version="0.1.0")

# CORS Configuration
origins_env = os.getenv("CORS_ORIGINS", "*,http://localhost:5173,http://localhost:8081,http://localhost:8082").split(",")
origins = [o.strip() for o in origins_env if o.strip()]
allow_credentials = True
if any(o == "*" for o in origins):
    allow_credentials = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{rest_of_path:path}")
async def preflight_handler():
    return JSONResponse(status_code=204, content=None)

# Pydantic Models
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
    timestamp: str
    camera_id: str = None
    entry_type: str = None  # "entry", "exit", or None

class Alert(BaseModel):
    id: str
    title: str
    description: str
    severity: str  # "low", "medium", "high", "critical"
    category: str  # "security", "face_recognition", "camera", "system", "user"
    status: str  # "active", "acknowledged", "resolved"
    timestamp: str
    acknowledgedBy: str = None
    acknowledgedAt: str = None
    location: str = None
    cameraId: str = None

class CameraConfig(BaseModel):
    id: str
    name: str
    role: str  # "entry", "exit", "none"
    status: str  # "online", "offline"

# In-memory stores
_employees: Dict[str, Employee] = {}
_attendance: List[AttendanceRecord] = []
_alerts: List[Alert] = []
_camera_last_seen: Dict[str, str] = {}  # Track camera last activity
_unknown_face_count: Dict[str, int] = {}  # Track unknown faces by time window
_cameras: Dict[str, CameraConfig] = {}  # Camera configurations

# Multi-camera support
_active_camera_streams: Dict[int, bool] = {}  # Track which cameras are streaming
_camera_locks: Dict[int, threading.Lock] = defaultdict(threading.Lock)  # Thread locks per camera

def _load_employees_from_data():
    """
    Populate the in-memory employees list from data/employee_faces filenames.
    Expects files like '800001_First_Last.jpg' or 'First_Last.jpg'.
    """
    try:
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        faces_dir = os.path.join(project_root, 'data', 'employee_faces')
        if not os.path.isdir(faces_dir):
            print(f"Employees load: faces dir not found at {faces_dir}")
            return
        added = 0
        for file in os.listdir(faces_dir):
            if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
            base = os.path.splitext(file)[0]
            # Normalize name from filename
            parts = base.split('_')
            emp_id = None
            name_parts = []
            if parts and parts[0].isdigit():
                emp_id = parts[0]
                name_parts = [p for p in parts[1:] if p]
            else:
                name_parts = [p for p in parts if p]
                # Create a pseudo id from name if not provided
                emp_id = base.replace('_', '').lower()[:16]
            if not name_parts:
                # fallback to base name
                name = base.replace('_', ' ').strip()
            else:
                name = ' '.join(name_parts).strip()
            # Clean stray trailing characters
            name = ' '.join([seg for seg in name.split(' ') if seg])
            # Insert if not present
            if emp_id not in _employees:
                _employees[emp_id] = Employee(id=emp_id, name=name)
                added += 1
        if added:
            print(f"Loaded {added} employees from data/employee_faces")
    except Exception as e:
        print(f"Error loading employees from data: {e}")

# Load employees at startup (module import)
_load_employees_from_data()

# Auth endpoints
@app.post("/login", response_model=LoginResponse)
async def login(credentials: LoginRequest):
    if not credentials.username or not credentials.password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username and password required")
    role = "administrator" if credentials.username.lower() == "admin" else "employee"
    return LoginResponse(access_token="dummy", role=role)

# Employee CRUD
@app.get("/employees", response_model=List[Employee])
async def list_employees():
    return list(_employees.values())

@app.post("/employees", response_model=Employee, status_code=status.HTTP_201_CREATED)
async def create_employee(emp: Employee):
    if emp.id in _employees:
        raise HTTPException(status_code=400, detail="Employee already exists")
    _employees[emp.id] = emp
    return emp

@app.post("/employees/upload", response_model=Employee, status_code=status.HTTP_201_CREATED)
async def upload_employee(
    id: str = Form(...),
    name: str = Form(...),
    image: UploadFile = File(...)
):
    """
    Create/Update an employee and save the uploaded face image to data/employee_faces.
    The image will be stored as {id}_{Name_With_Underscores}.jpg
    """
    try:
        if not id or not name:
            raise HTTPException(status_code=400, detail="Employee id and name are required")
        # Normalize filename
        safe_name = "_".join([seg for seg in name.strip().split(" ") if seg])
        filename = f"{id}_{safe_name}.jpeg"
        # Save file (force JPEG to ensure consistent format)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        faces_dir = os.path.join(project_root, 'data', 'employee_faces')
        os.makedirs(faces_dir, exist_ok=True)
        dest_path = os.path.join(faces_dir, filename)
        content = await image.read()
        if not content:
            raise HTTPException(status_code=400, detail="Empty image")
        try:
            img_bytes = io.BytesIO(content)
            with Image.open(img_bytes) as pil_img:
                rgb = pil_img.convert("RGB")
                rgb.save(dest_path, format="JPEG", quality=90)
        except Exception:
            # Fallback: write raw if PIL fails (still .jpeg name)
            with open(dest_path, "wb") as f:
                f.write(content)
        # Register/Update employee in memory
        employee = Employee(id=id, name=name)
        _employees[id] = employee
        return employee
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.api_route("/employees/reload", methods=["POST", "GET"])
async def reload_employees():
    """
    Re-scan data/employee_faces and (re)build the in-memory employees list.
    """
    try:
        # Rebuild a fresh dictionary from faces
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        faces_dir = os.path.join(project_root, 'data', 'employee_faces')
        if not os.path.isdir(faces_dir):
            raise HTTPException(status_code=404, detail=f"Faces directory not found: {faces_dir}")
        rebuilt: Dict[str, Employee] = {}
        for file in os.listdir(faces_dir):
            if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
            base = os.path.splitext(file)[0]
            parts = base.split('_')
            emp_id = None
            name_parts = []
            if parts and parts[0].isdigit():
                emp_id = parts[0]
                name_parts = [p for p in parts[1:] if p]
            else:
                name_parts = [p for p in parts if p]
                emp_id = base.replace('_', '').lower()[:16]
            name = ' '.join(name_parts).strip() if name_parts else base.replace('_', ' ').strip()
            name = ' '.join([seg for seg in name.split(' ') if seg])
            if emp_id and emp_id not in rebuilt:
                rebuilt[emp_id] = Employee(id=emp_id, name=name)
        # Replace global employees
        _employees.clear()
        _employees.update(rebuilt)
        return {"status": "ok", "count": len(_employees)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/employees/{emp_id}", response_model=Employee)
async def get_employee(emp_id: str):
    if emp_id not in _employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _employees[emp_id]

# Video streaming
def _open_video_capture():
    """Robust camera/source opener"""
    import platform

    source_env = os.getenv("CAMERA_SOURCE")
    if source_env:
        cap = cv2.VideoCapture(source_env, cv2.CAP_FFMPEG)
        if cap.isOpened():
            print(f"✅ Opened camera source: {source_env}")
            return cap, f"source={source_env}"

    try:
        base_index = int(os.getenv("CAMERA_INDEX", "0"))
    except ValueError:
        base_index = 0

    # Use Windows-specific backends on Windows (prefer DirectShow; avoid MSMF on some devices)
    if platform.system() == 'Windows':
        backends = [cv2.CAP_DSHOW, None]
    else:
        backends = [cv2.CAP_V4L2, cv2.CAP_GSTREAMER, None]

    print(f"🔍 Trying to open camera with index {base_index}...")
    for backend in backends:
        try:
            if backend is not None:
                print(f"   Trying backend: {backend}")
                cap = cv2.VideoCapture(base_index, backend)
                if cap.isOpened():
                    # Test if we can read a frame
                    ret, _ = cap.read()
                    if ret:
                        print(f"✅ Camera opened successfully with backend {backend}")
                        return cap, f"index={base_index}"
                cap.release()
            else:
                print(f"   Trying default backend")
                cap = cv2.VideoCapture(base_index)
                if cap.isOpened():
                    ret, _ = cap.read()
                    if ret:
                        print(f"✅ Camera opened successfully with default backend")
                        return cap, f"index={base_index} (default)"
                cap.release()
        except Exception as e:
            print(f"   Error with backend: {e}")
            continue

    print(f"⚠️  Failed to open camera at index {base_index}, trying other indices...")
    for idx in range(0, 6):
        try:
            print(f"🔍 Trying camera index {idx}...")
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    print(f"✅ Camera opened successfully at index {idx}")
                    return cap, f"index={idx}"
            cap.release()
        except Exception as e:
            print(f"   Error at index {idx}: {e}")
            continue

    raise RuntimeError("❌ Could not open any camera. Please check camera permissions and connections.")

def _open_video_capture_by_index(camera_index: int):
    """Open video capture for a specific camera index"""
    import platform

    # Use Windows-specific backends on Windows
    if platform.system() == 'Windows':
        backends = [cv2.CAP_DSHOW, None]
    else:
        backends = [cv2.CAP_V4L2, cv2.CAP_GSTREAMER, None]

    print(f"🔍 Trying to open camera index {camera_index}...")
    for backend in backends:
        try:
            if backend is not None:
                print(f"   Trying backend: {backend}")
                cap = cv2.VideoCapture(camera_index, backend)
            else:
                cap = cv2.VideoCapture(camera_index)

            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    print(f"✅ Camera {camera_index} opened successfully")
                    return cap, f"CAM-{camera_index}"
            cap.release()
        except Exception as e:
            print(f"   Error with camera {camera_index}: {e}")
            continue

    raise RuntimeError(f"❌ Could not open camera {camera_index}")

def generate_mjpeg_for_camera(camera_index: int, conf_threshold: float = 0.3):
    """Generate MJPEG video stream for specific camera with detection overlays"""
    camera_id = f"CAM-{camera_index}"

    try:
        # Use shared global detectors instead of creating new ones
        body_det, face_rec = _get_global_detectors()

        cap, _ = _open_video_capture_by_index(camera_index)

        # Track camera as active
        _update_camera_status(camera_id)
    except Exception as e:
        print(f"❌ Error initializing video stream: {e}")
        # Return error image as MJPEG
        import numpy as np
        error_frame = np.zeros((480, 640, 3), dtype=np.uint8)
        cv2.putText(error_frame, "Camera Error", (150, 200),
                   cv2.FONT_HERSHEY_SIMPLEX, 1.5, (0, 0, 255), 3)
        cv2.putText(error_frame, str(e), (50, 250),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
        cv2.putText(error_frame, "Check camera permissions", (100, 300),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

        while True:
            ret, jpeg = cv2.imencode('.jpg', error_frame)
            if ret:
                yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.1)

    try:
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
        cap.set(cv2.CAP_PROP_FPS, 30)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
    except Exception:
        pass
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    frame_skip = 0
    detection_interval = 3
    last_body_boxes = []
    last_face_results = []
    failure_count = 0
    max_failures_before_reopen = 20

    print(f"🎥 Starting video stream for {camera_id}")

    try:
        while True:
            success, frame = cap.read()
            if not success or frame is None or (hasattr(frame, "size") and frame.size == 0):
                failure_count += 1
                if failure_count >= max_failures_before_reopen:
                    # Attempt to reopen the camera
                    try:
                        cap.release()
                    except Exception:
                        pass
                    try:
                        cap, _ = _open_video_capture_by_index(camera_index)
                        try:
                            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
                            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
                            cap.set(cv2.CAP_PROP_FPS, 30)
                            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
                        except Exception:
                            pass
                    except Exception as e:
                        # If reopen fails, keep trying
                        print(f"⚠️  Failed to reopen camera {camera_index}: {e}")
                        time.sleep(0.1)
                    failure_count = 0
                else:
                    time.sleep(0.01)
                continue
            else:
                # Reset failure counter on a good frame
                failure_count = 0

            frame_skip += 1

            # Update camera status periodically (every 30 frames)
            if frame_skip % 30 == 0:
                _update_camera_status(camera_id)

            if frame_skip % detection_interval == 0:
                env_conf = os.getenv("DETECT_CONF_THRESHOLD")
                eff_conf = float(env_conf) if env_conf is not None else conf_threshold

                # Use lock to prevent concurrent model access from multiple camera streams
                with _detector_lock:
                    last_body_boxes = body_det.detect(frame, eff_conf)

                last_face_results = []
                if last_body_boxes:
                    for bx in last_body_boxes:
                        x1, y1, x2, y2, _ = bx
                        margin = 10
                        region = frame[max(0, y1-margin):min(height, y2+margin),
                                     max(0, x1-margin):min(width, x2+margin)]
                        if region.size == 0:
                            continue

                        # Use lock for face detection/recognition to prevent concurrent access
                        with _detector_lock:
                            locs = face_rec.detect_faces(region)
                            adjusted = [(t+max(0, y1-margin), r+max(0, x1-margin),
                                       b+max(0, y1-margin), l+max(0, x1-margin)) for t, r, b, l in locs]
                            if adjusted:
                                last_face_results.extend(face_rec.recognize_faces(frame, adjusted))

            frame = body_det.draw_boxes(frame, last_body_boxes)
            frame = face_rec.draw_faces(frame, last_face_results)

            if frame_skip % detection_interval == 0:
                try:
                    # Get camera role for entry/exit tracking
                    entry_type = _cameras.get(camera_id).role if camera_id in _cameras else None
                    if entry_type == "none":
                        entry_type = None

                    if last_face_results:
                        for (_t, _r, _b, _l), name in last_face_results:
                            # Log both recognized and unknown faces to attendance
                            emp_id = face_rec.known_face_ids.get(name, name) if name and name != "Unknown" else "Unknown"
                            _attendance.insert(0, AttendanceRecord(
                                employee_id=emp_id,
                                name=name if name else "Unknown",
                                timestamp=get_bangladesh_timestamp(),
                                camera_id=camera_id,
                                entry_type=entry_type
                            ))
                            if len(_attendance) > 1000:
                                del _attendance[1000:]
                    else:
                        # No faces found but bodies detected — log Unknown entries so UI shows activity
                        if last_body_boxes:
                            for _ in last_body_boxes:
                                _attendance.insert(0, AttendanceRecord(
                                    employee_id="Unknown",
                                    name="Unknown",
                                    timestamp=get_bangladesh_timestamp(),
                                    camera_id=camera_id,
                                    entry_type=entry_type
                                ))
                            if len(_attendance) > 1000:
                                del _attendance[1000:]
                except Exception:
                    pass

            encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]
            ret, jpeg = cv2.imencode('.jpg', frame, encode_params)
            if not ret:
                continue
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
    except Exception as e:
        print(f"❌ Stream error for {camera_id}: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print(f"🛑 Stopping video stream for {camera_id}")
        cap.release()

@app.get("/video_feed")
async def video_feed():
    """Legacy endpoint - defaults to camera 0"""
    return StreamingResponse(generate_mjpeg_for_camera(0), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/video_feed/{camera_index}")
async def video_feed_by_camera(camera_index: int):
    """Get video feed from specific camera index"""
    return StreamingResponse(generate_mjpeg_for_camera(camera_index), media_type="multipart/x-mixed-replace; boundary=frame")

@app.get("/health")
async def health():
    # Check camera status while we're at it
    _check_camera_offline()

    return JSONResponse({
        "status": "ok",
        "camera_index": int(os.getenv("CAMERA_INDEX", "0")),
        "conf_threshold": float(os.getenv("DETECT_CONF_THRESHOLD", "0.3")),
        "cors_origins": origins,
    })

# Global detectors for all video streams (to avoid reloading models for each camera)
_global_body_detector = None
_global_face_recognizer = None
_detector_lock = threading.Lock()

def _get_global_detectors():
    """Get or initialize global detectors for frame processing (thread-safe)"""
    global _global_body_detector, _global_face_recognizer

    with _detector_lock:
        if _global_body_detector is None:
            force_cpu = os.getenv("FORCE_CPU", "1").lower() in ("1", "true", "yes")
            _global_body_detector = BodyDetector(force_cpu=force_cpu)
            print("✅ Global BodyDetector initialized")

        if _global_face_recognizer is None:
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            _global_face_recognizer = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))
            print("✅ Global FaceRecognizer initialized")

    return _global_body_detector, _global_face_recognizer

@app.post("/process_frame")
async def process_frame(frame: UploadFile = File(...)):
    """
    Process a single frame from client device camera.
    Receives JPEG image, performs body detection and face recognition,
    returns detection results.
    """
    try:
        # Read the uploaded image
        contents = await frame.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if img is None:
            return JSONResponse(
                status_code=400,
                content={"error": "Invalid image format"}
            )

        # Get global detectors (reuse instead of recreating)
        body_detector, face_recognizer = _get_global_detectors()

        # Update camera status (camera is alive)
        _update_camera_status("CLIENT-CAM")

        # Perform body detection with lock (shared model)
        with _detector_lock:
            body_boxes = body_detector.detect(img)
        print(f"🔍 /process_frame: Detected {len(body_boxes)} bodies")

        # Process each detected body
        results = []
        for i, box in enumerate(body_boxes):
            x1, y1, x2, y2, conf = box
            body_crop = img[int(y1):int(y2), int(x1):int(x2)]

            # Try face recognition on the body crop (with lock for shared model)
            # recognize_faces returns list of tuples: [(face_location, name), ...]
            with _detector_lock:
                face_results = face_recognizer.recognize_faces(body_crop)

            # Get the first recognized face (if any)
            face_name = "Unknown"
            face_confidence = 0.0

            if face_results and len(face_results) > 0:
                # face_results is [(face_location, name), ...]
                _, face_name = face_results[0]
                print(f"👤 /process_frame: Recognized face: {face_name}")
                if face_name != "Unknown":
                    # Calculate confidence based on face distance
                    # We'll use a default confidence for recognized faces
                    face_confidence = 0.85  # Default confidence for recognized faces

            result = {
                "body_id": i,
                "bbox": {
                    "x1": float(x1),
                    "y1": float(y1),
                    "x2": float(x2),
                    "y2": float(y2)
                },
                "confidence": float(conf),
                "face_name": face_name,
                "face_confidence": face_confidence
            }
            results.append(result)

            # Get camera role for entry/exit tracking
            camera_id = "CLIENT-CAM"
            entry_type = _cameras.get(camera_id).role if camera_id in _cameras else None
            if entry_type == "none":
                entry_type = None

            # Log to attendance for both recognized and unknown
            attendance_record = AttendanceRecord(
                employee_id=face_recognizer.known_face_ids.get(face_name, face_name) if face_name != "Unknown" else "Unknown",
                name=face_name if face_name else "Unknown",
                timestamp=get_bangladesh_timestamp(),
                camera_id=camera_id,
                entry_type=entry_type
            )
            _attendance.insert(0, attendance_record)
            print(f"✅ /process_frame: Logged attendance for {face_name} as {entry_type or 'general'} (Total records: {len(_attendance)})")
            if len(_attendance) > 1000:
                del _attendance[1000:]

            # Create alert for unknown faces
            if face_name == "Unknown":
                from datetime import datetime, timedelta
                current_time = datetime.now()
                minute_key = current_time.strftime("%Y-%m-%d-%H-%M")

                # Track unknown faces per minute
                if minute_key not in _unknown_face_count:
                    _unknown_face_count[minute_key] = 0
                _unknown_face_count[minute_key] += 1

                # Create alert if more than 3 unknown faces in a minute
                if _unknown_face_count[minute_key] == 3:
                    _create_alert(
                        title="Multiple Unknown Faces Detected",
                        description=f"Detected {_unknown_face_count[minute_key]} unknown faces in the last minute",
                        severity="medium",
                        category="face_recognition",
                        location="Client Camera",
                        camera_id="CLIENT-CAM"
                    )
                elif _unknown_face_count[minute_key] == 1:
                    _create_alert(
                        title="Unknown Face Detected",
                        description="Unrecognized individual detected by camera",
                        severity="low",
                        category="face_recognition",
                        location="Client Camera",
                        camera_id="CLIENT-CAM"
                    )

                # Clean up old entries (keep only last 5 minutes)
                five_minutes_ago = current_time - timedelta(minutes=5)
                keys_to_delete = [k for k in _unknown_face_count.keys()
                                if datetime.strptime(k, "%Y-%m-%d-%H-%M") < five_minutes_ago]
                for k in keys_to_delete:
                    del _unknown_face_count[k]

        return JSONResponse({
            "status": "success",
            "detections": len(results),
            "results": results
        })

    except Exception as e:
        print(f"Error processing frame: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.get("/attendance", response_model=List[AttendanceRecord])
async def list_attendance():
    return _attendance

@app.post("/attendance", response_model=AttendanceRecord, status_code=status.HTTP_201_CREATED)
async def create_attendance(record: AttendanceRecord):
    _attendance.insert(0, record)
    if len(_attendance) > 1000:
        del _attendance[1000:]
    return record

# Alert endpoints
@app.get("/alerts", response_model=List[Alert])
async def list_alerts():
    return _alerts

@app.post("/alerts", response_model=Alert, status_code=status.HTTP_201_CREATED)
async def create_alert(alert: Alert):
    _alerts.insert(0, alert)
    if len(_alerts) > 100:
        del _alerts[100:]
    return alert

@app.patch("/alerts/{alert_id}")
async def update_alert(alert_id: str, status_update: str = None, acknowledged_by: str = None):
    for alert in _alerts:
        if alert.id == alert_id:
            if status_update:
                alert.status = status_update
            if acknowledged_by:
                alert.acknowledgedBy = acknowledged_by
                alert.acknowledgedAt = get_bangladesh_timestamp()
            return alert
    raise HTTPException(status_code=404, detail="Alert not found")

# Camera endpoints
@app.get("/cameras", response_model=List[CameraConfig])
async def list_cameras():
    """Get list of all cameras and their configurations"""
    return list(_cameras.values())

def _auto_discover_cameras():
    """Auto-discover and register all available cameras at startup"""
    print("\n🔍 Auto-discovering cameras...")
    available_cameras = []

    for idx in range(6):  # Check cameras 0-5
        try:
            cap = cv2.VideoCapture(idx)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    camera_id = f"CAM-{idx}"

                    # Auto-create camera config if not exists
                    if camera_id not in _cameras:
                        _cameras[camera_id] = CameraConfig(
                            id=camera_id,
                            name=f"Camera {idx}",
                            role="none",
                            status="online"  # Set as online since we successfully opened it
                        )
                        print(f"   ✅ Found Camera {idx} ({camera_id})")
                    else:
                        # Update existing camera to online
                        _cameras[camera_id].status = "online"

                    available_cameras.append({
                        "index": idx,
                        "id": camera_id,
                        "name": f"Camera {idx}",
                        "available": True
                    })
            cap.release()
        except Exception as e:
            pass

    if available_cameras:
        print(f"📹 Detected {len(available_cameras)} camera(s): {', '.join([c['name'] for c in available_cameras])}")
    else:
        print("⚠️  No physical cameras detected")

    return available_cameras

@app.get("/cameras/discover")
async def discover_cameras():
    """Discover available cameras by trying to open indices 0-5"""
    cameras = _auto_discover_cameras()
    return {"cameras": cameras}

@app.patch("/cameras/{camera_id}")
async def update_camera(camera_id: str, role: str = None):
    """Update camera configuration (role)"""
    if camera_id in _cameras:
        if role:
            _cameras[camera_id].role = role
        return _cameras[camera_id]
    raise HTTPException(status_code=404, detail="Camera not found")

# Helper function to create alerts
def _create_alert(title: str, description: str, severity: str, category: str, location: str = None, camera_id: str = None):
    """Create a new alert"""
    import uuid
    alert = Alert(
        id=str(uuid.uuid4()),
        title=title,
        description=description,
        severity=severity,
        category=category,
        status="active",
        timestamp=get_bangladesh_timestamp(),
        location=location,
        cameraId=camera_id
    )
    _alerts.insert(0, alert)
    if len(_alerts) > 100:
        del _alerts[100:]
    print(f"🚨 Alert created: {title} ({severity})")
    return alert

# Camera monitoring functions
def _update_camera_status(camera_id: str):
    """Update camera last seen timestamp"""
    _camera_last_seen[camera_id] = get_bangladesh_timestamp()

    # Auto-create camera config if it doesn't exist
    if camera_id not in _cameras:
        # Create user-friendly names
        name_map = {
            "CLIENT-CAM": "Client Camera",
            "SERVER-CAM": "Server Camera",
        }

        # Extract camera index if format is CAM-{index}
        if camera_id.startswith("CAM-") and camera_id != "CLIENT-CAM":
            try:
                idx = camera_id.split("-")[1]
                camera_name = f"Camera {idx}"
            except:
                camera_name = name_map.get(camera_id, f"Camera {camera_id}")
        else:
            camera_name = name_map.get(camera_id, f"Camera {camera_id}")

        _cameras[camera_id] = CameraConfig(
            id=camera_id,
            name=camera_name,
            role="none",
            status="online"
        )
        print(f"📹 Camera registered: {camera_name} ({camera_id})")
    else:
        # Update status to online
        _cameras[camera_id].status = "online"

def _check_camera_offline():
    """Check if any cameras are offline and create alerts"""
    from datetime import datetime, timedelta
    current_time = datetime.now()

    for camera_id, last_seen_str in list(_camera_last_seen.items()):
        try:
            last_seen = datetime.fromisoformat(last_seen_str.replace('Z', '+00:00'))
            time_diff = current_time - last_seen.replace(tzinfo=None)

            # If camera hasn't been seen in 2 minutes
            if time_diff > timedelta(minutes=2):
                # Update camera status to offline
                if camera_id in _cameras:
                    _cameras[camera_id].status = "offline"

                # Check if alert already exists for this camera
                existing_alert = any(
                    a.cameraId == camera_id and a.category == "camera" and a.status == "active"
                    for a in _alerts
                )

                if not existing_alert:
                    _create_alert(
                        title=f"Camera Offline: {camera_id}",
                        description=f"Camera {camera_id} has been offline for more than 2 minutes",
                        severity="medium",
                        category="camera",
                        location=f"Camera {camera_id}",
                        camera_id=camera_id
                    )
        except Exception as e:
            print(f"Error checking camera {camera_id}: {e}")

# ============================================================================
# CLI FUNCTIONS
# ============================================================================

def process_video(video_path, output_path=None, show_display=True, conf_threshold=0.5):
    """Process video with body detection and face recognition"""
    # Check if CPU mode is forced via environment variable
    force_cpu = os.getenv("FORCE_CPU", "1").lower() in ("1", "true", "yes")
    gpu_optimizer = GPUOptimizer(force_cpu=force_cpu)
    gpu_optimizer.optimize_torch_settings()
    gpu_optimizer.print_gpu_status()

    # Get project root (parent of backend folder)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    body_detector = BodyDetector(force_cpu=force_cpu)
    face_recognizer = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))
    
    if isinstance(video_path, int) or video_path.isdigit():
        cap = cv2.VideoCapture(int(video_path))
        video_source = f"Camera {video_path}"
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    else:
        cap = cv2.VideoCapture(video_path)
        video_source = os.path.basename(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video source {video_path}")
        return
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"Processing video: {video_source} ({width}x{height} @ {fps:.2f} fps)")
    
    writer = None
    if output_path:
        writer = create_video_writer(output_path, width, height, fps)
    
    frame_count = 0
    start_time = time.time()
    fps_display = 0
    
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        
        body_boxes = body_detector.detect(frame, conf_threshold)
        result_frame = body_detector.draw_boxes(frame, body_boxes)
        
        face_results = []
        for box in body_boxes:
            x1, y1, x2, y2, _ = box
            margin = 20
            face_region = frame[max(0, y1-margin):min(height, y2+margin), 
                               max(0, x1-margin):min(width, x2+margin)]
            
            if face_region.size == 0:
                continue
            
            face_locations = face_recognizer.detect_faces(face_region)
            adjusted_face_locations = []
            for top, right, bottom, left in face_locations:
                adjusted_face_locations.append((
                    top + max(0, y1-margin),
                    right + max(0, x1-margin),
                    bottom + max(0, y1-margin),
                    left + max(0, x1-margin)
                ))
            
            if adjusted_face_locations:
                face_results.extend(face_recognizer.recognize_faces(frame, adjusted_face_locations))
        
        result_frame = face_recognizer.draw_faces(result_frame, face_results)
        
        frame_count += 1
        elapsed_time = time.time() - start_time
        if elapsed_time >= 1.0:
            fps_display = frame_count / elapsed_time
            frame_count = 0
            start_time = time.time()
        
        if frame_count % 30 == 0 and torch.cuda.is_available():
            gpu_memory = torch.cuda.memory_allocated(0) / 1024**3
            cv2.putText(result_frame, f"GPU Memory: {gpu_memory:.1f}GB", 
                       (10, height - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        result_frame = draw_fps(result_frame, fps_display)
        
        timestamp = get_bangladesh_timestamp_display()
        cv2.putText(result_frame, timestamp, (10, height - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        if writer:
            writer.write(result_frame)
        
        if show_display:
            cv2.namedWindow('CCTV Monitoring', cv2.WINDOW_NORMAL)
            cv2.setWindowProperty('CCTV Monitoring', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            cv2.imshow('CCTV Monitoring', result_frame)
            
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    cap.release()
    if writer:
        writer.release()
    cv2.destroyAllWindows()
    
    if torch.cuda.is_available():
        gpu_optimizer.clear_gpu_cache()
    
    print(f"Processing complete. Output saved to: {output_path}" if output_path else "Processing complete.")

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point - automatically starts the FastAPI server with video processing and GPU optimization"""
    # Check if CPU mode is forced via environment variable
    force_cpu = os.getenv("FORCE_CPU", "1").lower() in ("1", "true", "yes")

    # Initialize GPU optimizer and apply optimizations automatically
    gpu_optimizer = GPUOptimizer(force_cpu=force_cpu)
    gpu_optimizer.optimize_torch_settings()
    gpu_optimizer.print_gpu_status()

    # Start the FastAPI server
    reload_flag = os.getenv("UVICORN_RELOAD", "0") in ("1", "true", "True")
    port_str = os.getenv("PORT", "8000")
    try:
        port_val = int(port_str)
    except ValueError:
        port_val = 8000

    print("\n🚀 Starting CCTV Attendance API Server...")
    print(f"📡 Server will be available at: http://0.0.0.0:{port_val}")
    print(f"📹 Video feed: http://0.0.0.0:{port_val}/video_feed")
    print(f"📚 API docs: http://0.0.0.0:{port_val}/docs")
    print("\n✅ Video processing and face recognition are enabled automatically")
    if force_cpu:
        print("💻 Running in CPU mode (GPU disabled)")
    else:
        print("✅ GPU optimization is enabled automatically")

    # Initialize global detectors before any camera streams start
    print("\n🤖 Initializing AI models...")
    _get_global_detectors()
    print("✅ AI models initialized and ready")

    # Auto-discover cameras on startup
    _auto_discover_cameras()

    print("\n💡 Press Ctrl+C to stop the server\n")
    
    if reload_flag:
        uvicorn.run("backend.backend:app", host="0.0.0.0", port=port_val, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=port_val, reload=False)

if __name__ == "__main__":
    main()

