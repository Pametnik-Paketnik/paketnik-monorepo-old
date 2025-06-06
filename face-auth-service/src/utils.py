import os
import uuid
import shutil
import random
import logging
import cv2
import numpy as np
from pathlib import Path
from typing import List, Optional, Tuple
import tensorflow as tf
import mediapipe as mp

logger = logging.getLogger(__name__)

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
mp_drawing = mp.solutions.drawing_utils

def detect_and_crop_face(image: np.ndarray, target_size: Tuple[int, int] = (224, 224)) -> Optional[np.ndarray]:
    """
    Detect face in image using MediaPipe and crop to target size.
    
    Args:
        image: Input image as numpy array
        target_size: Target size for cropped face (width, height)
        
    Returns:
        Cropped face image or None if no face detected
    """
    try:
        # Convert BGR to RGB for MediaPipe
        rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        
        with mp_face_detection.FaceDetection(model_selection=0, min_detection_confidence=0.5) as face_detection:
            results = face_detection.process(rgb_image)
            
            if not results.detections:
                logger.warning("No face detected in image")
                return None
            
            # Use the first (most confident) detection
            detection = results.detections[0]
            bboxC = detection.location_data.relative_bounding_box
            
            # Convert relative coordinates to absolute
            h, w, _ = image.shape
            x = int(bboxC.xmin * w)
            y = int(bboxC.ymin * h)
            width = int(bboxC.width * w)
            height = int(bboxC.height * h)
            
            # Add some padding around the face
            padding = 0.2  # 20% padding
            pad_x = int(width * padding)
            pad_y = int(height * padding)
            
            # Ensure coordinates are within image bounds
            x1 = max(0, x - pad_x)
            y1 = max(0, y - pad_y)
            x2 = min(w, x + width + pad_x)
            y2 = min(h, y + height + pad_y)
            
            # Crop face
            face_crop = image[y1:y2, x1:x2]
            
            if face_crop.size == 0:
                logger.warning("Empty face crop detected")
                return None
            
            # Convert to grayscale then back to RGB for model compatibility
            gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
            rgb_face = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
            
            # Resize to target size
            resized_face = cv2.resize(rgb_face, target_size)
            
            return resized_face
            
    except Exception as e:
        logger.error(f"Error in face detection and cropping: {e}")
        return None

