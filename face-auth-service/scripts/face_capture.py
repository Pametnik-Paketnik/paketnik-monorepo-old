#!/usr/bin/env python3
"""
Face Capture Script for Face Auth Service
Captures face images and saves them to raw data directory
"""

import cv2
import os
import sys
import argparse
import json
from datetime import datetime
from pathlib import Path
import logging

sys.path.append(str(Path(__file__).parent.parent))

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FaceCapture:
    def __init__(self, data_root="data"):
        self.data_root = Path(data_root)
        self.raw_dir = self.data_root / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            logger.info("✅ Face detector initialized successfully")
        except Exception as e:
            logger.error(f"❌ Failed to initialize face detector: {e}")
            raise
    
    def list_people(self):
        people = []
        if self.raw_dir.exists():
            people = [d.name for d in self.raw_dir.iterdir() if d.is_dir()]
        
        if people:
            logger.info(f"📋 Existing people in dataset: {', '.join(people)}")
        else:
            logger.info("📋 No people found in dataset")
        
        return people
    
    def get_person_stats(self, person_name):
        person_dir = self.raw_dir / person_name
        if not person_dir.exists():
            return 0
        
        image_files = list(person_dir.glob("*.jpg")) + list(person_dir.glob("*.png"))
        return len(image_files)
    
    def _show_statistics(self, person_name):
        total_images = self.get_person_stats(person_name)
        logger.info(f"📊 Statistics for {person_name}: {total_images} total images")

if __name__ == "__main__":
    logger.info("🎬 Face Capture Service initialized")
    capturer = FaceCapture()
    capturer.list_people()
    capturer._show_statistics("jakob")
    logger.info("✅ Ready for capture")