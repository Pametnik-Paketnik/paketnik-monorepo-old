#!/usr/bin/env python3
"""
Face Capture Script with GUI Tracking
Shows live tracking rectangles like original main.py, press SPACE to capture
"""

import cv2
import os
import sys
import argparse
import json
import time
import numpy as np
from datetime import datetime
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def doloci_barvo_koze(slika, levo_zgoraj, desno_spodaj):
    """Determine skin color from ROI"""
    roi = slika[levo_zgoraj[1]:desno_spodaj[1], levo_zgoraj[0]:desno_spodaj[0]]
    spodnja_meja = np.percentile(roi, 20, axis=(0, 1))
    zgornja_meja = np.percentile(roi, 80, axis=(0, 1))
    return np.array(spodnja_meja, dtype=np.uint8), np.array(zgornja_meja, dtype=np.uint8)

def obdelaj_sliko_s_skatlami(slika, sirina_skatle, visina_skatle, barva_koze):
    """Process image with sliding window approach"""
    visina, sirina, _ = slika.shape
    najdeni_obrazi = []
    
    maska = cv2.inRange(slika, barva_koze[0], barva_koze[1])
    
    kernel = np.ones((3, 3), np.uint8)
    maska = cv2.morphologyEx(maska, cv2.MORPH_OPEN, kernel)
    maska = cv2.morphologyEx(maska, cv2.MORPH_CLOSE, kernel)
    
    for y in range(0, visina - visina_skatle, visina_skatle // 4):
        for x in range(0, sirina - sirina_skatle, sirina_skatle // 4):
            okno_maska = maska[y:y + visina_skatle, x:x + sirina_skatle]
            st_pikslov = cv2.countNonZero(okno_maska)
            razmerje_pikslov = st_pikslov / (sirina_skatle * visina_skatle)
            
            if razmerje_pikslov > 0.5:
                nov_obraz = True
                for (fx, fy), (fx2, fy2) in najdeni_obrazi:
                    if (x < fx2 and x + sirina_skatle > fx and y < fy2 and y + visina_skatle > fy):
                        prekrivanje_x = min(x + sirina_skatle, fx2) - max(x, fx)
                        prekrivanje_y = min(y + visina_skatle, fy2) - max(y, fy)
                        prekrivanje = prekrivanje_x * prekrivanje_y
                        velikost_skatle = sirina_skatle * visina_skatle
                        
                        if prekrivanje / velikost_skatle > 0.5:
                            nov_obraz = False
                            break
                
                if nov_obraz:
                    najdeni_obrazi.append(((x, y), (x + sirina_skatle, y + visina_skatle)))
    
    return najdeni_obrazi

def zdruzi_prekrivanja(kandidati_obrazov):
    najdeni_obrazi = []
    
    while kandidati_obrazov:
        current_box = list(kandidati_obrazov[0])
        kandidati_obrazov.pop(0)
        
        merged = True
        while merged:
            merged = False
            i = 0
            while i < len(kandidati_obrazov):
                box = kandidati_obrazov[i]
                
                x_overlap = (current_box[0] < box[2] and current_box[2] > box[0])
                y_overlap = (current_box[1] < box[3] and current_box[3] > box[1])
                
                if x_overlap and y_overlap:
                    current_box[0] = min(current_box[0], box[0])
                    current_box[1] = min(current_box[1], box[1])
                    current_box[2] = max(current_box[2], box[2])
                    current_box[3] = max(current_box[3], box[3])
                    
                    kandidati_obrazov.pop(i)
                    merged = True
                else:
                    i += 1
        
        najdeni_obrazi.append(((current_box[0], current_box[1]), (current_box[2], current_box[3])))
    
    return najdeni_obrazi

def zmanjsaj_sliko(slika, sirina, visina):
    return cv2.resize(slika, (sirina, visina), interpolation=cv2.INTER_AREA)

class FaceCaptureGUI:
    def __init__(self, data_root="data"):
        self.data_root = Path(data_root)
        self.raw_dir = self.data_root / "raw"
        self.raw_dir.mkdir(parents=True, exist_ok=True)

        self.skin_color = None
        self.box_width = 64
        self.box_height = 48
        self.calibrated = False

        self.person_name = None
        self.person_dir = None
        self.session_label = "default"
        self.captured_count = 0
        self.target_images = 5
        
        self.fps_buffer = []
        
        logger.info("✅ GUI Face Capture initialized")
    
    def list_people(self):
        people = []
        if self.raw_dir.exists():
            people = [d.name for d in self.raw_dir.iterdir() if d.is_dir()]
        
        if people:
            logger.info(f"📋 Existing people: {', '.join(people)}")
        else:
            logger.info("📋 No people found")
        return people
    
    def get_person_stats(self, person_name):
        person_dir = self.raw_dir / person_name
        if not person_dir.exists():
            return 0
        
        metadata_file = person_dir / "capture_sessions.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                return data.get("total_images", 0)
            except:
                pass
        
        image_files = list(person_dir.glob("*.jpg")) + list(person_dir.glob("*.png"))
        return len(image_files)
    
    def show_detailed_stats(self, person_name):
        person_dir = self.raw_dir / person_name
        if not person_dir.exists():
            logger.info(f"📊 {person_name}: Person not found")
            return
        
        metadata_file = person_dir / "capture_sessions.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                
                logger.info(f"📊 Statistics for {person_name}:")
                logger.info(f"   Total sessions: {data.get('total_sessions', 0)}")
                logger.info(f"   Total images: {data.get('total_images', 0)}")
                logger.info(f"   Last updated: {data.get('last_updated', 'Unknown')}")
                
                if data.get('sessions'):
                    logger.info("   Recent sessions:")
                    for session in data['sessions'][-3:]:
                        logger.info(f"     - {session['session_label']}: {session['images_captured']} images ({session['timestamp'][:10]})")
                return
            except:
                pass
        
        total_images = self.get_person_stats(person_name)
        logger.info(f"📊 {person_name}: {total_images} images (no session data)")
    
    def _save_face_image(self, frame, face_coords, count):
        """Save detected face as image"""
        x1, y1, x2, y2 = face_coords
        
        padding = 20
        y1_pad = max(0, y1 - padding)
        y2_pad = min(frame.shape[0], y2 + padding)
        x1_pad = max(0, x1 - padding)
        x2_pad = min(frame.shape[1], x2 + padding)
        
        face_img = frame[y1_pad:y2_pad, x1_pad:x2_pad]
        
        if face_img.size == 0:
            return None
        
        face_resized = cv2.resize(face_img, (224, 224))

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[:-3]
        filename = f"{self.person_name}_{count:04d}_{timestamp}.jpg"
        filepath = self.person_dir / filename
        
        cv2.imwrite(str(filepath), face_resized)
        return filepath
    
    def _append_session_metadata(self, image_count):
        """Append session metadata"""
        metadata_file = self.person_dir / "capture_sessions.json"
        
        new_session = {
            "session_id": f"{self.session_label}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            "session_label": self.session_label,
            "timestamp": datetime.now().isoformat(),
            "images_captured": image_count,
            "image_size": "224x224",
            "format": "jpg",
            "detection_method": "custom_skin_gui"
        }
        
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
            except:
                data = {"person_name": self.person_name, "sessions": []}
        else:
            data = {"person_name": self.person_name, "sessions": []}
        
        data["sessions"].append(new_session)
        data["total_sessions"] = len(data["sessions"])
        data["total_images"] = sum(session.get("images_captured", 0) for session in data["sessions"])
        data["last_updated"] = datetime.now().isoformat()
        
        with open(metadata_file, 'w') as f:
            json.dump(data, f, indent=2)
        
        logger.info(f"📝 Session '{self.session_label}' saved")
    
    def calibrate_skin_color(self, cap):
        """Calibrate skin color with GUI - based on original main.py"""
        logger.info("🎨 Starting skin color calibration...")
        logger.info("   Position your face in the RED rectangle and press 'C'")
        logger.info("   Press 'Q' to quit calibration")
        
        cv2.namedWindow('Skin Color Calibration')
        
        while True:
            ret, frame = cap.read()
            if not ret:
                logger.error("❌ Failed to read from camera")
                cv2.destroyWindow('Skin Color Calibration')
                return False
            
            frame = zmanjsaj_sliko(frame, 640, 480)
            
            cv2.rectangle(frame, (200, 150), (400, 350), (0, 0, 255), 3)
            
            cv2.putText(frame, "Position face in RED rectangle", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
            cv2.putText(frame, "Press 'C' to calibrate skin color", 
                       (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            cv2.putText(frame, "Press 'Q' to quit", 
                       (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
            
            cv2.imshow('Skin Color Calibration', frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == ord('c') or key == ord('C'):
                self.skin_color = doloci_barvo_koze(frame, (200, 150), (400, 350))
                self.calibrated = True
                logger.info("✅ Skin color calibrated successfully!")
                cv2.destroyWindow('Skin Color Calibration')
                return True
            elif key == ord('q') or key == ord('Q'):
                logger.info("🛑 Calibration cancelled")
                cv2.destroyWindow('Skin Color Calibration')
                return False
    
    def capture_with_tracking(self, person_name, target_images=5, session_label="default"):
        """Main capture function with live tracking GUI"""
        self.person_name = person_name
        self.target_images = target_images
        self.session_label = session_label
        self.captured_count = 0
        
        self.person_dir = self.raw_dir / person_name
        self.person_dir.mkdir(exist_ok=True)
        
        logger.info(f"🎬 Starting GUI capture for '{person_name}'")
        logger.info(f"📁 Saving to: {self.person_dir}")
        logger.info(f"🎯 Target: {target_images} images")
        logger.info(f"🏷️  Session: {session_label}")
        
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            cap = cv2.VideoCapture(1)
            if not cap.isOpened():
                logger.error("❌ No camera found")
                return False
        
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        
        if not self.calibrated:
            if not self.calibrate_skin_color(cap):
                cap.release()
                return False
        
        logger.info("📹 Live tracking started!")
        logger.info("   Green rectangles = detected faces")
        logger.info("   Press SPACE to capture face")
        logger.info("   Press 'R' to recalibrate skin color") 
        logger.info("   Press 'Q' to quit")
        
        cv2.namedWindow('Face Capture - Live Tracking')
        
        try:
            while self.captured_count < target_images:
                start_time = time.time()
                
                ret, frame = cap.read()
                if not ret:
                    logger.error("❌ Camera read failed")
                    break
                
                frame = zmanjsaj_sliko(frame, 640, 480)
                
                original_frame = frame.copy()
                
                kandidati = []
                skatle = obdelaj_sliko_s_skatlami(frame, self.box_width, self.box_height, self.skin_color)
                
                for (x1, y1), (x2, y2) in skatle:
                    kandidati.append((x1, y1, x2, y2))
                
                zdruzeni_obrazi = zdruzi_prekrivanja(kandidati)
                
                display_frame = frame.copy()
                
                for (x1, y1), (x2, y2) in zdruzeni_obrazi:
                    cv2.rectangle(display_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                
                processing_time = time.time() - start_time
                if processing_time > 0:
                    fps = 1.0 / processing_time
                    self.fps_buffer.append(fps)
                    if len(self.fps_buffer) > 10:
                        self.fps_buffer.pop(0)
                
                    avg_fps = sum(self.fps_buffer) / len(self.fps_buffer)
                    cv2.putText(display_frame, f"FPS: {int(avg_fps)}", (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                cv2.putText(display_frame, f"Faces: {len(zdruzeni_obrazi)}", (10, 60), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                cv2.putText(display_frame, f"Captured: {self.captured_count}/{target_images}", 
                          (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.putText(display_frame, "SPACE=Capture  R=Recalibrate  Q=Quit", 
                          (10, display_frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                if len(zdruzeni_obrazi) > 0:
                    cv2.putText(display_frame, "READY TO CAPTURE", (10, 120), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)
                else:
                    cv2.putText(display_frame, "No face detected", (10, 120), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                
                cv2.imshow('Face Capture - Live Tracking', display_frame)
                
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    logger.info("🛑 Capture terminated by user")
                    break
                elif key == ord(' '):  # SPACE key
                    if len(zdruzeni_obrazi) > 0:
                        largest_face = max(zdruzeni_obrazi, key=lambda box: (box[1][0] - box[0][0]) * (box[1][1] - box[0][1]))
                        face_coords = (largest_face[0][0], largest_face[0][1], largest_face[1][0], largest_face[1][1])
                        
                        saved_path = self._save_face_image(original_frame, face_coords, self.captured_count)
                        if saved_path:
                            self.captured_count += 1
                            logger.info(f"📸 ✅ Captured image {self.captured_count}: {saved_path.name}")
                            
                            flash_frame = display_frame.copy()
                            cv2.rectangle(flash_frame, (0, 0), (display_frame.shape[1], display_frame.shape[0]), (255, 255, 255), -1)
                            cv2.imshow('Face Capture - Live Tracking', flash_frame)
                            cv2.waitKey(100)
                        else:
                            logger.warning("❌ Failed to save image")
                    else:
                        logger.warning("❌ No face detected - position yourself in front of camera")
                        
                elif key == ord('r') or key == ord('R'):
                    logger.info("🎨 Recalibrating skin color...")
                    if self.calibrate_skin_color(cap):
                        logger.info("✅ Recalibration successful")
                
                if self.captured_count >= target_images:
                    logger.info("🎉 All images captured!")
                    completion_frame = display_frame.copy()
                    cv2.putText(completion_frame, "CAPTURE COMPLETE!", 
                              (display_frame.shape[1]//2 - 150, display_frame.shape[0]//2), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 255, 0), 3)
                    cv2.imshow('Face Capture - Live Tracking', completion_frame)
                    cv2.waitKey(500)
                    break
        
        except KeyboardInterrupt:
            logger.info("🛑 Capture interrupted")
        except Exception as e:
            logger.error(f"❌ Error during capture: {e}")
        finally:
            cap.release()
            cv2.destroyAllWindows()
        
        # Save metadata
        self._append_session_metadata(self.captured_count)
        
        logger.info(f"✅ GUI capture completed: {self.captured_count} images saved")
        return self.captured_count > 0

def main():
    parser = argparse.ArgumentParser(description="Face Capture - GUI with Live Tracking")
    parser.add_argument("--person", "-p", help="Person name")
    parser.add_argument("--images", "-i", type=int, default=5, help="Number of images")
    parser.add_argument("--session", "-s", default="default", help="Session label")
    parser.add_argument("--list", "-l", action="store_true", help="List people")
    parser.add_argument("--stats", action="store_true", help="Show stats")
    
    args = parser.parse_args()
    
    try:
        capturer = FaceCaptureGUI()
    except Exception as e:
        logger.error(f"❌ Init failed: {e}")
        return 1
    
    if args.list:
        capturer.list_people()
        return 0
    
    if args.stats:
        if args.person:
            capturer.show_detailed_stats(args.person)
        else:
            people = capturer.list_people()
            for person in people:
                capturer.show_detailed_stats(person)
                print()
        return 0
    
    if not args.person:
        logger.error("❌ Person name required!")
        logger.error("❌ Number of pictures required!")
        logger.info("📖 Usage: python face_capture.py --person 'name' --images 5 [--session 'name']")
        return 1
    
    logger.info("🎬 Starting GUI Face Capture with Live Tracking")
    logger.info(f"👤 Person: {args.person}")
    logger.info(f"📸 Target: {args.images} images")
    print()
    
    success = capturer.capture_with_tracking(
        person_name=args.person,
        target_images=args.images,
        session_label=args.session
    )
    
    if success:
        logger.info("🎉 All done!")
        return 0
    else:
        logger.error("❌ Failed")
        return 1

if __name__ == "__main__":
    exit(main())