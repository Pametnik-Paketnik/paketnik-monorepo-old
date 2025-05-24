#!/usr/bin/env python3
import cv2
import os
import sys
import argparse
import json
import numpy as np
from datetime import datetime
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FacePreprocessor:
    def __init__(self, data_root="data"):
        self.data_root = Path(data_root)
        self.raw_dir = self.data_root / "raw"
        self.processed_dir = self.data_root / "processed"
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        
        # Preprocessing parameters
        self.target_size = (224, 224)
        self.gaussian_kernel_size = (3, 3)
        self.bilateral_d = 9
        self.bilateral_sigma_color = 75
        self.bilateral_sigma_space = 75
        
        logger.info("✅ Face Preprocessor initialized")
    
    def list_available_people(self):
        """List people with raw data available"""
        people = []
        if self.raw_dir.exists():
            people = [d.name for d in self.raw_dir.iterdir() 
                     if d.is_dir() and any(d.glob("*.jpg")) or any(d.glob("*.png"))]
        
        if people:
            logger.info(f"📋 Available people for preprocessing: {', '.join(people)}")
        else:
            logger.info("📋 No people with image data found")
        return people
    
    def get_raw_image_count(self, person_name):
        """Get count of raw images for a person"""
        person_dir = self.raw_dir / person_name
        if not person_dir.exists():
            return 0
        
        image_files = list(person_dir.glob("*.jpg")) + list(person_dir.glob("*.png"))
        return len(image_files)
    
    def remove_noise_gaussian(self, image):
        """Remove noise using Gaussian filter"""
        return cv2.GaussianBlur(image, self.gaussian_kernel_size, 0)
    
    def remove_noise_bilateral(self, image):
        """Remove noise using bilateral filter (preserves edges)"""
        return cv2.bilateralFilter(image, self.bilateral_d, 
                                 self.bilateral_sigma_color, 
                                 self.bilateral_sigma_space)
    
    def remove_noise_median(self, image, kernel_size=5):
        """Remove noise using median filter"""
        return cv2.medianBlur(image, kernel_size)
    
    def remove_noise_morphological(self, image):
        """Remove noise using morphological operations"""
        # Create kernel for morphological operations
        kernel = np.ones((3, 3), np.uint8)
        
        # Opening (erosion followed by dilation) - removes small noise
        opened = cv2.morphologyEx(image, cv2.MORPH_OPEN, kernel)
        
        # Closing (dilation followed by erosion) - closes small gaps
        closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)
        
        return closed
    
    def convert_to_grayscale(self, image):
        """Convert image to grayscale"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image
    
    def convert_to_lab(self, image):
        """Convert image to LAB color space"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        return image
    
    def convert_to_hsv(self, image):
        """Convert image to HSV color space"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        return image
    
    def convert_to_yuv(self, image):
        """Convert image to YUV color space"""
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        return image
    
    def normalize_illumination(self, image):
        """Normalize illumination using histogram equalization"""
        if len(image.shape) == 3:
            # For color images, apply to each channel
            channels = cv2.split(image)
            equalized_channels = []
            for channel in channels:
                equalized = cv2.equalizeHist(channel)
                equalized_channels.append(equalized)
            return cv2.merge(equalized_channels)
        else:
            # For grayscale images
            return cv2.equalizeHist(image)
    
    def normalize_illumination_clahe(self, image, clip_limit=3.0, tile_grid_size=(8, 8)):
        """Normalize illumination using CLAHE (Contrast Limited Adaptive Histogram Equalization)"""
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)
        
        if len(image.shape) == 3:
            # For color images, convert to LAB and apply CLAHE only to L channel
            lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
            l, a, b = cv2.split(lab)
            l_clahe = clahe.apply(l)
            lab_clahe = cv2.merge([l_clahe, a, b])
            return cv2.cvtColor(lab_clahe, cv2.COLOR_LAB2BGR)
        else:
            # For grayscale images
            return clahe.apply(image)
    
    def white_balance_correction(self, image):
        """Apply automatic white balance correction"""
        if len(image.shape) != 3:
            return image
        
        # Calculate mean values for each channel
        mean_b = np.mean(image[:, :, 0])
        mean_g = np.mean(image[:, :, 1])
        mean_r = np.mean(image[:, :, 2])
        
        # Calculate gray world assumption
        gray_world = (mean_b + mean_g + mean_r) / 3
        
        # Calculate scaling factors
        scale_b = gray_world / mean_b if mean_b > 0 else 1.0
        scale_g = gray_world / mean_g if mean_g > 0 else 1.0
        scale_r = gray_world / mean_r if mean_r > 0 else 1.0
        
        # Apply scaling with clipping
        result = image.copy().astype(np.float32)
        result[:, :, 0] = np.clip(result[:, :, 0] * scale_b, 0, 255)
        result[:, :, 1] = np.clip(result[:, :, 1] * scale_g, 0, 255)
        result[:, :, 2] = np.clip(result[:, :, 2] * scale_r, 0, 255)
        
        return result.astype(np.uint8)
    
    def face_detection_crop(self, image):
        """Detect face and crop to face region with padding"""
        # Load OpenCV's face detector
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
        
        if len(image.shape) == 3:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        else:
            gray = image
        
        # Detect faces
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))
        
        if len(faces) > 0:
            # Take the largest face
            largest_face = max(faces, key=lambda face: face[2] * face[3])
            x, y, w, h = largest_face
            
            # Add padding
            padding = 30
            x1 = max(0, x - padding)
            y1 = max(0, y - padding)
            x2 = min(image.shape[1], x + w + padding)
            y2 = min(image.shape[0], y + h + padding)
            
            # Crop the face region
            if len(image.shape) == 3:
                return image[y1:y2, x1:x2]
            else:
                return image[y1:y2, x1:x2]
        
        # If no face detected, return original image
        return image
    
    def skin_tone_normalization(self, image):
        """Normalize skin tones using color correction"""
        if len(image.shape) != 3:
            return image
        
        # Convert to YUV color space for skin tone adjustment
        yuv = cv2.cvtColor(image, cv2.COLOR_BGR2YUV)
        
        # Apply slight adjustments to U and V channels to normalize skin tones
        yuv[:, :, 1] = cv2.multiply(yuv[:, :, 1], 0.95)  # Reduce U slightly
        yuv[:, :, 2] = cv2.multiply(yuv[:, :, 2], 0.98)  # Reduce V slightly
        
        # Convert back to BGR
        return cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
        """Apply gamma correction for grayscale linearization"""
        if len(image.shape) == 3:
            # Convert to grayscale first
            gray = self.convert_to_grayscale(image)
        else:
            gray = image.copy()
        
        # Normalize to 0-1 range
        normalized = gray.astype(np.float32) / 255.0
        
        # Apply gamma correction (gamma = 2.2 for standard linearization)
        gamma = 2.2
        linearized = np.power(normalized, gamma)
        
        # Convert back to 0-255 range
        result = (linearized * 255).astype(np.uint8)
        
        return result
    
    def apply_gamma_correction(self, image, gamma=1.0):
        """Apply gamma correction to the image"""
        # Build a lookup table mapping pixel values [0, 255] to their adjusted gamma values
        inv_gamma = 1.0 / gamma
        table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
        
        # Apply gamma correction using the lookup table
        return cv2.LUT(image, table)
    
    def enhance_contrast(self, image, alpha=1.0, beta=0):
        """Enhance contrast using linear transformation: output = alpha * input + beta"""
        return cv2.convertScaleAbs(image, alpha=alpha, beta=beta)
    
    def resize_image(self, image, target_size=None):
        """Resize image to target size"""
        if target_size is None:
            target_size = self.target_size
        
        return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)
    
    def preprocess_single_image(self, image_path, processing_config=None):
        """Preprocess a single image with specified configuration"""
        if processing_config is None:
            processing_config = {
                'face_detection_crop': True,
                'white_balance_correction': True,
                'noise_removal': 'bilateral',
                'color_space': 'rgb',
                'skin_tone_normalization': True,
                'illumination_normalization': True,
                'use_clahe': True,
                'grayscale_linearization': False,
                'gamma_correction': 1.1,
                'contrast_enhancement': {'alpha': 1.15, 'beta': 8}
            }
        
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            logger.error(f"❌ Failed to load image: {image_path}")
            return None
        
        logger.debug(f"📷 Processing: {image_path.name}")
        
        # Step 0: Face detection and cropping (optional)
        if processing_config.get('face_detection_crop'):
            try:
                image = self.face_detection_crop(image)
                logger.debug("   ✓ Face detected and cropped")
            except Exception as e:
                logger.debug(f"   ⚠️ Face detection failed: {e}")
        
        # Step 1: White balance correction (optional)
        if processing_config.get('white_balance_correction'):
            image = self.white_balance_correction(image)
            logger.debug("   ✓ White balance corrected")
        
        # Step 2: Noise removal
        # Step 2: Noise removal
        if processing_config.get('noise_removal'):
            noise_method = processing_config['noise_removal']
            if noise_method == 'gaussian':
                image = self.remove_noise_gaussian(image)
            elif noise_method == 'bilateral':
                image = self.remove_noise_bilateral(image)
            elif noise_method == 'median':
                image = self.remove_noise_median(image)
            elif noise_method == 'morphological':
                image = self.remove_noise_morphological(image)
            logger.debug(f"   ✓ Noise removal: {noise_method}")
        
        # Step 3: Skin tone normalization (before color space conversion)
        if processing_config.get('skin_tone_normalization'):
            image = self.skin_tone_normalization(image)
            logger.debug("   ✓ Skin tone normalized")
        
        # Step 4: Color space conversion
        # Step 4: Color space conversion
        color_space = processing_config.get('color_space', 'rgb')
        if color_space == 'grayscale':
            image = self.convert_to_grayscale(image)
        elif color_space == 'lab':
            image = self.convert_to_lab(image)
        elif color_space == 'hsv':
            image = self.convert_to_hsv(image)
        elif color_space == 'yuv':
            image = self.convert_to_yuv(image)
        # 'rgb' remains as is
        logger.debug(f"   ✓ Color space: {color_space}")
        
        # Step 5: Illumination normalization
        if processing_config.get('illumination_normalization'):
            if processing_config.get('use_clahe', True):
                image = self.normalize_illumination_clahe(image)
                logger.debug("   ✓ Illumination normalized (CLAHE)")
            else:
                image = self.normalize_illumination(image)
                logger.debug("   ✓ Illumination normalized (Histogram Equalization)")
        
        # Step 4: Grayscale linearization
        if processing_config.get('grayscale_linearization'):
            image = self.linearize_grayscale(image)
            logger.debug("   ✓ Grayscale linearized")
        
        # Step 5: Gamma correction
        gamma = processing_config.get('gamma_correction', 1.0)
        if gamma != 1.0:
            image = self.apply_gamma_correction(image, gamma)
            logger.debug(f"   ✓ Gamma correction: {gamma}")
        
        # Step 6: Contrast enhancement
        if processing_config.get('contrast_enhancement'):
            contrast_params = processing_config['contrast_enhancement']
            alpha = contrast_params.get('alpha', 1.0)
            beta = contrast_params.get('beta', 0)
            if alpha != 1.0 or beta != 0:
                image = self.enhance_contrast(image, alpha, beta)
                logger.debug(f"   ✓ Contrast enhanced: α={alpha}, β={beta}")
        
        # Step 7: Resize to target size
        image = self.resize_image(image)
        logger.debug(f"   ✓ Resized to {self.target_size}")
        
        return image
    
    def process_person_images(self, person_name, processing_config=None, overwrite=False):
        """Process all images for a specific person"""
        person_raw_dir = self.raw_dir / person_name
        person_processed_dir = self.processed_dir / person_name
        
        if not person_raw_dir.exists():
            logger.error(f"❌ Raw data directory not found: {person_raw_dir}")
            return False
        
        # Create processed directory
        person_processed_dir.mkdir(exist_ok=True)
        
        # Get all image files
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
        image_files = []
        for ext in image_extensions:
            image_files.extend(person_raw_dir.glob(ext))
            image_files.extend(person_raw_dir.glob(ext.upper()))
        
        if not image_files:
            logger.error(f"❌ No image files found in: {person_raw_dir}")
            return False
        
        logger.info(f"🔄 Processing {len(image_files)} images for '{person_name}'")
        logger.info(f"📁 Input: {person_raw_dir}")
        logger.info(f"📁 Output: {person_processed_dir}")
        
        processed_count = 0
        failed_count = 0
        
        for image_file in image_files:
            try:
                # Check if already processed
                output_filename = image_file.stem + '_processed.jpg'
                output_path = person_processed_dir / output_filename
                
                if output_path.exists() and not overwrite:
                    logger.debug(f"⏭️ Skipping (already exists): {output_filename}")
                    continue
                
                # Process image
                processed_image = self.preprocess_single_image(image_file, processing_config)
                
                if processed_image is not None:
                    # Save processed image
                    cv2.imwrite(str(output_path), processed_image)
                    processed_count += 1
                    logger.debug(f"✅ Processed: {image_file.name} -> {output_filename}")
                else:
                    failed_count += 1
                    logger.error(f"❌ Failed to process: {image_file.name}")
                    
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Error processing {image_file.name}: {e}")
        
        # Save processing metadata
        self._save_processing_metadata(person_name, processing_config, processed_count, failed_count)
        
        logger.info(f"✅ Processing completed for '{person_name}':")
        logger.info(f"   📸 Successfully processed: {processed_count}")
        logger.info(f"   ❌ Failed: {failed_count}")
        
        return processed_count > 0
    
    def _save_processing_metadata(self, person_name, processing_config, processed_count, failed_count):
        """Save processing metadata"""
        person_processed_dir = self.processed_dir / person_name
        metadata_file = person_processed_dir / "preprocessing_metadata.json"
        
        metadata = {
            "person_name": person_name,
            "processing_timestamp": datetime.now().isoformat(),
            "processing_config": processing_config,
            "images_processed": processed_count,
            "images_failed": failed_count,
            "target_size": self.target_size,
            "preprocessing_version": "1.0"
        }
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.debug(f"📝 Metadata saved: {metadata_file}")
    
    def get_processing_configs(self):
        """Get predefined processing configurations"""
        configs = {
            'optimal': {
                'name': 'Optimal Face Processing',
                'description': 'Optimized for portrait face images with varying lighting',
                'config': {
                    'face_detection_crop': True,
                    'white_balance_correction': True,
                    'noise_removal': 'bilateral',
                    'color_space': 'rgb',
                    'skin_tone_normalization': True,
                    'illumination_normalization': True,
                    'use_clahe': True,
                    'grayscale_linearization': False,
                    'gamma_correction': 1.1,
                    'contrast_enhancement': {'alpha': 1.15, 'beta': 8}
                }
            },
            'standard': {
                'name': 'Standard Processing',
                'description': 'Balanced preprocessing for general face recognition',
                'config': {
                    'face_detection_crop': False,
                    'white_balance_correction': False,
                    'noise_removal': 'bilateral',
                    'color_space': 'rgb',
                    'skin_tone_normalization': False,
                    'illumination_normalization': True,
                    'use_clahe': True,
                    'grayscale_linearization': False,
                    'gamma_correction': 1.0,
                    'contrast_enhancement': {'alpha': 1.1, 'beta': 5}
                }
            },
            'grayscale': {
                'name': 'Grayscale Processing',
                'description': 'Convert to grayscale with linearization',
                'config': {
                    'face_detection_crop': True,
                    'white_balance_correction': False,
                    'noise_removal': 'bilateral',
                    'color_space': 'grayscale',
                    'skin_tone_normalization': False,
                    'illumination_normalization': True,
                    'use_clahe': True,
                    'grayscale_linearization': True,
                    'gamma_correction': 1.2,
                    'contrast_enhancement': {'alpha': 1.2, 'beta': 0}
                }
            },
            'high_contrast': {
                'name': 'High Contrast Processing',
                'description': 'Enhanced contrast for difficult lighting conditions',
                'config': {
                    'face_detection_crop': True,
                    'white_balance_correction': True,
                    'noise_removal': 'bilateral',
                    'color_space': 'rgb',
                    'skin_tone_normalization': True,
                    'illumination_normalization': True,
                    'use_clahe': True,
                    'grayscale_linearization': False,
                    'gamma_correction': 0.9,
                    'contrast_enhancement': {'alpha': 1.4, 'beta': 12}
                }
            },
            'minimal': {
                'name': 'Minimal Processing',
                'description': 'Light preprocessing - only essential steps',
                'config': {
                    'face_detection_crop': False,
                    'white_balance_correction': False,
                    'noise_removal': 'gaussian',
                    'color_space': 'rgb',
                    'skin_tone_normalization': False,
                    'illumination_normalization': True,
                    'use_clahe': False,
                    'grayscale_linearization': False,
                    'gamma_correction': 1.0,
                    'contrast_enhancement': None
                }
            }
        }
        return configs
    
    def show_processing_configs(self):
        """Display available processing configurations"""
        configs = self.get_processing_configs()
        
        logger.info("📋 Available processing configurations:")
        for key, config in configs.items():
            logger.info(f"   🔧 {key}: {config['name']}")
            logger.info(f"      {config['description']}")
        logger.info("")

def main():
    parser = argparse.ArgumentParser(description="Face Image Preprocessing")
    parser.add_argument("--person", "-p", help="Person name to process")
    parser.add_argument("--config", "-c", default="optimal", 
                       help="Processing configuration (optimal, standard, grayscale, high_contrast, minimal)")
    parser.add_argument("--list", "-l", action="store_true", help="List available people")
    parser.add_argument("--configs", action="store_true", help="Show processing configurations")
    parser.add_argument("--overwrite", "-o", action="store_true", help="Overwrite existing processed images")
    parser.add_argument("--all", "-a", action="store_true", help="Process all available people")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        preprocessor = FacePreprocessor()
    except Exception as e:
        logger.error(f"❌ Init failed: {e}")
        return 1
    
    if args.list:
        preprocessor.list_available_people()
        return 0
    
    if args.configs:
        preprocessor.show_processing_configs()
        return 0
    
    # Get processing configuration
    configs = preprocessor.get_processing_configs()
    if args.config not in configs:
        logger.error(f"❌ Unknown configuration: {args.config}")
        logger.info(f"   Available: {', '.join(configs.keys())}")
        return 1
    
    processing_config = configs[args.config]['config']
    logger.info(f"🔧 Using configuration: {args.config} - {configs[args.config]['name']}")
    
    if args.all:
        # Process all available people
        people = preprocessor.list_available_people()
        if not people:
            logger.error("❌ No people found to process")
            return 1
        
        success_count = 0
        for person in people:
            logger.info(f"\n🔄 Processing person: {person}")
            if preprocessor.process_person_images(person, processing_config, args.overwrite):
                success_count += 1
        
        logger.info(f"\n🎉 Completed processing for {success_count}/{len(people)} people")
        return 0
    
    if not args.person:
        logger.error("❌ Person name required!")
        logger.info("📖 Usage:")
        logger.info("   python face_preprocessing.py --person 'name' [--config standard]")
        logger.info("   python face_preprocessing.py --all [--config standard]")
        logger.info("   python face_preprocessing.py --list")
        logger.info("   python face_preprocessing.py --configs")
        return 1
    
    # Check if person exists
    raw_count = preprocessor.get_raw_image_count(args.person)
    if raw_count == 0:
        logger.error(f"❌ No raw images found for person: {args.person}")
        logger.info("💡 Use --list to see available people")
        return 1
    
    logger.info(f"🎬 Starting preprocessing for '{args.person}'")
    logger.info(f"📸 Found {raw_count} raw images")
    print()
    
    success = preprocessor.process_person_images(
        person_name=args.person,
        processing_config=processing_config,
        overwrite=args.overwrite
    )
    
    if success:
        logger.info("🎉 Preprocessing completed successfully!")
        return 0
    else:
        logger.error("❌ Preprocessing failed")
        return 1

if __name__ == "__main__":
    exit(main())