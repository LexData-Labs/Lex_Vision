import cv2
import numpy as np
import time

def draw_fps(frame, fps):
    """
    Draw FPS counter on the frame
    
    Args:
        frame: Input frame
        fps: FPS value to display
        
    Returns:
        Frame with FPS counter
    """
    if fps > 0:
        fps_text = f"FPS: {fps:.1f}"
        cv2.putText(frame, fps_text, (10, 30), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    return frame

def resize_image(image, target_width=None, target_height=None, keep_aspect=True):
    """
    Resize image while optionally maintaining aspect ratio
    
    Args:
        image: Input image
        target_width: Target width (optional)
        target_height: Target height (optional)
        keep_aspect: Whether to maintain aspect ratio
        
    Returns:
        Resized image
    """
    if target_width is None and target_height is None:
        return image
    
    h, w = image.shape[:2]
    
    if keep_aspect:
        if target_width is not None and target_height is not None:
            # Calculate scaling factor to fit within target dimensions
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
    """
    Get video properties (width, height, fps, frame count)
    
    Args:
        video_path: Path to video file or camera index
        
    Returns:
        Dictionary with video properties
    """
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
    """
    Create a video writer for saving output video
    
    Args:
        output_path: Path to save the output video
        width: Video width
        height: Video height
        fps: Frames per second
        fourcc: FourCC codec (default: MP4V)
        
    Returns:
        VideoWriter object
    """
    if fourcc is None:
        # Use MP4V codec for better compatibility
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    
    # Ensure output directory exists
    import os
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    writer = cv2.VideoWriter(output_path, fourcc, fps, (width, height))
    return writer

def add_timestamp(frame, timestamp=None):
    """
    Add timestamp to the frame
    
    Args:
        frame: Input frame
        timestamp: Timestamp string (if None, uses current time)
        
    Returns:
        Frame with timestamp
    """
    if timestamp is None:
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
    
    h, w = frame.shape[:2]
    cv2.putText(frame, timestamp, (10, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    return frame

def draw_bounding_box(frame, x1, y1, x2, y2, label="", color=(0, 255, 0), thickness=2):
    """
    Draw bounding box with optional label
    
    Args:
        frame: Input frame
        x1, y1, x2, y2: Bounding box coordinates
        label: Optional label text
        color: BGR color tuple
        thickness: Line thickness
        
    Returns:
        Frame with bounding box
    """
    cv2.rectangle(frame, (x1, y1), (x2, y2), color, thickness)
    
    if label:
        # Calculate text size for background
        (text_width, text_height), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
        
        # Draw background rectangle for text
        cv2.rectangle(frame, (x1, y1 - text_height - 10), (x1 + text_width, y1), color, -1)
        
        # Draw text
        cv2.putText(frame, label, (x1, y1 - 5), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    
    return frame

def calculate_iou(box1, box2):
    """
    Calculate Intersection over Union (IoU) between two bounding boxes
    
    Args:
        box1: First bounding box [x1, y1, x2, y2]
        box2: Second bounding box [x1, y1, x2, y2]
        
    Returns:
        IoU value
    """
    x1_1, y1_1, x2_1, y2_1 = box1
    x1_2, y1_2, x2_2, y2_2 = box2
    
    # Calculate intersection coordinates
    x1_i = max(x1_1, x1_2)
    y1_i = max(y1_1, y1_2)
    x2_i = min(x2_1, x2_2)
    y2_i = min(y2_1, y2_2)
    
    # Check if there's an intersection
    if x2_i <= x1_i or y2_i <= y1_i:
        return 0.0
    
    # Calculate areas
    intersection = (x2_i - x1_i) * (y2_i - y1_i)
    area1 = (x2_1 - x1_1) * (y2_1 - y1_1)
    area2 = (x2_2 - x1_2) * (y2_2 - y1_2)
    union = area1 + area2 - intersection
    
    return intersection / union if union > 0 else 0.0

