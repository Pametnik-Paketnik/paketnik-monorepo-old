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
    
    def resize_image(self, image, target_size=None):
        """Resize image to target size"""
        if target_size is None:
            target_size = self.target_size
        
        return cv2.resize(image, target_size, interpolation=cv2.INTER_AREA)

def main():
    parser = argparse.ArgumentParser(description="Face Image Preprocessing")
    parser.add_argument("--person", "-p", help="Person name to process")
    parser.add_argument("--list", "-l", action="store_true", help="List available people")
    
    args = parser.parse_args()
    
    try:
        preprocessor = FacePreprocessor()
    except Exception as e:
        logger.error(f"❌ Init failed: {e}")
        return 1
    
    if args.list:
        preprocessor.list_available_people()
        return 0
    
    logger.info("🎬 Basic preprocessing functions initialized")
    return 0

if __name__ == "__main__":
    exit(main())