import logging
import tensorflow as tf
from tensorflow.keras.applications import EfficientNetV2B3
from tensorflow.keras.layers import GlobalAveragePooling2D, Dense, Dropout
from tensorflow.keras.models import Sequential
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.losses import BinaryCrossentropy
from pathlib import Path
import tempfile
import os
from src.minio_client import minio_client

logger = logging.getLogger(__name__)

def create_model() -> tf.keras.Model:
    """
    Create the face authentication model architecture.
    Uses EfficientNetV2B3 as backbone with custom classification head.
    
    Returns:
        Compiled Keras model
    """
    # Load EfficientNetV2B3 without top layers, with ImageNet weights
    base_model = EfficientNetV2B3(
        input_shape=(224, 224, 3),
        include_top=False,
        weights='imagenet'
    )
    
    # Freeze base model layers for faster training
    base_model.trainable = False
    
    # Create classification head with dropout for better generalization
    model = Sequential([
        base_model,
        GlobalAveragePooling2D(),
        Dropout(0.2),
        Dense(256, activation='relu'),
        Dropout(0.1),
        Dense(1, activation='sigmoid')  # Binary classification
    ])
    
    # Compile model with slightly different learning rate for EfficientNet
    model.compile(
        optimizer=Adam(learning_rate=5e-5),  # Lower learning rate for EfficientNet
        loss=BinaryCrossentropy(),
        metrics=['accuracy']
    )
    
    return model


def train_model(user_id: str):
    """
    Train a face authentication model for the given user.
    
    Args:
        user_id: User identifier for the training job
    """
    try:
        logger.info(f"Starting model training for user_id: {user_id}")
        
        # Log GPU availability
        gpus = tf.config.list_physical_devices('GPU')
        if gpus:
            logger.info(f"🚀 GPU AVAILABLE: {len(gpus)} GPU(s) detected")
            for i, gpu in enumerate(gpus):
                logger.info(f"   GPU {i}: {gpu.name}")
        else:
            logger.warning("⚠️  NO GPU DETECTED - Training will use CPU")
        
        # Define paths
        user_path = Path(f"/app/data/users/{user_id}")
        train_path = user_path / "train"
        val_path = user_path / "val"
        
        # No need for local model directory anymore - using MinIO
        
        # Create datasets
        logger.info("Creating training and validation datasets...")
        
        # Count total samples to determine appropriate batch size
        train_samples = len(list((train_path / "positives").glob("*"))) + len(list((train_path / "negatives").glob("*")))
        val_samples = len(list((val_path / "positives").glob("*"))) + len(list((val_path / "negatives").glob("*")))
        
        # Validate minimum samples
        if train_samples < 4:
            raise ValueError(f"Need at least 4 training samples (2 per class), got {train_samples}")
        if val_samples < 2:
            raise ValueError(f"Need at least 2 validation samples (1 per class), got {val_samples}")
        
        # Use smaller batch size for small datasets, EfficientNet works well with smaller batches
        batch_size = min(4, train_samples, val_samples) if train_samples < 16 or val_samples < 16 else 8
        logger.info(f"Using batch_size: {batch_size} (train_samples: {train_samples}, val_samples: {val_samples})")
        
        # Training dataset
        train_ds = tf.keras.preprocessing.image_dataset_from_directory(
            str(train_path),
            class_names=['negatives', 'positives'],  # 0=negative, 1=positive
            image_size=(224, 224),
            batch_size=batch_size,
            label_mode='binary'
        )
        
        # Validation dataset
        val_ds = tf.keras.preprocessing.image_dataset_from_directory(
            str(val_path),
            class_names=['negatives', 'positives'],  # 0=negative, 1=positive
            image_size=(224, 224),
            batch_size=batch_size,
            label_mode='binary'
        )
        
        # Normalize pixel values to [0,1]
        def normalize_img(image, label):
            return tf.cast(image, tf.float32) / 255.0, label
        
        train_ds = train_ds.map(normalize_img)
        val_ds = val_ds.map(normalize_img)
        
        # Optimize dataset performance
        AUTOTUNE = tf.data.AUTOTUNE
        train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
        val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)
        
        # Create and compile model
        logger.info("Creating EfficientNetV2B3 model architecture...")
        model = create_model()
        
        # Print model summary (with error handling)
        try:
            logger.info("Model architecture:")
            model.summary(print_fn=lambda x: logger.info(x))
        except Exception as e:
            logger.warning(f"Could not print model summary: {e}")
            logger.info("EfficientNetV2B3 model created successfully despite summary error")
        
        # Train model with more epochs for EfficientNet
        logger.info("Starting training...")
        history = model.fit(
            train_ds,
            validation_data=val_ds,
            epochs=8,  # Increased epochs for better EfficientNet performance
            verbose=1
        )
        
        # Log training results
        final_train_acc = history.history['accuracy'][-1]
        final_val_acc = history.history['val_accuracy'][-1]
        final_train_loss = history.history['loss'][-1]
        final_val_loss = history.history['val_loss'][-1]
        
        logger.info(f"🎉 Training completed!")
        logger.info(f"Final training accuracy: {final_train_acc:.4f}")
        logger.info(f"Final validation accuracy: {final_val_acc:.4f}")
        logger.info(f"Final training loss: {final_train_loss:.4f}")
        logger.info(f"Final validation loss: {final_val_loss:.4f}")
        
        # Save model weights to temporary file (.weights.h5 format)
        temp_weights_file = tempfile.NamedTemporaryFile(delete=False, suffix='.weights.h5')
        temp_weights_path = temp_weights_file.name
        temp_weights_file.close()
        
        model.save_weights(temp_weights_path)
        logger.info(f"Model weights saved to temporary file: {temp_weights_path}")
        
        # Upload to MinIO
        upload_success = minio_client.upload_model(user_id, temp_weights_path)
        
        # Clean up temporary file
        os.unlink(temp_weights_path)
        
        if upload_success:
            logger.info(f"✅ EfficientNetV2B3 model training completed and uploaded successfully for user_id: {user_id}")
        else:
            raise Exception("Failed to upload model to MinIO")
        
    except Exception as e:
        logger.error(f"❌ Error during model training for user_id {user_id}: {e}")
        raise


def load_trained_model(user_id: str) -> tf.keras.Model:
    """
    Load a trained model for inference from MinIO.
    
    Args:
        user_id: User identifier
        
    Returns:
        Loaded Keras model ready for inference
    """
    # Download model weights from MinIO
    temp_weights_path = minio_client.download_model(user_id)
    
    if temp_weights_path is None:
        raise FileNotFoundError(f"Model not found for user_id: {user_id}")
    
    try:
        # Create model with same architecture
        model = create_model()
        
        # Build the model by calling it with dummy data
        # This ensures all layers are properly built before loading weights
        dummy_input = tf.zeros((1, 224, 224, 3))
        _ = model(dummy_input)
        
        # Load weights
        model.load_weights(temp_weights_path)
        logger.info(f"Model loaded successfully for user_id: {user_id}")
        
        # Clean up temporary file
        os.unlink(temp_weights_path)
        
        return model
        
    except Exception as e:
        # Clean up temporary file on error
        if os.path.exists(temp_weights_path):
            os.unlink(temp_weights_path)
        raise 