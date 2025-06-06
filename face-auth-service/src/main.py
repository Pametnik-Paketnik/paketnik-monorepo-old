from fastapi import FastAPI, File, UploadFile, Form, BackgroundTasks, HTTPException, Header
from typing import List, Optional
import logging
import sys
import os
import shutil
from datetime import datetime
from pathlib import Path
import time

# Import our custom modules
from src.utils import (
    preprocess_and_train, 
    model_exists, 
    delete_temp_inference, 
    generate_job_id,
    preprocess_single_image
)
from src.train import load_trained_model

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Face Auth Service", 
    description="Internal service for face authentication",
    version="1.0.0"
)

# CORS removed - service is internal only

@app.on_event("startup")
async def startup_event():
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info("=" * 50)
    logger.info(f"🚀 Face Auth Service starting up at {current_time}")
    logger.info("=" * 50)
    
    # Ensure data directories exist
    Path("/app/data/users").mkdir(parents=True, exist_ok=True)
    logger.info("Created data directories")
    
    # Initialize MinIO connection
    try:
        from src.minio_client import minio_client
        logger.info("✅ MinIO client initialized successfully")
    except Exception as e:
        logger.error(f"❌ Failed to initialize MinIO client: {e}")

@app.get("/")
async def root():
    return {"message": "Face Auth Service - Internal API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/register")
