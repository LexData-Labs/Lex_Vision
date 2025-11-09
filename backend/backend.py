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

# FastAPI and web server
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import uvicorn

# Computer Vision
from ultralytics import YOLO
import face_recognition
from PIL import Image

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
    """Add timestamp to the frame"""
    if timestamp is None:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    
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
    
    def __init__(self):
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
    
    def __init__(self, model_path=None):
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
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        if torch.cuda.is_available():
            self.model.to(self.device)
            print(f"Model moved to GPU: {torch.cuda.get_device_name()}")
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
        
        self.target_classes = [0]  # Person class
    
    def detect(self, frame, conf_threshold=0.5):
        """Detect people in the given frame"""
        if torch.cuda.is_available():
            if next(self.model.parameters()).device != self.device:
                self.model.to(self.device)
            results = self.model(frame, verbose=False, device=self.device)[0]
        else:
            results = self.model(frame, verbose=False)[0]
        
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

# In-memory stores
_employees: Dict[str, Employee] = {}
_attendance: List[AttendanceRecord] = []

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

@app.get("/employees/{emp_id}", response_model=Employee)
async def get_employee(emp_id: str):
    if emp_id not in _employees:
        raise HTTPException(status_code=404, detail="Employee not found")
    return _employees[emp_id]

# Video streaming
def _open_video_capture():
    """Robust camera/source opener"""
    source_env = os.getenv("CAMERA_SOURCE")
    if source_env:
        cap = cv2.VideoCapture(source_env, cv2.CAP_FFMPEG)
        if cap.isOpened():
            return cap, f"source={source_env}"
    
    try:
        base_index = int(os.getenv("CAMERA_INDEX", "0"))
    except ValueError:
        base_index = 0
    
    backends = [cv2.CAP_V4L2, cv2.CAP_GSTREAMER, None]
    
    for backend in backends:
        if backend is not None:
            cap = cv2.VideoCapture(base_index, backend)
            if cap.isOpened():
                return cap, f"index={base_index}"
            cap.release()
        else:
            cap = cv2.VideoCapture(base_index)
            if cap.isOpened():
                return cap, f"index={base_index} (default)"
            cap.release()
    
    for idx in range(0, 6):
        for backend in backends:
            if backend is not None:
                cap = cv2.VideoCapture(idx, backend)
                if cap.isOpened():
                    return cap, f"index={idx}"
                cap.release()
            else:
                cap = cv2.VideoCapture(idx)
                if cap.isOpened():
                    return cap, f"index={idx} (default)"
                cap.release()
    
    raise RuntimeError("Could not open any camera")

def generate_mjpeg(conf_threshold: float = 0.3):
    """Generate MJPEG video stream with detection overlays"""
    body_det = BodyDetector()
    # Get project root (parent of backend folder)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    face_rec = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))

    cap, source_label = _open_video_capture()

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

    while True:
        success, frame = cap.read()
        if not success or frame is None:
            time.sleep(0.01)
            continue

        frame_skip += 1
        
        if frame_skip % detection_interval == 0:
            env_conf = os.getenv("DETECT_CONF_THRESHOLD")
            eff_conf = float(env_conf) if env_conf is not None else conf_threshold
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
                    locs = face_rec.detect_faces(region)
                    adjusted = [(t+max(0, y1-margin), r+max(0, x1-margin), 
                               b+max(0, y1-margin), l+max(0, x1-margin)) for t, r, b, l in locs]
                    if adjusted:
                        last_face_results.extend(face_rec.recognize_faces(frame, adjusted))
        
        frame = body_det.draw_boxes(frame, last_body_boxes)
        frame = face_rec.draw_faces(frame, last_face_results)

        if frame_skip % detection_interval == 0:
            try:
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

        encode_params = [cv2.IMWRITE_JPEG_QUALITY, 75]
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
    if len(_attendance) > 1000:
        del _attendance[1000:]
    return record

# ============================================================================
# CLI FUNCTIONS
# ============================================================================

def process_video(video_path, output_path=None, show_display=True, conf_threshold=0.5):
    """Process video with body detection and face recognition"""
    gpu_optimizer = GPUOptimizer()
    gpu_optimizer.optimize_torch_settings()
    gpu_optimizer.print_gpu_status()
    
    # Get project root (parent of backend folder)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    body_detector = BodyDetector()
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
        
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
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
    # Initialize GPU optimizer and apply optimizations automatically
    gpu_optimizer = GPUOptimizer()
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
    print("✅ GPU optimization is enabled automatically")
    print("\n💡 Press Ctrl+C to stop the server\n")
    
    if reload_flag:
        uvicorn.run("backend.backend:app", host="0.0.0.0", port=port_val, reload=True)
    else:
        uvicorn.run(app, host="0.0.0.0", port=port_val, reload=False)

if __name__ == "__main__":
    main()

