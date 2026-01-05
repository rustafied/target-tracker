# Target Image Recognition System

## Overview

This feature enables automatic detection and analysis of bullet placements from uploaded target images. Users can upload or paste images of their shooting targets, and the system will automatically detect bullet holes, calculate their positions, and add them to their target sheets.

## Feature Scope

### User Interface

#### Sheet Page Enhancements
1. **Upload Button** (Top Right, next to Edit button)
   - Opens upload modal
   - Only visible on sheet detail page
   - Primary action button style

2. **Upload Modal**
   - Supports multiple image upload (file picker)
   - Supports paste from clipboard
   - Image preview for each uploaded image
   - Bull selection dropdown for each image (Bulls 1-6)
   - Process button to trigger detection
   - Shows processing status and results

3. **View Image Button** (Bull Cards)
   - Positioned left of the Expand button
   - Only visible if image exists for that bull
   - Opens image viewer modal
   - Shows original target image with detected shots overlaid

### Backend Architecture

#### Image Processing Service (Python/Flask)
**Technology Stack:**
- **OpenCV (cv2)** - Primary computer vision library
- **Hough Circle Transform** - Bullet hole detection algorithm
- **Flask** - REST API server
- **NumPy** - Numerical processing

**Detection Algorithm:**
1. Convert image to grayscale
2. Apply Gaussian blur for noise reduction
3. Use edge detection (Canny)
4. Apply Hough Circle Transform to detect circular bullet holes
5. Filter detections by size/confidence
6. Map detected circles to target coordinate system (200x200 viewBox)
7. Calculate score for each shot based on distance from center
8. Return shot positions array

#### Image Storage Strategy
**File System Storage:**
- Store images in `/public/uploads/targets/` directory
- Filename format: `{sheetId}_{bullIndex}_{timestamp}.{ext}`
- Supported formats: JPG, PNG, WEBP
- Maximum file size: 10MB per image
- Images served statically through Next.js public folder

#### API Endpoints

**1. POST `/api/bulls/upload-image`**
```typescript
Request:
- multipart/form-data
- image: File
- bullId: string
- sheetId: string

Response:
{
  success: boolean,
  imageUrl: string,
  detectedShots: Array<{x: number, y: number, score: number}>
}
```

**2. GET `/api/bulls/{bullId}/image`**
```typescript
Response:
{
  imageUrl: string,
  uploadedAt: Date,
  detectedShots: number
}
```

**3. POST `/api/process-target`**
```typescript
Request:
{
  imageData: string (base64),
  targetType: "bullseye" // for future expansion
}

Response:
{
  shots: Array<{x: number, y: number, confidence: number, score: number}>
}
```

### Data Model Updates

#### BullRecord Schema Addition
```typescript
{
  // ... existing fields
  imageUrl?: string,  // Path to stored target image
  imageUploadedAt?: Date,
  detectedShotCount?: number,
  detectionConfidence?: number // Average confidence of detections
}
```

### Processing Pipeline

1. **User uploads image** → Modal shows preview
2. **User selects bull** → Associates image with specific bull (1-6)
3. **User clicks "Process"** → 
   - Upload image to server
   - Save to file system
   - Send to Python detection service
   - Receive shot positions
4. **Display results** → Show detected shots on preview
5. **User confirms** → 
   - Update bull record with imageUrl
   - Merge detected shots with existing shots
   - Save to database
6. **View functionality** → Click "View Image" to see original with overlay

### Technical Implementation Details

#### OpenCV Detection Configuration

**Hough Circle Parameters (tuned for bullet holes):**
```python
circles = cv2.HoughCircles(
    gray_image,
    cv2.HOUGH_GRADIENT,
    dp=1.2,              # Inverse ratio of accumulator resolution
    minDist=20,          # Minimum distance between circle centers (pixels)
    param1=50,           # Canny edge detector threshold
    param2=30,           # Accumulator threshold for circle detection
    minRadius=3,         # Minimum circle radius (bullet hole size)
    maxRadius=15         # Maximum circle radius
)
```