async def register_face(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Register a new user by training a model on their face images.
    User ID is passed via X-User-ID header from backend service.
    
    Args:
        files: List of face image files (typically ~60 images)
        x_user_id: User ID from header (set by backend service)
        
    Returns:
        JSON with user_id and status
    """
    try:
        logger.info(f"Received registration request for user_id: {x_user_id} with {len(files)} files")
        
        # Check if user already has a trained model
        if model_exists(x_user_id):
            logger.warning(f"Model already exists for user_id: {x_user_id}")
            return {
                "user_id": x_user_id,
                "status": "model_already_exists",
                "message": "User already has a trained model. Use DELETE to remove it first."
            }
        
        # Create user directory structure
        user_path = Path(f"/app/data/users/{x_user_id}")
        raw_positives_path = user_path / "raw_positives"
        raw_positives_path.mkdir(parents=True, exist_ok=True)
        
        # Save uploaded files
        saved_files = 0
        for i, file in enumerate(files):
            if file.content_type and file.content_type.startswith('image/'):
                file_path = raw_positives_path / f"image_{i:04d}_{file.filename}"
                
                # Read and save file
                content = await file.read()
                with open(file_path, 'wb') as f:
                    f.write(content)
                saved_files += 1
            else:
                logger.warning(f"Skipping non-image file: {file.filename}")
        
        logger.info(f"Saved {saved_files} images for user_id: {x_user_id}")
        
        if saved_files == 0:
            raise HTTPException(status_code=400, detail="No valid image files provided")
        
        if saved_files < 10:
            logger.warning(f"Only {saved_files} images provided. For better accuracy, consider providing 20-60 face images.")
        
        # Create training status file
        status_file = user_path / "training_status.txt"
        with open(status_file, 'w') as f:
            f.write("training_in_progress")
        
        # Start background training
        background_tasks.add_task(preprocess_and_train, x_user_id)
        
        return {
            "user_id": x_user_id,
            "status": "training_started",
            "images_received": saved_files,
            "message": "Training started in background. Use /status to check progress."
        }
        
    except Exception as e:
        logger.error(f"Error in user registration: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/verify")
async def verify_face(
    file: UploadFile = File(...),
    x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Authenticate a user by comparing their face image against their trained model.
    User ID is passed via X-User-ID header from backend service.
    
    Args:
        file: Single face image file
        x_user_id: User ID from header (set by backend service)
        
    Returns:
        JSON with authentication result and probability
    """
    try:
        logger.info(f"Login attempt for user_id: {x_user_id}")
        
        # Check if model exists
        if not model_exists(x_user_id):
            logger.warning(f"Model not found for user_id: {x_user_id}")
            raise HTTPException(status_code=404, detail="Model not found. Please register first or wait for training to complete.")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read and preprocess image
        image_bytes = await file.read()
        preprocessed_image = preprocess_single_image(image_bytes)
        
        # Load trained model
        model = load_trained_model(x_user_id)
        
        # Run inference
        predictions = model.predict(preprocessed_image, verbose=0)
        probability = float(predictions[0][0])  # Extract scalar probability
        
        # Determine authentication result
        authenticated = probability > 0.5
        
        logger.info(f"Authentication result for user_id {x_user_id}: {authenticated} (probability: {probability:.4f})")
        
        # Cleanup (placeholder for future temp files)
        delete_temp_inference(x_user_id)
        
        return {
            "user_id": x_user_id,
            "authenticated": authenticated,
            "probability": probability
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in user login: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/status")
async def check_status(
    x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Check the training status for a user.
    User ID is passed via X-User-ID header from backend service.
    
    Args:
        x_user_id: User ID from header (set by backend service)
        
    Returns:
        JSON with training status
    """
    try:
        user_path = Path(f"/app/data/users/{x_user_id}")
        status_file = user_path / "training_status.txt"
        
        # Check if model exists in MinIO
        if model_exists(x_user_id):
            return {
                "user_id": x_user_id,
                "status": "training_completed",
                "model_ready": True,
                "message": "Model training completed successfully. User can now login."
            }
        
        # Check if training is in progress
        if status_file.exists():
            with open(status_file, 'r') as f:
                status = f.read().strip()
            
            if status == "training_in_progress":
                return {
                    "user_id": x_user_id,
                    "status": "training_in_progress",
                    "model_ready": False,
                    "message": "Training is still in progress. Please wait."
                }
        
        # User not found
        return {
            "user_id": x_user_id,
            "status": "user_not_found",
            "model_ready": False,
            "message": "User not found. Please register first."
        }
        
    except Exception as e:
        logger.error(f"Error checking status for user_id {x_user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/delete")
async def delete_user(
    x_user_id: str = Header(..., alias="X-User-ID")
):
    """
    Delete a user's trained model and data.
    User ID is passed via X-User-ID header from backend service.
    
    Args:
        x_user_id: User ID from header (set by backend service)
        
    Returns:
        JSON with deletion status
    """
    try:
        logger.info(f"Delete request for user_id: {x_user_id}")
        
        # Delete model from MinIO
        from src.minio_client import minio_client
        model_deleted = minio_client.delete_model(x_user_id)
        
        # Delete local user data
        user_path = Path(f"/app/data/users/{x_user_id}")
        local_deleted = False
        if user_path.exists():
            shutil.rmtree(user_path)
            local_deleted = True
            logger.info(f"Deleted local data for user_id: {x_user_id}")
        
        if model_deleted or local_deleted:
            return {
                "user_id": x_user_id,
                "status": "deleted",
                "model_deleted": model_deleted,
                "local_data_deleted": local_deleted,
                "message": "User data deleted successfully."
            }
        else:
            return {
                "user_id": x_user_id,
                "status": "not_found",
                "model_deleted": False,
                "local_data_deleted": False,
                "message": "User not found or already deleted."
            }
        
    except Exception as e:
        logger.error(f"Error deleting user_id {x_user_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/gpu-test")
async def gpu_test():
    """Test GPU availability and performance."""
    try:
        import tensorflow as tf
        
        # Check GPU availability
        gpu_available = tf.config.list_physical_devices('GPU')
        gpu_count = len(gpu_available)
        
        if gpu_count > 0:
            # Test GPU computation
            with tf.device('/GPU:0'):
                # Create a simple computation to test GPU
                a = tf.random.normal([1000, 1000])
                b = tf.random.normal([1000, 1000])
                start_time = time.time()
                c = tf.matmul(a, b)
                gpu_time = time.time() - start_time
                
            # Test CPU computation for comparison
            with tf.device('/CPU:0'):
                start_time = time.time()
                c_cpu = tf.matmul(a, b)
                cpu_time = time.time() - start_time
                
            return {
                "gpu_available": True,
                "gpu_count": gpu_count,
                "gpu_devices": [device.name for device in gpu_available],
                "gpu_computation_time": f"{gpu_time:.4f}s",
                "cpu_computation_time": f"{cpu_time:.4f}s",
                "speedup": f"{cpu_time/gpu_time:.2f}x" if gpu_time > 0 else "N/A",
                "tensorflow_version": tf.__version__
            }
        else:
            return {
                "gpu_available": False,
                "gpu_count": 0,
                "message": "No GPU devices found",
                "tensorflow_version": tf.__version__
            }
            
    except Exception as e:
        return {
            "error": str(e),
            "gpu_available": False
        }

if __name__ == "__main__":
    logger.info("Starting server...")