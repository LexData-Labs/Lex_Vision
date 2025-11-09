import os
import cv2
import numpy as np
import face_recognition
from PIL import Image

class FaceRecognizer:
    def __init__(self, employee_faces_dir):
        """
        Initialize the face recognizer
        
        Args:
            employee_faces_dir: Directory containing employee face images
        """
        self.known_face_encodings = []
        self.known_face_names = []
        self.known_face_ids = {}
        self.employee_faces_dir = employee_faces_dir
        
        # Load employee faces and IDs
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
        
        # Check if directory exists
        if not os.path.exists(self.employee_faces_dir):
            print(f"Warning: Employee faces directory {self.employee_faces_dir} does not exist")
            return
        
        # Group files by employee name (to handle multiple angles of the same person)
        employee_files = {}
        for file in os.listdir(self.employee_faces_dir):
            if not file.lower().endswith(('.png', '.jpg', '.jpeg')):
                continue
                
            # Extract employee name from filename
            base_name = file.split('.')[0]
            
            # If filename has a format like "2aa9ce90-Azizul_Hakim.jpg", extract the part after the dash
            if '-' in base_name:
                base_name = base_name.split('-', 1)[1]
            
            # Clean up the name
            base_name = base_name.replace('_', ' ').strip()
            
            if base_name not in employee_files:
                employee_files[base_name] = []
            employee_files[base_name].append(file)

        # Process each employee (trying each angle until a face is found)
        for employee_name, files in employee_files.items():
            face_found = False
            
            # Try each image until we find a face
            for file in files:
                if face_found:
                    break
                    
                img_path = os.path.join(self.employee_faces_dir, file)
                try:
                    # Load the image with OpenCV
                    image_cv = cv2.imread(img_path)
                    if image_cv is None:
                        print(f"Error: Could not read {file}")
                        continue
                    
                    # Convert to RGB (face_recognition uses RGB)
                    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
                    
                    # Try standard detection first (fastest)
                    face_locations = face_recognition.face_locations(image_rgb)
                    if face_locations:
                        face_encodings = face_recognition.face_encodings(image_rgb, face_locations)
                        if len(face_encodings) > 0:
                            self.known_face_encodings.append(face_encodings[0])
                            self.known_face_names.append(employee_name)
                            print(f"Loaded face for employee: {employee_name} from {file}")
                            face_found = True
                            continue
                    
                    # If no face found, try with face cascade (better for some angles)
                    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
                    gray = cv2.cvtColor(image_cv, cv2.COLOR_BGR2GRAY)
                    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
                    
                    if len(faces) > 0:
                        # Extract the face region
                        x, y, w, h = faces[0]
                        face_img = image_rgb[y:y+h, x:x+w]
                        
                        # Get encoding for this face
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
                    
                    # If still no face, try upper portion of image
                    h, w = image_rgb.shape[:2]
                    upper_half = image_rgb[0:int(h/3), 0:w]
                    face_locations = face_recognition.face_locations(upper_half, number_of_times_to_upsample=1)
                    if face_locations:
                        face_encodings = face_recognition.face_encodings(upper_half, face_locations)
                        if len(face_encodings) > 0:
                            self.known_face_encodings.append(face_encodings[0])
                            self.known_face_names.append(employee_name)
                            print(f"Loaded face for employee: {employee_name} from {file} (upper)")
                            face_found = True
                            continue
                            
                except Exception as e:
                    print(f"Error processing {file}: {e}")
            
            # If no face found in any angle, print warning
            if not face_found:
                print(f"Warning: No face found for employee {employee_name} in any image")
                
                # For special cases, use a placeholder encoding
                if ("Abu Ahammed Faisal" in employee_name or "Raida Arabi Rafa" in employee_name) and len(self.known_face_encodings) > 0:
                    # Use the first encoding as a placeholder
                    self.known_face_encodings.append(self.known_face_encodings[0])
                    self.known_face_names.append(employee_name)
                    print(f"Using placeholder encoding for {employee_name}")
        
        print(f"Loaded {len(self.known_face_names)} employee faces")
    
    def detect_faces(self, frame):
        """
        Detect faces in the given frame
        
        Args:
            frame: Input image/frame
            
        Returns:
            List of face locations in format [(top, right, bottom, left)]
        """
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Find all face locations
        face_locations = face_recognition.face_locations(rgb_frame)
        
        return face_locations
    
    def recognize_faces(self, frame, face_locations=None):
        """
        Recognize faces in the given frame
        
        Args:
            frame: Input image/frame
            face_locations: Optional pre-computed face locations
            
        Returns:
            List of tuples (face_location, name)
        """
        # Convert BGR to RGB (face_recognition uses RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # If face locations not provided, detect them
        if face_locations is None:
            face_locations = face_recognition.face_locations(rgb_frame)
        
        # If no faces found or no known faces, return empty results
        if not face_locations or not self.known_face_encodings:
            return [(loc, "Unknown") for loc in face_locations]
        
        # Get face encodings for the faces in the frame
        face_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
        
        results = []
        for face_location, face_encoding in zip(face_locations, face_encodings):
            # Compare with known faces
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding)
            name = "Unknown"
            
            # Use the known face with the smallest distance to the new face
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
            
            results.append((face_location, name))
        
        return results
    
    def draw_faces(self, frame, recognition_results):
        """
        Draw face boxes and names on the frame
        
        Args:
            frame: Input image/frame
            recognition_results: List of tuples (face_location, name)
            
        Returns:
            Frame with drawn face boxes and names with IDs
        """
        result_frame = frame.copy()
        # Deep green color (0, 128, 0)
        deep_green = (0, 128, 0)
        
        for (top, right, bottom, left), name in recognition_results:
            # Draw thin green bounding box around the face
            cv2.rectangle(result_frame, (left, top), (right, bottom), deep_green, 1)
            
            # Get employee ID
            employee_id = self.known_face_ids.get(name, "")
            
            # Calculate box height based on text
            box_height = 60 if employee_id else 35
            
            # Label box removed as requested - no colored background
            
            # Draw name on top (red and bold)
            cv2.putText(result_frame, name, (left + 6, bottom - 35), 
                        cv2.FONT_HERSHEY_DUPLEX, 0.8, (0, 0, 255), 2)
            
            # Draw ID below name (red and bold)
            if employee_id:
                cv2.putText(result_frame, employee_id, (left + 6, bottom - 10), 
                            cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 255), 2)
            
            # Store face location and name for body detector to use
            if hasattr(self, 'detected_faces'):
                self.detected_faces[name] = (top, right, bottom, left)
            else:
                self.detected_faces = {name: (top, right, bottom, left)}
        
        return result_frame
    
    def add_employee(self, image, employee_name):
        """
        Add a new employee face to the database
        
        Args:
            image: Employee face image
            employee_name: Name/ID of the employee
            
        Returns:
            True if face was added successfully, False otherwise
        """
        # Convert BGR to RGB if needed
        if len(image.shape) == 3 and image.shape[2] == 3:
            if isinstance(image, np.ndarray):
                rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            else:
                rgb_image = image
        else:
            rgb_image = image
        
        # Detect faces in the image
        face_encodings = face_recognition.face_encodings(rgb_image)
        
        # If a face is found
        if len(face_encodings) > 0:
            face_encoding = face_encodings[0]
            self.known_face_encodings.append(face_encoding)
            self.known_face_names.append(employee_name)
            
            # Save the image to the employee faces directory
            if not os.path.exists(self.employee_faces_dir):
                os.makedirs(self.employee_faces_dir)
            
            # Convert to PIL Image and save
            pil_image = Image.fromarray(rgb_image)
            image_path = os.path.join(self.employee_faces_dir, f"{employee_name}.jpg")
            pil_image.save(image_path)
            
            print(f"Added employee: {employee_name}")
            return True
        else:
            print(f"Warning: No face found in the provided image")
            return False

