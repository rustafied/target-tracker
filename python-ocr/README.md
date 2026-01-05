# Target Detection Service

Python Flask service for detecting bullet holes in target images using OpenCV.

## Setup

```bash
# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

## Running

```bash
# Start the service
python target_detector.py

# Or with explicit Python 3
python3 target_detector.py
```

The service will start on `http://localhost:5001`

## API Endpoints

### Health Check
```
GET /health
```

### Single Image Detection
```
POST /detect
Content-Type: application/json

{
  "imageData": "base64_encoded_image_string",
  "targetType": "bullseye"  // optional, defaults to "bullseye"
}
```

Response:
```json
{
  "success": true,
  "result": {
    "shots": [
      {"x": 95.5, "y": 102.3, "score": 5, "confidence": 0.85},
      {"x": 110.2, "y": 98.7, "score": 4, "confidence": 0.82}
    ],
    "targetCenter": {"x": 512, "y": 480},
    "targetRadius": 450,
    "detectedCount": 2
  }
}
```

### Batch Detection
```
POST /detect-batch
Content-Type: application/json

{
  "images": [
    {"imageData": "base64_image_1", "bullIndex": 1},
    {"imageData": "base64_image_2", "bullIndex": 2}
  ]
}
```

## How It Works

1. **Image Preprocessing**: Converts to grayscale and applies bilateral filter
2. **Target Detection**: Finds the outer ring to determine center and scale
3. **Bullet Hole Detection**: Uses Hough Circle Transform to detect circular holes
4. **Coordinate Mapping**: Maps detected positions to 200x200 SVG coordinate system
5. **Score Calculation**: Calculates score (0-5) based on distance from center

## Parameters Tuning

If detection isn't working well, adjust these parameters in `detect_bullet_holes()`:

- `minDist`: Minimum distance between bullet holes (default: 15)
- `param1`: Canny edge threshold (default: 50)
- `param2`: Accumulator threshold - lower = more detections (default: 25)
- `minRadius`: Minimum bullet hole size (default: 3)
- `maxRadius`: Maximum bullet hole size (default: 20)