**Coordinate System Mapping:**
- Target images are arbitrary resolution
- Detect target center (largest circle or image center)
- Detect outer ring for scale reference
- Map bullet hole positions to 200x200 SVG coordinate system
- Calculate score based on distance from center using existing scoring rings

**Score Calculation:**
- Use the same ring radii as InteractiveTargetInput component
- Map detected (x,y) to score zones (0-5)
- Distance from center determines score

### User Flow

1. **Navigate to Sheet Detail Page**
2. **Click "Upload" button** (top right)
3. **Upload/Paste Images**
   - Drag & drop files
   - Click to select files
   - Paste from clipboard (Ctrl/Cmd+V)
4. **For each image:**
   - Preview displayed
   - Select bull (1-6) from dropdown
5. **Click "Process All"**
   - Shows loading state
   - Detects shots for each image
   - Shows preview with detected shots
6. **Review & Confirm**
   - View detected shots overlaid on image
   - Adjust if needed (manual add/remove)
   - Click "Add to Bulls"
7. **Shots added to selected bulls**
   - Existing shots preserved
   - New shots merged
   - Image linked to bull
8. **View anytime**
   - Click "View Image" button on bull card
   - See original target with shot overlay

### Future Enhancements

1. **Multi-target detection** - Detect multiple bulls in single image
2. **Target type recognition** - Support different target types (IPSC, etc.)
3. **Auto-calibration** - Automatically detect target scale and orientation
4. **Batch processing** - Process entire shooting session at once
5. **Mobile app integration** - Take photo directly on range
6. **AI/ML improvements** - Train custom model for better accuracy
7. **Shot grouping analysis** - Calculate group size, ES, SD
8. **Comparison mode** - Compare before/after images

### Testing Strategy

1. **Unit Tests**
   - OpenCV detection accuracy with sample targets
   - Coordinate mapping correctness
   - Score calculation validation

2. **Integration Tests**
   - End-to-end upload and detection flow
   - Image storage and retrieval
   - Bull record updates

3. **User Acceptance Testing**
   - Test with variety of target images
   - Different lighting conditions
   - Various bullet hole sizes
   - Damaged/torn targets

### Limitations & Considerations

1. **Detection Accuracy**
   - Works best with clean, well-lit images
   - Requires clear bullet holes (not torn)
   - May struggle with overlapping shots
   - Manual correction may be needed

2. **Performance**
   - Processing time: 2-5 seconds per image
   - Depends on image resolution and shot count
   - May need queue for batch processing

3. **Image Quality Requirements**
   - Minimum resolution: 800x600
   - Good lighting (no shadows)
   - Target should be flat (not warped)
   - Minimal background noise

## Technology Justification

### Why OpenCV + Hough Transform?

1. **Free & Open Source** - No licensing costs
2. **Battle-tested** - Industry standard for circle detection
3. **Fast** - Real-time processing capability
4. **Accurate** - Excellent for detecting circular objects
5. **Python Integration** - Already have Python environment set up
6. **Extensive Documentation** - Large community support

### Why Not OCR (Tesseract/EasyOCR)?

- OCR is for text recognition, not object detection
- Bullet holes are visual objects, not text
- Hough Circle Transform is purpose-built for this use case

### Why Not ML/AI Models?

- Overkill for this specific use case
- Requires training data and model maintenance
- Slower processing time
- Traditional CV is sufficient and more reliable
- Can upgrade to ML later if needed

## Implementation Timeline

1. ✅ Research & Documentation (Current)
2. Backend Python service setup (2-3 hours)
3. API endpoints (2-3 hours)
4. Database schema updates (1 hour)
5. Frontend upload modal (3-4 hours)
6. Integration & testing (2-3 hours)
7. Polish & bug fixes (2-3 hours)

**Total Estimated Time: 12-16 hours**

## Success Metrics

- 85%+ detection accuracy on clean targets
- < 5 second processing time per image
- 90%+ user satisfaction
- Reduces manual entry time by 70%
