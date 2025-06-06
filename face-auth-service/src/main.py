from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Auth Service")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    logger.info("=" * 50)
    logger.info(f"🚀 Face Auth Service starting up at {current_time}")
    logger.info("=" * 50)

@app.get("/")
async def root():
    return {"message": "Welcome to Face Auth Service API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy bro bro"}

if __name__ == "__main__":
    logger.info("Starting server...")