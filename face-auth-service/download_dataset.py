#!/usr/bin/env python3
"""
Script to download private Kaggle dataset for face authentication training data.
This script will be run at container startup to fetch the latest dataset.
"""

import os
import sys
import json
from pathlib import Path
import kaggle

def setup_kaggle_credentials():
    """Set up Kaggle API credentials for private dataset access."""
    
    kaggle_username = os.getenv('KAGGLE_USERNAME')
    kaggle_key = os.getenv('KAGGLE_KEY')
    
    if not kaggle_username or not kaggle_key:
        print("❌ ERROR: KAGGLE_USERNAME or KAGGLE_KEY environment variables not set!")
        print("Please set them in your .env.dev file")
        sys.exit(1)
    
    # Create .kaggle directory
    kaggle_dir = Path.home() / '.kaggle'
    kaggle_dir.mkdir(exist_ok=True)
    
    # Create kaggle.json file with credentials
    kaggle_config = {
        "username": kaggle_username,
        "key": kaggle_key
    }
    
    kaggle_json_path = kaggle_dir / 'kaggle.json'
    with open(kaggle_json_path, 'w') as f:
        json.dump(kaggle_config, f)
    
    # Set proper permissions (Kaggle API requires this)
    kaggle_json_path.chmod(0o600)
    
    print(f"✅ Kaggle credentials configured for user: {kaggle_username}")
    return kaggle_username, kaggle_key

def download_dataset():
    """Download the private Kaggle dataset and extract it."""
    
    # Set up credentials first
    kaggle_username, kaggle_key = setup_kaggle_credentials()
    
    # Configuration - these should be set as environment variables
    dataset_name = os.getenv('KAGGLE_DATASET_NAME')
    if not dataset_name:
        print("❌ ERROR: KAGGLE_DATASET_NAME environment variable not set!")
        print("Please set it in your .env.dev file (e.g., 'username/dataset-name')")
        sys.exit(1)
    
    # Ensure data directory exists
    data_dir = Path('/app/data')
    data_dir.mkdir(exist_ok=True)
    
    print(f"📥 Downloading private dataset: {dataset_name}")
    print(f"📁 Target directory: {data_dir}")
    print(f"👤 Using Kaggle user: {kaggle_username}")
    
    try:
        # Authenticate with Kaggle API
        kaggle.api.authenticate()
        
        # Download the dataset
        print("🔄 Starting download...")
        kaggle.api.dataset_download_files(
            dataset_name,
            path=str(data_dir),
            unzip=True
        )
        print("✅ Dataset downloaded and extracted successfully!")
        
        # List downloaded files for verification
        print("\n📋 Downloaded files:")
        file_count = 0
        total_size = 0
        for file_path in data_dir.rglob('*'):
            if file_path.is_file() and not file_path.name.startswith('.'):
                size_bytes = file_path.stat().st_size
                size_mb = size_bytes / (1024 * 1024)
                print(f"  - {file_path.relative_to(data_dir)} ({size_mb:.2f} MB)")
                file_count += 1
                total_size += size_bytes
        
        total_size_mb = total_size / (1024 * 1024)
        print(f"\n🎉 Successfully downloaded {file_count} files ({total_size_mb:.2f} MB total)")
                
    except Exception as e:
        print(f"❌ Error downloading dataset: {e}")
        print(f"\n🔧 Troubleshooting:")
        print(f"1. Make sure your Kaggle API credentials are correct")
        print(f"2. Ensure the dataset name '{dataset_name}' is correct")
        print(f"3. Verify you have access to this private dataset")
        print(f"4. Check that all environment variables are set in .env.dev:")
        print(f"   - KAGGLE_USERNAME={kaggle_username}")
        print(f"   - KAGGLE_KEY={'*' * len(kaggle_key) if kaggle_key else 'NOT_SET'}")
        print(f"   - KAGGLE_DATASET_NAME={dataset_name}")
        sys.exit(1)

if __name__ == "__main__":
    download_dataset() 