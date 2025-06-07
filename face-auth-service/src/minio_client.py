import os
import logging
from minio import Minio
from minio.error import S3Error
from pathlib import Path
import tempfile
from typing import Optional

logger = logging.getLogger(__name__)

class MinIOClient:
    def __init__(self):
        """Initialize MinIO client with environment variables."""
        self.endpoint = os.getenv('MINIO_ENDPOINT', 'localhost')
        self.port = int(os.getenv('MINIO_PORT', '9000'))
        self.access_key = os.getenv('MINIO_ACCESS_KEY', 'minioadmin')
        self.secret_key = os.getenv('MINIO_SECRET_KEY', 'minioadmin')
        self.use_ssl = os.getenv('MINIO_USE_SSL', 'false').lower() == 'true'
        
        # Construct endpoint with port
        endpoint_with_port = f"{self.endpoint}:{self.port}"
        
        self.client = Minio(
            endpoint_with_port,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.use_ssl
        )
        
        self.bucket_name = "face-auth-models"
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Ensure the face-auth-models bucket exists."""
        try:
            if not self.client.bucket_exists(self.bucket_name):
                self.client.make_bucket(self.bucket_name)
                logger.info(f"Created MinIO bucket: {self.bucket_name}")
            else:
                logger.info(f"MinIO bucket {self.bucket_name} already exists")
        except S3Error as e:
            logger.error(f"Error creating/checking MinIO bucket: {e}")
            raise
    
    def upload_model(self, user_id: str, model_file_path: str) -> bool:
        """
        Upload a trained model to MinIO.
        
        Args:
            user_id: User identifier
            model_file_path: Local path to the model weights file
            
        Returns:
            True if upload successful, False otherwise
        """
        try:
            object_name = f"models/{user_id}/model.weights.h5"
            
            self.client.fput_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                file_path=model_file_path,
                content_type="application/octet-stream"
            )
            
            logger.info(f"Successfully uploaded model for user_id: {user_id}")
            return True
            
        except S3Error as e:
            logger.error(f"Error uploading model for user_id {user_id}: {e}")
            return False
    
    def download_model(self, user_id: str) -> Optional[str]:
        """
        Download a trained model from MinIO to a temporary file.
        
        Args:
            user_id: User identifier
            
        Returns:
            Path to temporary file containing the model weights, or None if not found
        """
        try:
            object_name = f"models/{user_id}/model.weights.h5"
            
            # Create temporary file
            temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.weights.h5')
            temp_path = temp_file.name
            temp_file.close()
            
            # Download model weights
            self.client.fget_object(
                bucket_name=self.bucket_name,
                object_name=object_name,
                file_path=temp_path
            )
            
            logger.info(f"Successfully downloaded model for user_id: {user_id}")
            return temp_path
            
        except S3Error as e:
            if e.code == 'NoSuchKey':
                logger.warning(f"Model not found for user_id: {user_id}")
            else:
                logger.error(f"Error downloading model for user_id {user_id}: {e}")
            return None
    
    def model_exists(self, user_id: str) -> bool:
        """
        Check if a model exists in MinIO for the given user.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if model exists, False otherwise
        """
        try:
            object_name = f"models/{user_id}/model.weights.h5"
            self.client.stat_object(self.bucket_name, object_name)
            return True
        except S3Error as e:
            if e.code == 'NoSuchKey':
                return False
            else:
                logger.error(f"Error checking model existence for user_id {user_id}: {e}")
                return False
    
    def delete_model(self, user_id: str) -> bool:
        """
        Delete a model from MinIO.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if deletion successful, False otherwise
        """
        try:
            object_name = f"models/{user_id}/model.weights.h5"
            self.client.remove_object(self.bucket_name, object_name)
            logger.info(f"Successfully deleted model for user_id: {user_id}")
            return True
        except S3Error as e:
            logger.error(f"Error deleting model for user_id {user_id}: {e}")
            return False

# Global MinIO client instance
minio_client = MinIOClient() 