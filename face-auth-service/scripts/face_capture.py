#!/usr/bin/env python3
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

class FaceCaptureAuto:
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
        
        self.stable_frames = 0           # Koliko frame-ov je obraz stabilen
        self.stability_threshold = 15    # Potrebno stabilnih frame-ov
        self.last_capture_time = 0       # Čas zadnjega zajema
        self.capture_interval = 2.0      # Minimum sekund med zajemi
        self.last_face_position = None   # Zadnja pozicija obraza
        self.position_tolerance = 30     # Tolerance za stabilnost pozicije
        
        logger.info("✅ Auto Face Capture initialized")
    
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
    
    def _is_face_stable(self, face_coords):
        """Check if face is stable in position"""
        if not face_coords:
            self.stable_frames = 0
            self.last_face_position = None
            return False
        
        # Get center of face
        x1, y1, x2, y2 = face_coords
        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2
        current_position = (center_x, center_y)
        
        if self.last_face_position is None:
            self.last_face_position = current_position
            self.stable_frames = 1
            return False
        
        # Calculate distance from last position
        distance = np.sqrt((current_position[0] - self.last_face_position[0])**2 + 
                          (current_position[1] - self.last_face_position[1])**2)
        
        if distance <= self.position_tolerance:
            self.stable_frames += 1
        else:
            self.stable_frames = 1  # Reset but start counting from current position
        
        self.last_face_position = current_position
        
        return self.stable_frames >= self.stability_threshold
    
    def _is_face_good_quality(self, face_coords, frame_shape):
        """Check if face is good quality for capture"""
        if not face_coords:
            return False
        
        x1, y1, x2, y2 = face_coords
        face_width = x2 - x1
        face_height = y2 - y1
        
        # Check minimum size
        if face_width < 80 or face_height < 80:
            return False
        
        # Check if face is centered enough
        frame_center_x = frame_shape[1] // 2
        frame_center_y = frame_shape[0] // 2
        face_center_x = (x1 + x2) // 2
        face_center_y = (y1 + y2) // 2
        
        # Allow face to be somewhat off-center but not too much
        max_offset_x = frame_shape[1] // 4
        max_offset_y = frame_shape[0] // 4
        
        if (abs(face_center_x - frame_center_x) > max_offset_x or
            abs(face_center_y - frame_center_y) > max_offset_y):
            return False
        
        return True
    
    def _should_capture_now(self, face_coords, frame_shape):
        """Decide if we should capture now"""
        current_time = time.time()
        
        # Check if enough time has passed since last capture
        if current_time - self.last_capture_time < self.capture_interval:
            return False
        
        # Check if face is good quality
        if not self._is_face_good_quality(face_coords, frame_shape):
            return False
        
        # Check if face is stable
        if not self._is_face_stable(face_coords):
            return False
        
        return True
    
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
            "detection_method": "custom_skin_auto"
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
        """Calibrate skin color with GUI"""
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
    
    def capture_with_auto_tracking(self, person_name, target_images=5, session_label="default"):
        self.person_name = person_name
        self.target_images = target_images
        self.session_label = session_label
        self.captured_count = 0
        
        self.person_dir = self.raw_dir / person_name
        self.person_dir.mkdir(exist_ok=True)
        
        logger.info(f"🎬 Starting AUTO capture for '{person_name}'")
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
        
        logger.info("📹 Automatic capture started!")
        logger.info("   🤖 Will auto-capture when face is stable and well positioned")
        logger.info("   📏 Face must be stable for 0.5 seconds")
        logger.info("   ⏱️  Minimum 2 seconds between captures")
        logger.info("   Press 'R' to recalibrate skin color") 
        logger.info("   Press 'Q' to quit")
        
        cv2.namedWindow('Face Capture - Auto Mode')
        
        # Reset auto capture state
        self.stable_frames = 0
        self.last_capture_time = 0
        self.last_face_position = None
        
        try:
            while self.captured_count < target_images:
                start_time = time.time()
                
                ret, frame = cap.read()
                if not ret:
                    logger.error("❌ Camera read failed")
                    break
                
                frame = zmanjsaj_sliko(frame, 640, 480)
                original_frame = frame.copy()
                
                # Face detection
                kandidati = []
                skatle = obdelaj_sliko_s_skatlami(frame, self.box_width, self.box_height, self.skin_color)
                
                for (x1, y1), (x2, y2) in skatle:
                    kandidati.append((x1, y1, x2, y2))
                
                zdruzeni_obrazi = zdruzi_prekrivanja(kandidati)
                
                display_frame = frame.copy()
                
                # Get best face for capture decision
                best_face = None
                if zdruzeni_obrazi:
                    largest_face = max(zdruzeni_obrazi, key=lambda box: (box[1][0] - box[0][0]) * (box[1][1] - box[0][1]))
                    best_face = (largest_face[0][0], largest_face[0][1], largest_face[1][0], largest_face[1][1])
                
                # Draw tracking rectangles with different colors based on status
                for (x1, y1), (x2, y2) in zdruzeni_obrazi:
                    # Determine rectangle color based on face quality
                    face_coords = (x1, y1, x2, y2)
                    if self._is_face_good_quality(face_coords, frame.shape):
                        if self._is_face_stable(face_coords):
                            color = (0, 255, 255)  # YELLOW - stable and good quality
                            thickness = 3
                        else:
                            color = (0, 255, 0)    # GREEN - good quality but not stable
                            thickness = 2
                    else:
                        color = (0, 0, 255)        # RED - poor quality
                        thickness = 2
                    
                    cv2.rectangle(display_frame, (x1, y1), (x2, y2), color, thickness)
                
                if best_face and self._should_capture_now(best_face, frame.shape):
                    saved_path = self._save_face_image(original_frame, best_face, self.captured_count)
                    if saved_path:
                        self.captured_count += 1
                        self.last_capture_time = time.time()
                        logger.info(f"📸 🤖 AUTO captured image {self.captured_count}: {saved_path.name}")
                        
                        # Flash effect
                        flash_frame = display_frame.copy()
                        cv2.rectangle(flash_frame, (0, 0), (display_frame.shape[1], display_frame.shape[0]), (255, 255, 255), -1)
                        cv2.imshow('Face Capture - Auto Mode', flash_frame)
                        cv2.waitKey(200)
                        
                        # Reset stability counter after capture
                        self.stable_frames = 0
                
                # Calculate and display FPS
                processing_time = time.time() - start_time
                if processing_time > 0:
                    fps = 1.0 / processing_time
                    self.fps_buffer.append(fps)
                    if len(self.fps_buffer) > 10:
                        self.fps_buffer.pop(0)
                
                    avg_fps = sum(self.fps_buffer) / len(self.fps_buffer)
                    cv2.putText(display_frame, f"FPS: {int(avg_fps)}", (10, 30), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.putText(display_frame, f"Faces: {len(zdruzeni_obrazi)}", (10, 60), 
                          cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                cv2.putText(display_frame, f"Captured: {self.captured_count}/{target_images}", 
                          (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
                
                # Show stability info
                if best_face:
                    stability_progress = min(self.stable_frames / self.stability_threshold, 1.0)
                    cv2.putText(display_frame, f"Stability: {int(stability_progress * 100)}%", 
                              (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
                    
                    # Time until next capture allowed
                    time_since_last = time.time() - self.last_capture_time
                    if time_since_last < self.capture_interval:
                        wait_time = self.capture_interval - time_since_last
                        cv2.putText(display_frame, f"Next capture in: {wait_time:.1f}s", 
                                  (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 100, 255), 2)
                    elif self._is_face_good_quality(best_face, frame.shape):
                        cv2.putText(display_frame, "READY FOR CAPTURE", 
                                  (10, 150), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                
                # Instructions
                cv2.putText(display_frame, "AUTO MODE - R=Recalibrate  Q=Quit", 
                          (10, display_frame.shape[0] - 20), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                # Color legend
                cv2.putText(display_frame, "RED=Poor  GREEN=Good  YELLOW=Capturing", 
                          (10, display_frame.shape[0] - 50), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
                
                cv2.imshow('Face Capture - Auto Mode', display_frame)
                
                key = cv2.waitKey(1) & 0xFF
                if key == ord('q') or key == ord('Q'):
                    logger.info("🛑 Capture terminated by user")
                    break
                elif key == ord('r') or key == ord('R'):
                    logger.info("🎨 Recalibrating skin color...")
                    if self.calibrate_skin_color(cap):
                        logger.info("✅ Recalibration successful")
                
                if self.captured_count >= target_images:
                    logger.info("🎉 All images captured automatically!")
                    completion_frame = display_frame.copy()
                    cv2.putText(completion_frame, "AUTO CAPTURE COMPLETE!", 
                              (display_frame.shape[1]//2 - 180, display_frame.shape[0]//2), 
                              cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 255, 0), 3)
                    cv2.imshow('Face Capture - Auto Mode', completion_frame)
                    cv2.waitKey(2000)
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
        
        logger.info(f"✅ Auto capture completed: {self.captured_count} images saved")
        return self.captured_count > 0

def main():
    parser = argparse.ArgumentParser(description="Face Capture - Automatic Mode")
    parser.add_argument("--person", "-p", help="Person name")
    parser.add_argument("--images", "-i", type=int, default=5, help="Number of images")
    parser.add_argument("--session", "-s", default="default", help="Session label")
    parser.add_argument("--list", "-l", action="store_true", help="List people")
    parser.add_argument("--stats", action="store_true", help="Show stats")
    
    args = parser.parse_args()
    
    try:
        capturer = FaceCaptureAuto()
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
        logger.info("📖 Usage: python face_capture_auto.py --person 'name' --images 5 [--session 'name']")
        return 1
    
    logger.info("🎬 Starting AUTO Face Capture")
    logger.info(f"👤 Person: {args.person}")
    logger.info(f"📸 Target: {args.images} images")
    print()
    
    success = capturer.capture_with_auto_tracking(
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