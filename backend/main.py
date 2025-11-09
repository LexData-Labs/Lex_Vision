import os
import cv2
import time
import argparse
import numpy as np
import torch
from .body_detector import BodyDetector
from .face_recognizer import FaceRecognizer
from .utils import draw_fps, resize_image, get_video_properties, create_video_writer
from .gpu_optimizer import GPUOptimizer

def process_video(video_path, output_path=None, show_display=True, conf_threshold=0.5):
    """
    Process video with body detection and face recognition
    
    Args:
        video_path: Path to input video file or camera index (0 for webcam)
        output_path: Path to save output video (optional)
        show_display: Whether to show display window
        conf_threshold: Confidence threshold for detections
    """
    # Initialize GPU optimizer
    gpu_optimizer = GPUOptimizer()
    gpu_optimizer.optimize_torch_settings()
    
    # Show GPU status
    gpu_optimizer.print_gpu_status()
    
    # Get project root directory (parent of backend)
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    
    # Initialize detectors
    body_detector = BodyDetector()
    face_recognizer = FaceRecognizer(os.path.join(project_root, 'data', 'employee_faces'))
    
    # Open video capture
    if isinstance(video_path, int) or video_path.isdigit():
        cap = cv2.VideoCapture(int(video_path))
        video_source = f"Camera {video_path}"
        # Set 16:9 aspect ratio for camera
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1920)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 1080)
    else:
        cap = cv2.VideoCapture(video_path)
        video_source = os.path.basename(video_path)
    
    if not cap.isOpened():
        print(f"Error: Could not open video source {video_path}")
        return
    
    # Get video properties
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"Processing video: {video_source} ({width}x{height} @ {fps:.2f} fps)")
    
    # Create video writer if output path is specified
    writer = None
    if output_path:
        writer = create_video_writer(output_path, width, height, fps)
    
    # Variables for FPS calculation
    frame_count = 0
    start_time = time.time()
    fps_display = 0
    
    while True:
        # Read frame
        ret, frame = cap.read()
        if not ret:
            break
        
        # Detect bodies
        body_boxes = body_detector.detect(frame, conf_threshold)
        
        # Draw body detections
        result_frame = body_detector.draw_boxes(frame, body_boxes)
        
        # Process faces only within detected bodies to improve performance
        face_results = []
        for box in body_boxes:
            x1, y1, x2, y2, _ = box
            # Extract face region with some margin
            margin = 20
            face_region = frame[max(0, y1-margin):min(height, y2+margin), 
                               max(0, x1-margin):min(width, x2+margin)]
            
            if face_region.size == 0:
                continue
            
            # Detect and recognize faces in this region
            face_locations = face_recognizer.detect_faces(face_region)
            
            # Adjust face locations to original frame coordinates
            adjusted_face_locations = []
            for top, right, bottom, left in face_locations:
                adjusted_face_locations.append((
                    top + max(0, y1-margin),
                    right + max(0, x1-margin),
                    bottom + max(0, y1-margin),
                    left + max(0, x1-margin)
                ))
            
            # Recognize faces
            if adjusted_face_locations:
                face_results.extend(face_recognizer.recognize_faces(frame, adjusted_face_locations))
        
        # Draw face recognitions
        result_frame = face_recognizer.draw_faces(result_frame, face_results)
        
        # Calculate and display FPS
        frame_count += 1
        elapsed_time = time.time() - start_time
        if elapsed_time >= 1.0:
            fps_display = frame_count / elapsed_time
            frame_count = 0
            start_time = time.time()
        
        # Add GPU memory info to frame every 30 frames
        if frame_count % 30 == 0 and torch.cuda.is_available():
            gpu_memory = torch.cuda.memory_allocated(0) / 1024**3
            cv2.putText(result_frame, f"GPU Memory: {gpu_memory:.1f}GB", 
                       (10, height - 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
        
        result_frame = draw_fps(result_frame, fps_display)
        
        # Add timestamp
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(result_frame, timestamp, (10, height - 10),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # Write frame to output video
        if writer:
            writer.write(result_frame)
        
        # Display frame
        if show_display:
            cv2.namedWindow('CCTV Monitoring', cv2.WINDOW_NORMAL)
            cv2.setWindowProperty('CCTV Monitoring', cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
            cv2.imshow('CCTV Monitoring', result_frame)
            
            # Exit on 'q' key
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
    
    # Release resources
    cap.release()
    if writer:
        writer.release()
    cv2.destroyAllWindows()
    
    # Clear GPU memory
    if torch.cuda.is_available():
        gpu_optimizer.clear_gpu_cache()
    
    print(f"Processing complete. Output saved to: {output_path}" if output_path else "Processing complete.")

def train_model(data_yaml, epochs=50, batch_size=16, img_size=640):
    """
    Train the YOLOv8 model on custom dataset
    
    Args:
        data_yaml: Path to data.yaml file
        epochs: Number of training epochs
        batch_size: Batch size for training
        img_size: Image size for training
    
    Returns:
        Path to the trained model
    """
    try:
        print(f"Training YOLOv8 model with {data_yaml}")
        print(f"Epochs: {epochs}, Batch size: {batch_size}, Image size: {img_size}")
        
        # Create dataset directory if it doesn't exist
        dataset_dir = os.path.dirname(data_yaml)
        if not os.path.exists(dataset_dir):
            os.makedirs(dataset_dir)
            print(f"Created dataset directory at {dataset_dir}")
        
        # Initialize body detector
        body_detector = BodyDetector()
        
        # Train model
        model = body_detector.train(
            data_yaml=data_yaml,
            epochs=epochs,
            batch_size=batch_size,
            img_size=img_size
        )
        
        # Get project root directory
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        final_model_path = os.path.join(project_root, "models", "person_detector.pt")
        os.makedirs(os.path.dirname(final_model_path), exist_ok=True)
        
        print(f"Training complete. Best model saved to {final_model_path}")
        return final_model_path
        
    except Exception as e:
        print(f"Error during model training: {str(e)}")
        raise

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CCTV Body and Face Detection System")
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Process video command
    process_parser = subparsers.add_parser('process', help='Process video')
    process_parser.add_argument('--input', type=str, default='0', 
                               help='Path to input video file or camera index (0 for webcam)')
    process_parser.add_argument('--output', type=str, help='Path to save output video')
    process_parser.add_argument('--conf', type=float, default=0.5, 
                               help='Confidence threshold for detections')
    process_parser.add_argument('--no-display', action='store_true', 
                               help='Disable display window')
    
    # Train model command
    train_parser = subparsers.add_parser('train', help='Train YOLOv8 model')
    train_parser.add_argument('--data', type=str, default='data/yolo_dataset/data.yaml', 
                             help='Path to data.yaml file')
    train_parser.add_argument('--epochs', type=int, default=50, 
                             help='Number of training epochs')
    train_parser.add_argument('--batch', type=int, default=16, 
                             help='Batch size for training')
    train_parser.add_argument('--img-size', type=int, default=640, 
                             help='Image size for training')
    
    # GPU optimization command
    gpu_parser = subparsers.add_parser('gpu', help='GPU optimization and monitoring')
    gpu_parser.add_argument('--monitor', type=int, default=60, 
                           help='Monitor GPU usage for specified seconds')
    gpu_parser.add_argument('--optimize', action='store_true', 
                           help='Apply GPU optimizations')
    
    args = parser.parse_args()
    
    # Default to process command if none specified
    if not args.command:
        print("No command specified, defaulting to process with webcam input")
        process_video(
            video_path=0,  # Default to webcam
            output_path=None,
            show_display=True,
            conf_threshold=0.5
        )
    elif args.command == 'process':
        process_video(
            video_path=args.input,
            output_path=args.output,
            show_display=not args.no_display,
            conf_threshold=args.conf
        )
    elif args.command == 'train':
        train_model(
            data_yaml=args.data,
            epochs=args.epochs,
            batch_size=args.batch,
            img_size=args.img_size
        )
    elif args.command == 'gpu':
        gpu_optimizer = GPUOptimizer()
        if args.optimize:
            gpu_optimizer.optimize_torch_settings()
        gpu_optimizer.print_gpu_status()
        if args.monitor > 0:
            gpu_optimizer.monitor_gpu_usage(duration=args.monitor, interval=1.0)
    else:
        parser.print_help()

