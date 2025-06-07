#!/usr/bin/env python3
"""
Quick Face Authentication Test Script

This script tests the face authentication API with images from a folder.
"""

import requests
import os
import sys
from pathlib import Path
import time

def main():
    # Configuration
    if len(sys.argv) != 2:
        print("Usage: python quick_test.py /path/to/image/folder")
        print("Example: python quick_test.py ./images")
        sys.exit(1)
    
    folder_path = sys.argv[1]
    api_url = "http://localhost:8000"
    
    # Find images
    folder = Path(folder_path)
    if not folder.exists():
        print(f"❌ Folder not found: {folder_path}")
        sys.exit(1)
    
    image_files = []
    for ext in ['*.jpg', '*.jpeg', '*.png']:
        image_files.extend(folder.glob(ext))
    
    if not image_files:
        print(f"❌ No image files found in {folder_path}")
        sys.exit(1)
    
    print(f"🔮 Face Authentication Quick Test")
    print(f"📁 Found {len(image_files)} images in {folder_path}")
    
    # Test API health
    try:
        response = requests.get(f"{api_url}/health", timeout=5)
        if response.status_code == 200:
            print(f"✅ API is healthy")
        else:
            print(f"❌ API health check failed")
            sys.exit(1)
    except:
        print(f"❌ Cannot connect to API at {api_url}")
        print("💡 Make sure the service is running: docker-compose -f docker-compose.dev.yml up faceauth")
        sys.exit(1)
    
    # Register user
    print(f"\n🚀 Registering user with {len(image_files)} images...")
    
    files_data = []
    for i, img_path in enumerate(image_files):
        files_data.append(
            ('files', (img_path.name, open(img_path, 'rb'), 'image/jpeg'))
        )
    
    try:
        response = requests.post(f"{api_url}/user-register", files=files_data, timeout=30)
        
        # Close file handles
        for _, (_, file_handle, _) in files_data:
            file_handle.close()
        
        if response.status_code == 200:
            result = response.json()
            job_id = result['job_id']
            print(f"✅ Registration successful!")
            print(f"🆔 Job ID: {job_id}")
            print(f"📸 Images received: {result['images_received']}")
            
            # Wait a bit for training to start
            print(f"\n⏳ Waiting for training to complete...")
            print(f"💡 Check logs: docker-compose -f docker-compose.dev.yml logs -f faceauth")
            
            # Monitor for completion (simple version)
            for i in range(30):  # Wait up to 5 minutes
                time.sleep(10)
                try:
                    # Try a test login to see if model exists
                    test_response = requests.post(
                        f"{api_url}/user-login",
                        data={'job_id': job_id},
                        files={'file': ('test.jpg', b'fake', 'image/jpeg')},
                        timeout=5
                    )
                    
                    if test_response.status_code != 404:
                        print(f"\n🎉 Training completed!")
                        break
                    else:
                        print(f"🔄 Training in progress... ({(i+1)*10}s elapsed)")
                        
                except:
                    print(f"🔄 Training in progress... ({(i+1)*10}s elapsed)")
            
            # Test login with first image
            print(f"\n🔐 Testing login with {image_files[0].name}...")
            
            with open(image_files[0], 'rb') as f:
                login_response = requests.post(
                    f"{api_url}/user-login",
                    data={'job_id': job_id},
                    files={'file': (image_files[0].name, f, 'image/jpeg')},
                    timeout=30
                )
            
            if login_response.status_code == 200:
                login_result = login_response.json()
                print(f"✅ Login successful!")
                print(f"🔐 Authenticated: {login_result['authenticated']}")
                print(f"📊 Probability: {login_result['probability']:.4f}")
                
                if login_result['authenticated']:
                    print(f"🎉 System recognized you!")
                else:
                    print(f"⚠️  System did not recognize you.")
            else:
                print(f"❌ Login failed: {login_response.text}")
                
        else:
            print(f"❌ Registration failed: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    main() 