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
        """Custom rotation implementation using bilinear interpolation"""
        h, w = image.shape[:2]
        angle_rad = math.radians(angle_degrees)
        cos_a = math.cos(angle_rad)
        sin_a = math.sin(angle_rad)
        cx, cy = w // 2, h // 2
        rotated = np.zeros_like(image)
        
        for y in range(h):
            for x in range(w):
                tx = x - cx
                ty = y - cy
                src_x = tx * cos_a + ty * sin_a + cx
                src_y = -tx * sin_a + ty * cos_a + cy
                
                if 0 <= src_x < w-1 and 0 <= src_y < h-1:
                    x1, y1 = int(src_x), int(src_y)
                    x2, y2 = x1 + 1, y1 + 1
                    wx = src_x - x1
                    wy = src_y - y1
                    
                    if len(image.shape) == 3:
                        for c in range(image.shape[2]):
                            p11 = image[y1, x1, c]
                            p12 = image[y2, x1, c]
                            p21 = image[y1, x2, c]
                            p22 = image[y2, x2, c]
                            interpolated = (p11 * (1-wx) * (1-wy) + p21 * wx * (1-wy) + 
                                          p12 * (1-wx) * wy + p22 * wx * wy)
                            rotated[y, x, c] = int(interpolated)
                    else:
                        p11 = image[y1, x1]
                        p12 = image[y2, x1]
                        p21 = image[y1, x2]
                        p22 = image[y2, x2]
                        interpolated = (p11 * (1-wx) * (1-wy) + p21 * wx * (1-wy) + 
                                      p12 * (1-wx) * wy + p22 * wx * wy)
                        rotated[y, x] = int(interpolated)
        return rotated

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
    
    def process_person_augmentation(self, person_name, method="rotation", **kwargs):
        """Process all images for a person with specified augmentation"""
        person_dir = self.processed_dir / person_name
        
        if not person_dir.exists():
            print(f"Error: Directory not found: {person_dir}")
            return False
        
        # Get processed images
        image_files = list(person_dir.glob("*_processed.jpg"))
        
        if not image_files:
            print(f"Error: No processed images found in {person_dir}")
            return False
        
        print(f"Processing {len(image_files)} images with {method}")
        
        for image_file in image_files:
            # Load image
            image = cv2.imread(str(image_file))
            if image is None:
                continue
            
            # Apply augmentation
            if method == "rotation":
                angle = kwargs.get('angle', 10)
                result = self.augment_rotation_custom(image, angle)
                suffix = f"rot{angle}"
            elif method == "perspective":
                tilt_x = kwargs.get('tilt_x', 10)
                tilt_y = kwargs.get('tilt_y', 0)
                tilt_z = kwargs.get('tilt_z', 0)
                result = self.augment_perspective_transform(image, tilt_x, tilt_y, tilt_z)
                suffix = f"persp{tilt_x}_{tilt_y}_{tilt_z}"
            else:
                print(f"Unknown method: {method}")
                continue
            
            # Save result
            base_name = image_file.stem.replace('_processed', '')
            output_path = person_dir / f"{base_name}_{suffix}_augmented.jpg"
            cv2.imwrite(str(output_path), result)
            print(f"Created: {output_path.name}")
        
        return True

def main():
    parser = argparse.ArgumentParser(description="Face Augmentation - Rotation & Perspective")
    parser.add_argument("--person", "-p", required=True, help="Person name")
    parser.add_argument("--method", "-m", choices=['rotation', 'perspective'], 
                       default='rotation', help="Augmentation method")
    parser.add_argument("--angle", "-a", type=int, default=10, help="Rotation angle")
    parser.add_argument("--tilt-x", type=int, default=10, help="Perspective tilt X")
    parser.add_argument("--tilt-y", type=int, default=0, help="Perspective tilt Y")
    parser.add_argument("--tilt-z", type=int, default=0, help="Perspective tilt Z")
    
    args = parser.parse_args()
    
    augmentor = FaceAugmentation()
    
    if args.method == "rotation":
        success = augmentor.process_person_augmentation(args.person, "rotation", angle=args.angle)
    elif args.method == "perspective":
        success = augmentor.process_person_augmentation(args.person, "perspective", 
                                                       tilt_x=args.tilt_x, tilt_y=args.tilt_y, tilt_z=args.tilt_z)
    
    if success:
        print(f"{args.method.capitalize()} augmentation completed!")
    else:
        print("Augmentation failed!")

if __name__ == "__main__":
    main()