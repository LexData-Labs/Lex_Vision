#!/usr/bin/env python3
"""
Optimized Camera Processing for RTX 4060 GPU
Fixes FPS lag and ensures proper GPU utilization
"""

import cv2
import time
import numpy as np
import torch
import threading
from collections import deque
from .body_detector import BodyDetector
from .face_recognizer import FaceRecognizer
from .gpu_optimizer import GPUOptimizer
import os

class OptimizedCameraProcessor:
    def __init__(self, camera_index=0, target_fps=30):
        """
        Initialize optimized camera processor
        
        Args:
            camera_index: Camera device index (0 for default webcam)
            target_fps: Target FPS for processing
        """
        self.camera_index = camera_index
        self.target_fps = target_fps
        self.frame_interval = 1.0 / target_fps
        
        # Initialize GPU optimizer
        print("🚀 Initializing GPU Optimizer...")
        self.gpu_optimizer = GPUOptimizer()
        self.gpu_optimizer.optimize_torch_settings()
        
        # Initialize detectors with GPU optimization
        print("🔧 Initializing Body Detector...")
        self.body_detector = BodyDetector()
        
        print("👤 Initializing Face Recognizer...")
        # Get project root directory (parent of backend)
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.face_recognizer = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))
        
        # Initialize camera with optimized settings
        self.cap = None
        self.initialize_camera()
        
        # Performance tracking
        self.fps_counter = deque(maxlen=30)
        self.processing_times = deque(maxlen=30)
        self.frame_count = 0
        self.start_time = time.time()
        
        # Threading for better performance
        self.latest_frame = None
        self.latest_results = None
        self.processing_thread = None
        self.running = False
        
        print("✅ Optimized Camera Processor initialized!")
    
    def initialize_camera(self):
        """Initialize camera with optimized settings"""
        self.cap = cv2.VideoCapture(self.camera_index)
        
        if not self.cap.isOpened():
            raise RuntimeError(f"Could not open camera {self.camera_index}")
        
        # Set camera properties for optimal performance
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
        self.cap.set(cv2.CAP_PROP_FPS, self.target_fps)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Minimize buffer for real-time
        
        # Get actual camera properties
        self.width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        self.height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        self.actual_fps = self.cap.get(cv2.CAP_PROP_FPS)
        
        print(f"📹 Camera initialized: {self.width}x{self.height} @ {self.actual_fps:.1f} fps")
    
    def process_frame_optimized(self, frame):
        """Optimized frame processing with GPU acceleration"""
        start_time = time.time()
        
        # Resize frame for faster processing if needed
        if self.width > 1280:
            scale_factor = 1280 / self.width
            new_width = int(self.width * scale_factor)
            new_height = int(self.height * scale_factor)
            frame = cv2.resize(frame, (new_width, new_height))
        
        # Detect bodies with GPU acceleration
        body_boxes = self.body_detector.detect(frame, conf_threshold=0.5)
        
        # Process faces only for detected bodies (performance optimization)
        face_results = []
        for box in body_boxes:
            x1, y1, x2, y2, _ = box
            # Extract face region with margin
            margin = 20
            face_region = frame[max(0, y1-margin):min(frame.shape[0], y2+margin), 
                               max(0, x1-margin):min(frame.shape[1], x2+margin)]
            
            if face_region.size > 0:
                # Detect faces in this region
                face_locations = self.face_recognizer.detect_faces(face_region)
                
                # Adjust coordinates to original frame
                for top, right, bottom, left in face_locations:
                    adjusted_location = (
                        top + max(0, y1-margin),
                        right + max(0, x1-margin),
                        bottom + max(0, y1-margin),
                        left + max(0, x1-margin)
                    )
                    face_results.extend(self.face_recognizer.recognize_faces(frame, [adjusted_location]))
        
        processing_time = time.time() - start_time
        self.processing_times.append(processing_time)
        
        return frame, body_boxes, face_results
    
    def processing_worker(self):
        """Background processing worker thread"""
        while self.running:
            if self.latest_frame is not None:
                try:
                    results = self.process_frame_optimized(self.latest_frame.copy())
                    self.latest_results = results
                except Exception as e:
                    print(f"Processing error: {e}")
                    self.latest_results = None
            time.sleep(0.001)  # Small delay to prevent CPU overload
    
    def draw_results(self, frame, body_boxes, face_results):
        """Draw detection results on frame"""
        result_frame = frame.copy()
        
        # Draw body detections
        for box in body_boxes:
            x1, y1, x2, y2, conf = box
            cv2.rectangle(result_frame, (int(x1), int(y1)), (int(x2), int(y2)), (255, 0, 0), 2)
            cv2.putText(result_frame, f"Person: {conf:.2f}", (int(x1), int(y1)-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)
        
        # Draw face recognitions
        for face_result in face_results:
            name, confidence, (top, right, bottom, left) = face_result
            cv2.rectangle(result_frame, (left, top), (right, bottom), (0, 255, 0), 2)
            cv2.putText(result_frame, f"{name}: {confidence:.2f}", (left, top-10),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        # Draw performance metrics
        current_fps = len(self.fps_counter) / sum(self.fps_counter) if self.fps_counter else 0
        avg_processing_time = np.mean(self.processing_times) if self.processing_times else 0
        
        # GPU memory info
        if torch.cuda.is_available():
            gpu_memory = torch.cuda.memory_allocated(0) / 1024**3
            cv2.putText(result_frame, f"GPU: {gpu_memory:.1f}GB", (10, 30),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        
        # FPS and processing time
        cv2.putText(result_frame, f"FPS: {current_fps:.1f}", (10, 60),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        cv2.putText(result_frame, f"Process: {avg_processing_time*1000:.1f}ms", (10, 90),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
        
        # Timestamp
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(result_frame, timestamp, (10, self.height - 10),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        return result_frame
    
    def run(self):
        """Main processing loop with optimized performance"""
        print("🎬 Starting optimized camera processing...")
        print("💡 Press 'q' to quit, 'g' to show GPU status")
        
        self.running = True
        
        # Start processing thread
        self.processing_thread = threading.Thread(target=self.processing_worker)
        self.processing_thread.start()
        
        last_frame_time = time.time()
        
        while True:
            # Read frame
            ret, frame = self.cap.read()
            if not ret:
                print("❌ Failed to read frame")
                break
            
            current_time = time.time()
            frame_time = current_time - last_frame_time
            
            # Update latest frame for processing thread
            self.latest_frame = frame
            
            # Get results from processing thread
            if self.latest_results is not None:
                processed_frame, body_boxes, face_results = self.latest_results
                result_frame = self.draw_results(processed_frame, body_boxes, face_results)
            else:
                result_frame = frame
            
            # Update FPS counter
            if frame_time > 0:
                self.fps_counter.append(frame_time)
            
            # Display frame
            cv2.namedWindow('Optimized CCTV Monitoring', cv2.WINDOW_NORMAL)
            cv2.imshow('Optimized CCTV Monitoring', result_frame)
            
            # Handle key presses
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            elif key == ord('g'):
                self.gpu_optimizer.print_gpu_status()
            
            last_frame_time = current_time
        
        # Cleanup
        self.running = False
        if self.processing_thread:
            self.processing_thread.join()
        
        self.cap.release()
        cv2.destroyAllWindows()
        
        # Clear GPU memory
        if torch.cuda.is_available():
            self.gpu_optimizer.clear_gpu_cache()
        
        print("✅ Camera processing stopped")

def main():
    """Main function to run optimized camera processing"""
    try:
        # Create and run optimized camera processor
        processor = OptimizedCameraProcessor(camera_index=0, target_fps=30)
        processor.run()
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()

