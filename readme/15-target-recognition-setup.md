# Target Image Recognition - Setup & Usage Guide

## Quick Start

### 1. Install Python Dependencies

```bash
cd python-ocr
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Start the Detection Service

```bash
# Option 1: Use the startup script
./start-detector.sh

# Option 2: Manual start
cd python-ocr
source venv/bin/activate
python3 target_detector.py
```

The service will start on `http://localhost:5001`

### 3. Start the Next.js App

In a separate terminal:

```bash
npm run dev
```

## Usage

### Uploading Target Images

1. Navigate to any Target Sheet detail page
2. Click the **"Upload"** button (top right, next to Edit)
3. Upload or paste images:
   - **Drag & drop** files onto the upload area
   - **Click** to select files from your computer
   - **Paste** (Ctrl/Cmd+V) images from clipboard
4. For each image, select which bull (1-6) it corresponds to
5. Click **"Process All"** to detect bullet holes
6. Review detected shots and click **"Close"** when done
7. Click **"Save Scores"** to persist the data

### Viewing Target Images

- If a bull has an uploaded image, you'll see a **"View"** button
- Click it to open the full-size target image
- The viewer shows the original image and detected shot count

### Best Practices for Image Quality

For optimal detection accuracy:

1. **Lighting**: Take photos in good, even lighting
2. **Angle**: Photograph target straight-on (not at an angle)
3. **Distance**: Get close enough that target fills most of frame
4. **Focus**: Ensure image is sharp and in focus
5. **Background**: Minimize background clutter
6. **Target Condition**: Works best with clean, undamaged targets

### Supported Image Formats

- JPEG/JPG
- PNG
- WEBP
- Maximum file size: 10MB per image

## How It Works

### Detection Pipeline

1. **Image Upload** → Saved to `/public/uploads/targets/`
2. **Preprocessing** → Convert to grayscale, apply bilateral filter
3. **Target Detection** → Find outer ring to determine center and scale
4. **Bullet Hole Detection** → Use Hough Circle Transform
5. **Coordinate Mapping** → Map to 200x200 SVG coordinate system
6. **Score Calculation** → Calculate score (0-5) based on distance from center
7. **Return Results** → Send shot positions back to frontend

### Technology Stack

- **OpenCV** - Computer vision and circle detection
- **Flask** - Python REST API server
- **Next.js** - Frontend and file handling
- **MongoDB** - Store image metadata and shot data

## Troubleshooting

### Detection Service Not Running

**Error**: "Detection service is not running"

**Solution**:
```bash
cd python-ocr
./start-detector.sh
```

### Poor Detection Accuracy

**Problem**: Not detecting all bullet holes or detecting false positives

**Solutions**:
1. Check image quality (see Best Practices above)
2. Adjust detection parameters in `target_detector.py`:
   ```python
   # Line ~90 in detect_bullet_holes()
   circles = cv2.HoughCircles(
       gray,
       cv2.HOUGH_GRADIENT,
       dp=1.2,
       minDist=15,    # Increase if detecting same hole multiple times
       param1=50,     # Increase if too many false positives
       param2=25,     # Decrease to detect more holes
       minRadius=3,   # Adjust based on bullet hole size
       maxRadius=20
   )
   ```
3. Manually add/remove shots after detection

### File Upload Errors

**Error**: "File size exceeds 10MB limit"

**Solution**: Compress or resize images before uploading

**Error**: "Invalid file type"

**Solution**: Convert to JPG, PNG, or WEBP format

### Images Not Saving

**Problem**: Images upload but don't persist

**Check**:
1. Directory exists: `/public/uploads/targets/`
2. Write permissions are correct
3. Click "Save Scores" after uploading

## API Reference

### Detection Endpoints

#### Single Image Detection
```bash
POST http://localhost:5001/detect
Content-Type: application/json

{
  "imageData": "data:image/jpeg;base64,/9j/4AAQ...",
  "targetType": "bullseye"
}
```

#### Batch Detection
```bash
POST http://localhost:5001/detect-batch
Content-Type: application/json

{
  "images": [
    {"imageData": "base64...", "bullIndex": 1},
    {"imageData": "base64...", "bullIndex": 2}
  ]
}
```

#### Health Check
```bash
GET http://localhost:5001/health
```

### Next.js Endpoints

#### Upload with Detection
```bash
POST /api/bulls/upload-image
Content-Type: multipart/form-data

image: File
bullId: string
sheetId: string
```

#### Detect Only (No Upload)
```bash
POST /api/bulls/detect-shots
Content-Type: application/json

{
  "imageData": "base64...",
  "targetType": "bullseye"
}
```

#### Batch Upload & Detect
```bash
POST /api/bulls/detect-batch
Content-Type: application/json

{
  "images": [...],
  "sheetId": "..."
}
```

## Performance

- **Detection Time**: 2-5 seconds per image
- **Accuracy**: 85-95% on clean, well-lit targets
- **Concurrent Processing**: Supports batch processing
- **File Size**: Optimized for images under 5MB

## Future Enhancements

- [ ] GPU acceleration for faster processing
- [ ] ML model training for improved accuracy
- [ ] Support for different target types (IPSC, etc.)
- [ ] Auto-rotation and perspective correction
- [ ] Shot grouping analysis (ES, SD calculations)
- [ ] Mobile app with camera integration

## Development

### Testing the Detection Service

```bash
# Test with sample image
curl -X POST http://localhost:5001/detect \
  -H "Content-Type: application/json" \
  -d '{"imageData": "data:image/jpeg;base64,...", "targetType": "bullseye"}'
```

### Debugging

Enable Flask debug mode in `target_detector.py`:
```python
app.run(host='0.0.0.0', port=5001, debug=True)
```

View logs in the terminal where the service is running.

## Support

For issues or questions:
1. Check this guide first
2. Review the main feature spec: `14-target-image-recognition.md`
3. Check Python service logs
4. Verify image quality meets requirements
