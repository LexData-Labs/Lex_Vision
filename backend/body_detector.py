import cv2
import numpy as np
from ultralytics import YOLO
import torch

class BodyDetector:
    def __init__(self, model_path=None):
        """
        Initialize the body detector with YOLOv8
        
        Args:
            model_path: Path to a custom YOLOv8 model, if None, uses pretrained model
        """
        import torch
        torch.serialization.add_safe_globals([torch.nn.Module])
        
        if model_path:
            self.model = YOLO(model_path)
        else:
            # Use pretrained YOLOv8 model
            try:
                self.model = YOLO('yolov8n.pt')
            except Exception as e:
                print(f"Error loading local yolov8n.pt: {e}")
                print("Downloading fresh YOLOv8n model...")
                self.model = YOLO('yolov8n')
        
        # Set device (GPU if available, otherwise CPU)
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        print(f"Using device: {self.device}")
        
        # Move model to GPU if available
        if torch.cuda.is_available():
            self.model.to(self.device)
            print(f"Model moved to GPU: {torch.cuda.get_device_name()}")
            # Set CUDA optimization flags
            torch.backends.cudnn.benchmark = True
            torch.backends.cudnn.deterministic = False
        
        # Classes we're interested in (person is class 0 in COCO dataset)
        self.target_classes = [0]  # 0 is the class index for 'person'
    
    def detect(self, frame, conf_threshold=0.5):
        """
        Detect people in the given frame
        
        Args:
            frame: Input image/frame
            conf_threshold: Confidence threshold for detections
            
        Returns:
            List of bounding boxes in format [x1, y1, x2, y2, confidence]
        """
        # Run YOLOv8 inference on the frame with GPU optimization
        if torch.cuda.is_available():
            # Use GPU with optimized settings and ensure model is on GPU
            if next(self.model.parameters()).device != self.device:
                self.model.to(self.device)
            results = self.model(frame, verbose=False, device=self.device)[0]
        else:
            results = self.model(frame, verbose=False)[0]
        
        # Extract detections
        boxes = []
        for det in results.boxes:
            cls = int(det.cls.item())
            conf = det.conf.item()
            
            # Only keep person detections with confidence above threshold
            if cls in self.target_classes and conf >= conf_threshold:
                x1, y1, x2, y2 = map(int, det.xyxy[0].tolist())
                boxes.append([x1, y1, x2, y2, conf])
        
        return boxes
    
    def draw_boxes(self, frame, detections, face_recognizer=None):
        """Draw bounding boxes for detected persons with names and IDs if available"""
        result_frame = frame.copy()
        # Define colors
        deep_green = (0, 128, 0)  # Deep green for known persons
        blue = (255, 0, 0)        # Blue for bounding boxes (BGR format)
        red = (0, 0, 255)         # Red for unknown persons
        
        for detection in detections:
            # Extract detection information
            x1, y1, x2, y2, conf = detection
            
            # Draw thin blue bounding box around the full body
            cv2.rectangle(result_frame, (int(x1), int(y1)), (int(x2), int(y2)), blue, 1)
            
            # Default labels and colors
            name_label = f"Person: {conf:.2f}"
            id_label = ""
            label_color = red  # Default to red for unknown persons
            
            # If face recognizer is provided and has detected faces, try to match with body
            if face_recognizer and hasattr(face_recognizer, 'detected_faces') and face_recognizer.detected_faces:
                # Get body center point
                body_center_x = (x1 + x2) / 2
                body_center_y = (y1 + y2) / 2
                
                # Find closest face to this body
                closest_name = None
                min_distance = float('inf')
                
                for name, (top, right, bottom, left) in face_recognizer.detected_faces.items():
                    face_center_x = (left + right) / 2
                    face_center_y = (top + bottom) / 2
                    
                    # Check if face is within or close to body bounding box
                    if (x1 <= face_center_x <= x2 and y1 <= face_center_y <= y2) or \
                       (abs(face_center_x - body_center_x) < 100 and abs(face_center_y - body_center_y) < 200):
                        # Calculate distance between face and body centers
                        distance = ((face_center_x - body_center_x) ** 2 + (face_center_y - body_center_y) ** 2) ** 0.5
                        
                        if distance < min_distance:
                            min_distance = distance
                            closest_name = name
                
                # If a matching face was found, use its name and ID
                if closest_name:
                    name_label = closest_name
                    # Get employee ID from face recognizer
                    if hasattr(face_recognizer, 'known_face_ids') and closest_name in face_recognizer.known_face_ids:
                        id_label = f"ID: {face_recognizer.known_face_ids[closest_name]}"
                    label_color = deep_green  # Use deep green for known persons
            
            # Calculate label box height based on available information
            box_height = 65 if id_label else 35
            
            # Label box removed as requested - no colored background
            
            # Only faces show names - body boxes remain with just the box
        
        return result_frame
    
    def train(self, data_yaml, epochs=50, batch_size=16, img_size=640):
        """
        Train the YOLOv8 model on custom dataset
        
        Args:
            data_yaml: Path to data.yaml file for training
            epochs: Number of training epochs
            batch_size: Batch size for training
            img_size: Image size for training
            
        Returns:
            Trained model
        """
        import torch
        torch.serialization.add_safe_globals([torch.nn.Module])
        
        # Create a new YOLO model for training
        try:
            model = YOLO('yolov8n.pt')
        except Exception as e:
            print(f"Error loading local yolov8n.pt for training: {e}")
            print("Downloading fresh YOLOv8n model for training...")
            model = YOLO('yolov8n')
        
        # Training logic continues...
        # Train the model
        results = model.train(
            data=data_yaml,
            epochs=epochs,
            batch=batch_size,
            imgsz=img_size,
            device=self.device
        )
        
        # Update the current model with the trained one
        self.model = model
        
        return model

