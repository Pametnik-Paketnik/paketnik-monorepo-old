#!/usr/bin/env python3
import cv2
import os
import sys
import argparse
import json
import numpy as np
import random
import math
from datetime import datetime
from pathlib import Path
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class FaceAugmentation:
    def __init__(self, data_root="data"):
        self.data_root = Path(data_root)
        self.processed_dir = self.data_root / "processed"
        
        # Set random seed for reproducibility
        random.seed(42)
        np.random.seed(42)
        
        logger.info("✅ Face Augmentation initialized")
    
    def list_available_people(self):
        """List people with processed data available"""
        people = []
        if self.processed_dir.exists():
            people = [d.name for d in self.processed_dir.iterdir() 
                     if d.is_dir() and any(d.glob("*_processed.jpg"))]
        
        if people:
            logger.info(f"📋 Available people for augmentation: {', '.join(people)}")
        else:
            logger.info("📋 No people with processed data found")
        return people
    
    def get_processed_image_count(self, person_name):
        """Get count of processed images for a person"""
        person_dir = self.processed_dir / person_name
        if not person_dir.exists():
            return 0
        
        image_files = list(person_dir.glob("*_processed.jpg"))
        return len(image_files)
    
    # ============================================================================
    # AUGMENTATION 1: CUSTOM ROTATION WITH BILINEAR INTERPOLATION
    # ============================================================================
    def augment_rotation_custom(self, image, angle_degrees):
        """
        Custom rotation implementation using bilinear interpolation
        WITHOUT using cv2.getRotationMatrix2D or cv2.warpAffine
        """
        h, w = image.shape[:2]
        
        # Convert angle to radians
        angle_rad = math.radians(angle_degrees)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        
        # Calculate center of rotation
        cx, cy = w // 2, h // 2
        
        # Create output image (same size)
        rotated = np.zeros_like(image)
        
        # For each pixel in output image, find corresponding pixel in input
        for y in range(h):
            for x in range(w):
                # Translate to origin
                tx = x - cx
                ty = y - cy
                
                # Apply inverse rotation
                src_x = tx * cos_a + ty * sin_a + cx
                src_y = -tx * sin_a + ty * cos_a + cy
                
                # Check bounds
                if 0 <= src_x < w-1 and 0 <= src_y < h-1:
                    # Bilinear interpolation
                    x1, y1 = int(src_x), int(src_y)
                    x2, y2 = x1 + 1, y1 + 1
                    
                    # Calculate weights
                    wx = src_x - x1
                    wy = src_y - y1
                    
                    if len(image.shape) == 3:
                        # Color image
                        for c in range(image.shape[2]):
                            # Get four corner pixels
                            p11 = image[y1, x1, c]
                            p12 = image[y2, x1, c]
                            p21 = image[y1, x2, c]
                            p22 = image[y2, x2, c]
                            
                            # Bilinear interpolation
                            interpolated = (p11 * (1-wx) * (1-wy) + 
                                          p21 * wx * (1-wy) + 
                                          p12 * (1-wx) * wy + 
                                          p22 * wx * wy)
                            
                            rotated[y, x, c] = int(interpolated)
                    else:
                        # Grayscale image
                        p11 = image[y1, x1]
                        p12 = image[y2, x1]
                        p21 = image[y1, x2]
                        p22 = image[y2, x2]
                        
                        interpolated = (p11 * (1-wx) * (1-wy) + 
                                      p21 * wx * (1-wy) + 
                                      p12 * (1-wx) * wy + 
                                      p22 * wx * wy)
                        
                        rotated[y, x] = int(interpolated)
        
        return rotated
    
    # ============================================================================
    # AUGMENTATION 2: CUSTOM PERSPECTIVE TRANSFORM (SIMULATE 3D HEAD ROTATION)
    # ============================================================================
    def augment_perspective_transform(self, image, tilt_x=0, tilt_y=0, tilt_z=0):
        """
        Custom perspective transformation to simulate 3D head rotation
        WITHOUT using cv2.getPerspectiveTransform or cv2.warpPerspective
        """
        h, w = image.shape[:2]
        
        # Convert angles to radians
        rx = math.radians(tilt_x)
        ry = math.radians(tilt_y)
        rz = math.radians(tilt_z)
        
        # 3D rotation matrices
        # Rotation around X-axis (pitch)
        Rx = np.array([
            [1, 0, 0],
            [0, math.cos(rx), -math.sin(rx)],
            [0, math.sin(rx), math.cos(rx)]
        ])
        
        # Rotation around Y-axis (yaw)
        Ry = np.array([
            [math.cos(ry), 0, math.sin(ry)],
            [0, 1, 0],
            [-math.sin(ry), 0, math.cos(ry)]
        ])
        
        # Rotation around Z-axis (roll)
        Rz = np.array([
            [math.cos(rz), -math.sin(rz), 0],
            [math.sin(rz), math.cos(rz), 0],
            [0, 0, 1]
        ])
        
        # Combined rotation matrix
        R = Rz @ Ry @ Rx
        
        # Camera parameters (simplified)
        focal_length = max(w, h)
        cx, cy = w // 2, h // 2
        
        # Create output image
        transformed = np.zeros_like(image)
        
        for y in range(h):
            for x in range(w):
                # Convert to camera coordinates
                X = (x - cx) / focal_length
                Y = (y - cy) / focal_length
                Z = 1.0
                
                # Apply 3D rotation
                point_3d = np.array([X, Y, Z])
                rotated_3d = R @ point_3d
                
                # Project back to 2D
                if rotated_3d[2] > 0.1:  # Avoid division by zero
                    new_x = rotated_3d[0] / rotated_3d[2] * focal_length + cx
                    new_y = rotated_3d[1] / rotated_3d[2] * focal_length + cy
                    
                    # Check bounds and apply bilinear interpolation
                    if 0 <= new_x < w-1 and 0 <= new_y < h-1:
                        x1, y1 = int(new_x), int(new_y)
                        x2, y2 = x1 + 1, y1 + 1
                        
                        if x2 < w and y2 < h:
                            wx = new_x - x1
                            wy = new_y - y1
                            
                            if len(image.shape) == 3:
                                for c in range(image.shape[2]):
                                    p11 = image[y1, x1, c]
                                    p12 = image[y2, x1, c]
                                    p21 = image[y1, x2, c]
                                    p22 = image[y2, x2, c]
                                    
                                    interpolated = (p11 * (1-wx) * (1-wy) + 
                                                  p21 * wx * (1-wy) + 
                                                  p12 * (1-wx) * wy + 
                                                  p22 * wx * wy)
                                    
                                    transformed[y, x, c] = int(interpolated)
                            else:
                                p11 = image[y1, x1]
                                p12 = image[y2, x1]
                                p21 = image[y1, x2]
                                p22 = image[y2, x2]
                                
                                interpolated = (p11 * (1-wx) * (1-wy) + 
                                              p21 * wx * (1-wy) + 
                                              p12 * (1-wx) * wy + 
                                              p22 * wx * wy)
                                
                                transformed[y, x] = int(interpolated)
        
        return transformed
    
    # ============================================================================
    # AUGMENTATION 3: CUSTOM LIGHTING VARIATION (DIRECTIONAL ILLUMINATION)
    # ============================================================================
    def augment_lighting_variation(self, image, light_angle=45, intensity=0.3):
        """
        Custom lighting variation by simulating directional light source
        WITHOUT using external libraries
        """
        h, w = image.shape[:2]
        
        # Convert angle to radians
        angle_rad = math.radians(light_angle)
        
        # Light direction vector
        light_dx = math.cos(angle_rad)
        light_dy = math.sin(angle_rad)
        
        # Create lighting gradient
        center_x, center_y = w // 2, h // 2
        
        # Calculate lighting map
        lighting_map = np.zeros((h, w), dtype=np.float32)
        
        for y in range(h):
            for x in range(w):
                # Distance from center
                dx = (x - center_x) / (w // 2)
                dy = (y - center_y) / (h // 2)
                
                # Calculate dot product with light direction
                dot_product = dx * light_dx + dy * light_dy
                
                # Create smooth lighting gradient
                light_factor = 1.0 + intensity * dot_product
                
                # Apply circular falloff
                distance = math.sqrt(dx*dx + dy*dy)
                falloff = max(0, 1.0 - distance * 0.5)
                
                lighting_map[y, x] = light_factor * falloff
        
        # Apply lighting to image
        if len(image.shape) == 3:
            # Color image
            result = np.zeros_like(image)
            for c in range(image.shape[2]):
                channel = image[:, :, c].astype(np.float32)
                lit_channel = channel * lighting_map
                result[:, :, c] = np.clip(lit_channel, 0, 255).astype(np.uint8)
        else:
            # Grayscale image
            channel = image.astype(np.float32)
            lit_channel = channel * lighting_map
            result = np.clip(lit_channel, 0, 255).astype(np.uint8)
        
        return result
    
    # ============================================================================
    # AUGMENTATION 4: CUSTOM FACIAL FEATURE DISTORTION (BARREL/PINCUSHION)
    # ============================================================================
    def augment_lens_distortion(self, image, distortion_strength=0.15, barrel=True):
        """
        Custom lens distortion effect (barrel or pincushion)
        WITHOUT using external libraries
        """
        h, w = image.shape[:2]
        
        # Create output image
        distorted = np.zeros_like(image)
        
        # Center coordinates
        cx, cy = w // 2, h // 2
        
        # Maximum radius for normalization
        max_radius = min(cx, cy)
        
        for y in range(h):
            for x in range(w):
                # Calculate distance from center
                dx = x - cx
                dy = y - cy
                
                # Normalize to radius
                r = math.sqrt(dx*dx + dy*dy) / max_radius
                
                # Apply distortion formula
                if barrel:
                    # Barrel distortion
                    distortion_factor = 1 + distortion_strength * r * r
                else:
                    # Pincushion distortion
                    distortion_factor = 1 - distortion_strength * r * r
                
                # Calculate source coordinates
                if distortion_factor > 0:
                    src_x = cx + dx / distortion_factor
                    src_y = cy + dy / distortion_factor
                    
                    # Check bounds and apply bilinear interpolation
                    if 0 <= src_x < w-1 and 0 <= src_y < h-1:
                        x1, y1 = int(src_x), int(src_y)
                        x2, y2 = x1 + 1, y1 + 1
                        
                        if x2 < w and y2 < h:
                            wx = src_x - x1
                            wy = src_y - y1
                            
                            if len(image.shape) == 3:
                                for c in range(image.shape[2]):
                                    p11 = image[y1, x1, c]
                                    p12 = image[y2, x1, c]
                                    p21 = image[y1, x2, c]
                                    p22 = image[y2, x2, c]
                                    
                                    interpolated = (p11 * (1-wx) * (1-wy) + 
                                                  p21 * wx * (1-wy) + 
                                                  p12 * (1-wx) * wy + 
                                                  p22 * wx * wy)
                                    
                                    distorted[y, x, c] = int(interpolated)
                            else:
                                p11 = image[y1, x1]
                                p12 = image[y2, x1]
                                p21 = image[y1, x2]
                                p22 = image[y2, x2]
                                
                                interpolated = (p11 * (1-wx) * (1-wy) + 
                                              p21 * wx * (1-wy) + 
                                              p12 * (1-wx) * wy + 
                                              p22 * wx * wy)
                                
                                distorted[y, x] = int(interpolated)
        
        return distorted
    
    # ============================================================================
    # AUGMENTATION METHODS MAPPING
    # ============================================================================
    def get_augmentation_methods(self):
        """Get available augmentation methods"""
        methods = {
            'rotation': {
                'name': 'Custom Rotation',
                'description': 'Rotate image using custom bilinear interpolation',
                'function': self.apply_rotation_augmentation,
                'params': {'angles': [-15, -10, -5, 5, 10, 15]}
            },
            'perspective': {
                'name': 'Perspective Transform',
                'description': 'Simulate 3D head rotation using perspective transformation',
                'function': self.apply_perspective_augmentation,
                'params': {'tilts': [(-10, 5, 0), (10, -5, 0), (0, 10, 5), (0, -10, -5)]}
            },
            'lighting': {
                'name': 'Lighting Variation',
                'description': 'Apply directional lighting effects',
                'function': self.apply_lighting_augmentation,
                'params': {'configs': [(0, 0.25), (90, 0.3), (180, 0.25), (270, 0.3)]}
            },
            'distortion': {
                'name': 'Lens Distortion',
                'description': 'Apply barrel or pincushion distortion',
                'function': self.apply_distortion_augmentation,
                'params': {'configs': [(0.1, True), (0.15, True), (0.1, False), (0.12, False)]}
            }
        }
        return methods
    
    def apply_rotation_augmentation(self, image, params):
        """Apply rotation augmentation with random angle"""
        angle = random.choice(params['angles'])
        return self.augment_rotation_custom(image, angle), f"rot{angle}"
    
    def apply_perspective_augmentation(self, image, params):
        """Apply perspective augmentation with random tilt"""
        tilt_x, tilt_y, tilt_z = random.choice(params['tilts'])
        result = self.augment_perspective_transform(image, tilt_x, tilt_y, tilt_z)
        return result, f"persp{tilt_x}_{tilt_y}_{tilt_z}"
    
    def apply_lighting_augmentation(self, image, params):
        """Apply lighting augmentation with random configuration"""
        angle, intensity = random.choice(params['configs'])
        result = self.augment_lighting_variation(image, angle, intensity)
        return result, f"light{angle}_{int(intensity*100)}"
    
    def apply_distortion_augmentation(self, image, params):
        """Apply distortion augmentation with random configuration"""
        strength, barrel = random.choice(params['configs'])
        result = self.augment_lens_distortion(image, strength, barrel)
        distortion_type = "barrel" if barrel else "pinch"
        return result, f"dist_{distortion_type}_{int(strength*100)}"
    
    def show_augmentation_methods(self):
        """Display available augmentation methods"""
        methods = self.get_augmentation_methods()
        
        logger.info("📋 Available augmentation methods:")
        for key, method in methods.items():
            logger.info(f"   🔧 {key}: {method['name']}")
            logger.info(f"      {method['description']}")
        logger.info("")
    
    def augment_person_images(self, person_name, method='random', count_per_image=2, overwrite=False):
        """Augment all processed images for a specific person"""
        person_dir = self.processed_dir / person_name
        
        if not person_dir.exists():
            logger.error(f"❌ Processed data directory not found: {person_dir}")
            return False
        
        # Get all processed image files
        image_files = list(person_dir.glob("*_processed.jpg"))
        
        if not image_files:
            logger.error(f"❌ No processed image files found in: {person_dir}")
            return False
        
        # Get augmentation methods
        methods = self.get_augmentation_methods()
        
        if method != 'random' and method not in methods:
            logger.error(f"❌ Unknown augmentation method: {method}")
            logger.info(f"   Available: {', '.join(methods.keys())}, random")
            return False
        
        logger.info(f"🔄 Augmenting {len(image_files)} images for '{person_name}'")
        logger.info(f"📁 Directory: {person_dir}")
        logger.info(f"🎯 Method: {method}")
        logger.info(f"🔢 Augmentations per image: {count_per_image}")
        
        augmented_count = 0
        failed_count = 0
        
        for image_file in image_files:
            try:
                # Load image
                image = cv2.imread(str(image_file))
                if image is None:
                    logger.error(f"❌ Failed to load image: {image_file}")
                    failed_count += 1
                    continue
                
                # Generate augmentations for this image
                for i in range(count_per_image):
                    try:
                        # Select augmentation method
                        if method == 'random':
                            selected_method = random.choice(list(methods.keys()))
                        else:
                            selected_method = method
                        
                        # Apply augmentation
                        method_info = methods[selected_method]
                        augmented_image, suffix = method_info['function'](image, method_info['params'])
                        
                        # Generate output filename
                        base_name = image_file.stem.replace('_processed', '')
                        output_filename = f"{base_name}_{suffix}_{i+1}_augmented.jpg"
                        output_path = person_dir / output_filename
                        
                        # Check if already exists
                        if output_path.exists() and not overwrite:
                            logger.debug(f"⏭️ Skipping (already exists): {output_filename}")
                            continue
                        
                        # Save augmented image
                        cv2.imwrite(str(output_path), augmented_image)
                        augmented_count += 1
                        logger.debug(f"✅ Augmented: {image_file.name} -> {output_filename}")
                        
                    except Exception as e:
                        failed_count += 1
                        logger.error(f"❌ Error augmenting {image_file.name} (variant {i+1}): {e}")
                        
            except Exception as e:
                failed_count += 1
                logger.error(f"❌ Error processing {image_file.name}: {e}")
        
        # Save augmentation metadata
        self._save_augmentation_metadata(person_name, method, count_per_image, augmented_count, failed_count)
        
        logger.info(f"✅ Augmentation completed for '{person_name}':")
        logger.info(f"   📸 Successfully augmented: {augmented_count}")
        logger.info(f"   ❌ Failed: {failed_count}")
        
        return augmented_count > 0
    
    def _save_augmentation_metadata(self, person_name, method, count_per_image, augmented_count, failed_count):
        """Save augmentation metadata"""
        person_dir = self.processed_dir / person_name
        metadata_file = person_dir / "augmentation_metadata.json"
        
        # Load existing metadata or create new
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    metadata = json.load(f)
            except:
                metadata = {"person_name": person_name, "augmentation_sessions": []}
        else:
            metadata = {"person_name": person_name, "augmentation_sessions": []}
        
        # Add new session
        session = {
            "timestamp": datetime.now().isoformat(),
            "method": method,
            "count_per_image": count_per_image,
            "images_augmented": augmented_count,
            "images_failed": failed_count,
            "augmentation_version": "1.0"
        }
        
        metadata["augmentation_sessions"].append(session)
        metadata["total_augmentations"] = sum(s.get("images_augmented", 0) for s in metadata["augmentation_sessions"])
        metadata["last_updated"] = datetime.now().isoformat()
        
        with open(metadata_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.debug(f"📝 Metadata saved: {metadata_file}")

def main():
    parser = argparse.ArgumentParser(description="Face Image Augmentation")
    parser.add_argument("--person", "-p", help="Person name to augment")
    parser.add_argument("--method", "-m", default="random", 
                       help="Augmentation method (rotation, perspective, lighting, distortion, random)")
    parser.add_argument("--count", "-c", type=int, default=2, 
                       help="Number of augmentations per image")
    parser.add_argument("--list", "-l", action="store_true", help="List available people")
    parser.add_argument("--methods", action="store_true", help="Show augmentation methods")
    parser.add_argument("--overwrite", "-o", action="store_true", help="Overwrite existing augmented images")
    parser.add_argument("--all", "-a", action="store_true", help="Augment all available people")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    try:
        augmentor = FaceAugmentation()
    except Exception as e:
        logger.error(f"❌ Init failed: {e}")
        return 1
    
    if args.list:
        augmentor.list_available_people()
        return 0
    
    if args.methods:
        augmentor.show_augmentation_methods()
        return 0
    
    # Validate method
    methods = augmentor.get_augmentation_methods()
    if args.method != 'random' and args.method not in methods:
        logger.error(f"❌ Unknown augmentation method: {args.method}")
        logger.info(f"   Available: {', '.join(methods.keys())}, random")
        return 1
    
    if args.all:
        # Augment all available people
        people = augmentor.list_available_people()
        if not people:
            logger.error("❌ No people found to augment")
            return 1
        
        success_count = 0
        for person in people:
            logger.info(f"\n🔄 Augmenting person: {person}")
            if augmentor.augment_person_images(person, args.method, args.count, args.overwrite):
                success_count += 1
        
        logger.info(f"\n🎉 Completed augmentation for {success_count}/{len(people)} people")
        return 0
    
    if not args.person:
        logger.error("❌ Person name required!")
        logger.info("📖 Usage:")
        logger.info("   python face_augmentation.py --person 'name' [--method rotation] [--count 2]")
        logger.info("   python face_augmentation.py --all [--method random] [--count 3]")
        logger.info("   python face_augmentation.py --list")
        logger.info("   python face_augmentation.py --methods")
        return 1
    
    # Check if person exists
    processed_count = augmentor.get_processed_image_count(args.person)
    if processed_count == 0:
        logger.error(f"❌ No processed images found for person: {args.person}")
        logger.info("💡 Use --list to see available people")
        logger.info("💡 Run face_preprocessing.py first")
        return 1
    
    logger.info(f"🎬 Starting augmentation for '{args.person}'")
    logger.info(f"📸 Found {processed_count} processed images")
    print()
    
    success = augmentor.augment_person_images(
        person_name=args.person,
        method=args.method,
        count_per_image=args.count,
        overwrite=args.overwrite
    )
    
    if success:
        logger.info("🎉 Augmentation completed successfully!")
        return 0
    else:
        logger.error("❌ Augmentation failed")
        return 1

if __name__ == "__main__":
    exit(main())