#!/usr/bin/env python3
import cv2
import numpy as np
import math
import argparse
from pathlib import Path

class FaceAugmentation:
    def __init__(self, data_root="data"):
        self.data_root = Path(data_root)
        self.processed_dir = self.data_root / "processed"
    
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
    
    def process_person_rotation(self, person_name, angle=10):
        """Process all images for a person with rotation augmentation"""
        person_dir = self.processed_dir / person_name
        
        if not person_dir.exists():
            print(f"Error: Directory not found: {person_dir}")
            return False
        
        # Get processed images
        image_files = list(person_dir.glob("*_processed.jpg"))
        
        if not image_files:
            print(f"Error: No processed images found in {person_dir}")
            return False
        
        print(f"Processing {len(image_files)} images with rotation {angle}°")
        
        for image_file in image_files:
            # Load image
            image = cv2.imread(str(image_file))
            if image is None:
                continue
            
            # Apply rotation
            rotated = self.augment_rotation_custom(image, angle)
            
            # Save result
            base_name = image_file.stem.replace('_processed', '')
            output_path = person_dir / f"{base_name}_rot{angle}_augmented.jpg"
            cv2.imwrite(str(output_path), rotated)
            print(f"Created: {output_path.name}")
        
        return True

def main():
    parser = argparse.ArgumentParser(description="Face Rotation Augmentation")
    parser.add_argument("--person", "-p", required=True, help="Person name")
    parser.add_argument("--angle", "-a", type=int, default=10, help="Rotation angle")
    
    args = parser.parse_args()
    
    augmentor = FaceAugmentation()
    success = augmentor.process_person_rotation(args.person, args.angle)
    
    if success:
        print("Rotation augmentation completed!")
    else:
        print("Augmentation failed!")

if __name__ == "__main__":
    main()