def preprocess_and_train(user_id: str):
    """
    Main preprocessing and training pipeline for a user registration job.
    Now with MediaPipe face detection.
    
    Args:
        user_id: User identifier for the training job
    """
    try:
        logger.info(f"Starting preprocessing and training for user_id: {user_id}")
        
        # Define paths  
        user_path = Path(f"/app/data/users/{user_id}")
        raw_positives_path = user_path / "raw_positives"
        processed_positives_path = user_path / "processed_positives"
        processed_negatives_path = user_path / "processed_negatives"
        train_path = user_path / "train"
        val_path = user_path / "val"
        
        # Create necessary directories
        processed_positives_path.mkdir(parents=True, exist_ok=True)
        processed_negatives_path.mkdir(parents=True, exist_ok=True)
        
        # Step 1: Preprocess positive images with face detection
        logger.info("Step 1: Detecting faces and preprocessing positive images...")
        positive_files = list(raw_positives_path.glob("*"))
        processed_positives = []
        
        for idx, image_path in enumerate(positive_files):
            try:
                # Read image
                img = cv2.imread(str(image_path))
                if img is None:
                    logger.warning(f"Could not read image: {image_path}")
                    continue
                
                # Detect and crop face using MediaPipe
                face_crop = detect_and_crop_face(img, target_size=(224, 224))
                
                if face_crop is None:
                    logger.warning(f"No face detected in image: {image_path}")
                    continue
                
                # Save processed face
                output_path = processed_positives_path / f"positive_{idx:04d}.jpg"
                cv2.imwrite(str(output_path), cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR))
                processed_positives.append(output_path)
                
            except Exception as e:
                logger.error(f"Error processing positive image {image_path}: {e}")
        
        num_positives = len(processed_positives)
        logger.info(f"Processed {num_positives} positive face images")
        
        # Check minimum dataset requirements
        if num_positives < 2:
            raise ValueError(f"Need at least 2 valid faces for training, got {num_positives}")
        
        # Step 2: Sample and preprocess negative images (also with face detection)
        logger.info("Step 2: Sampling and preprocessing negative face images...")
        false_faces_path = Path("/app/data/false-faces")
        all_negatives = list(false_faces_path.glob("*"))
        
        # Sample 2x the number of positives
        num_negatives_needed = 2 * num_positives
        selected_negatives = random.sample(all_negatives, min(num_negatives_needed, len(all_negatives)))
        
        processed_negatives = []
        for idx, image_path in enumerate(selected_negatives):
            try:
                # Read and process similar to positives
                img = cv2.imread(str(image_path))
                if img is None:
                    continue
                
                # For negative samples, they might already be face crops
                # So try face detection first, fallback to simple resize if no face
                face_crop = detect_and_crop_face(img, target_size=(224, 224))
                
                if face_crop is None:
                    # Fallback: simple grayscale + resize
                    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                    rgb_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
                    face_crop = cv2.resize(rgb_img, (224, 224))
                
                output_path = processed_negatives_path / f"negative_{idx:04d}.jpg"
                cv2.imwrite(str(output_path), cv2.cvtColor(face_crop, cv2.COLOR_RGB2BGR))
                processed_negatives.append(output_path)
                
            except Exception as e:
                logger.error(f"Error processing negative image {image_path}: {e}")
        
        logger.info(f"Processed {len(processed_negatives)} negative face images")
        
        # Check we have enough negatives
        if len(processed_negatives) < 2:
            raise ValueError(f"Need at least 2 valid negative images for training, got {len(processed_negatives)}")
        
        # Step 3: Split into train/validation sets
        logger.info("Step 3: Creating train/validation splits...")
        
        # Shuffle and split positives (80/20 but ensure at least 1 in each split)
        random.shuffle(processed_positives)
        pos_split_idx = max(1, min(len(processed_positives) - 1, int(0.8 * len(processed_positives))))
        train_positives = processed_positives[:pos_split_idx]
        val_positives = processed_positives[pos_split_idx:]
        
        # Shuffle and split negatives (80/20 but ensure at least 1 in each split)
        random.shuffle(processed_negatives)
        neg_split_idx = max(1, min(len(processed_negatives) - 1, int(0.8 * len(processed_negatives))))
        train_negatives = processed_negatives[:neg_split_idx]
        val_negatives = processed_negatives[neg_split_idx:]
        
        # Create train/val directory structure
        train_pos_path = train_path / "positives"
        train_neg_path = train_path / "negatives"
        val_pos_path = val_path / "positives"
        val_neg_path = val_path / "negatives"
        
        for path in [train_pos_path, train_neg_path, val_pos_path, val_neg_path]:
            path.mkdir(parents=True, exist_ok=True)
        
        # Copy files to train/val directories
        for img_path in train_positives:
            shutil.copy2(img_path, train_pos_path / img_path.name)
        
        for img_path in train_negatives:
            shutil.copy2(img_path, train_neg_path / img_path.name)
            
        for img_path in val_positives:
            shutil.copy2(img_path, val_pos_path / img_path.name)
            
        for img_path in val_negatives:
            shutil.copy2(img_path, val_neg_path / img_path.name)
        
        logger.info(f"Train split - Positives: {len(train_positives)}, Negatives: {len(train_negatives)}")
        logger.info(f"Val split - Positives: {len(val_positives)}, Negatives: {len(val_negatives)}")
        
        # Step 4: Train the model
        logger.info("Step 4: Starting model training...")
        from src.train import train_model
        train_model(user_id)
        
        # Step 5: Cleanup temporary directories
        logger.info("Step 5: Cleaning up temporary files...")
        cleanup_training_files(user_id)
        
        # Update training status to completed
        user_path = Path(f"/app/data/users/{user_id}")
        status_file = user_path / "training_status.txt"
        if status_file.exists():
            with open(status_file, 'w') as f:
                f.write("training_completed")
        
        logger.info(f"Training completed successfully for user_id: {user_id}")
        
    except Exception as e:
        logger.error(f"Error in preprocessing and training for user_id {user_id}: {e}")
        
        # Update training status to failed
        try:
            user_path = Path(f"/app/data/users/{user_id}")
            status_file = user_path / "training_status.txt"
            if status_file.exists():
                with open(status_file, 'w') as f:
                    f.write("training_failed")
        except:
            pass
        
        raise


def cleanup_training_files(user_id: str):
    """Clean up temporary training files after successful training."""
    user_path = Path(f"/app/data/users/{user_id}")
    
    dirs_to_remove = [
        "raw_positives",
        "processed_positives", 
        "processed_negatives",
        "train",
        "val"
    ]
    
    for dir_name in dirs_to_remove:
        dir_path = user_path / dir_name
        if dir_path.exists():
            shutil.rmtree(dir_path)
            logger.info(f"Removed temporary directory: {dir_path}")


def model_exists(user_id: str) -> bool:
    """Check if a trained model exists for the given user_id in MinIO."""
    from src.minio_client import minio_client
    return minio_client.model_exists(user_id)


def preprocess_single_image(image_bytes: bytes) -> np.ndarray:
    """
    Preprocess a single image for inference, using MediaPipe face detection.
    
    Args:
        image_bytes: Raw image bytes
        
    Returns:
        Preprocessed image tensor ready for model inference
    """
    # Convert bytes to numpy array
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        raise ValueError("Could not decode image")
    
    # Detect and crop face using MediaPipe
    face_crop = detect_and_crop_face(img, target_size=(224, 224))
    
    if face_crop is None:
        # Fallback: simple preprocessing if no face detected
        logger.warning("No face detected, using fallback preprocessing")
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        rgb_img = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
        face_crop = cv2.resize(rgb_img, (224, 224))
    
    # Normalize to [0,1] and add batch dimension
    normalized = face_crop.astype(np.float32) / 255.0
    batched = np.expand_dims(normalized, axis=0)
    
    return batched


def generate_job_id() -> str:
    """Generate a unique job ID."""
    return str(uuid.uuid4())


def delete_temp_inference(user_id: str):
    """Delete any temporary inference files (placeholder for future use)."""
    # Currently no temporary files are created during inference,
    # but this function is provided for future extensibility
    pass 