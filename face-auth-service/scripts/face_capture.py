
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

if __name__ == "__main__":
    logger.info("🎬 Face Capture Service initialized")
    capturer = FaceCapture()
    logger.info("✅ Ready for capture")