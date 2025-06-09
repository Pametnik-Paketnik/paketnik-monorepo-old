FROM tensorflow/tensorflow:2.16.2-gpu

WORKDIR /app

RUN apt-get update && apt-get install ffmpeg libsm6 libxext6  -y

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

# Copy the source code
COPY src/ ./src/
COPY download_dataset.py .
COPY startup.sh .

# Create data directory
RUN mkdir -p /app/data

# Make startup script executable
RUN chmod +x startup.sh

EXPOSE 8000

# Use startup script that downloads data then starts the app
CMD ["./startup.sh"] 