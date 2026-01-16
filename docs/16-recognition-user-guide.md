# Target Image Recognition - User Guide

## Overview

The Target Image Recognition feature allows you to upload photos of your shooting targets and automatically detect bullet hole placements. This saves time and provides accurate shot data for your records.

## Getting Started

### Prerequisites

Before using this feature, you need to start the Python detection service:

```bash
cd python-ocr
./start-detector.sh  # Mac/Linux
# OR
start-detector.bat   # Windows
```

You should see: `Starting Target Detection Service on http://localhost:5001`

**Note**: Keep this terminal window open while using the feature.

## Step-by-Step Usage

### 1. Navigate to a Target Sheet

- Go to any Range Session
- Click on a Target Sheet (or create a new one)
- You'll see the sheet detail page with 6 bulls

### 2. Click the Upload Button

- Look for the **"Upload"** button in the top right corner
- It's positioned between the "Edit Sheet" and "Save Scores" buttons
- Click it to open the upload modal

### 3. Add Your Target Images

You have three options:

#### Option A: Drag & Drop
- Drag image files from your computer
- Drop them onto the upload area
- Multiple files can be added at once

#### Option B: Click to Select
- Click anywhere in the upload area
- Browse and select image files
- Hold Ctrl/Cmd to select multiple files

#### Option C: Paste from Clipboard
- Copy an image (from phone, screenshot, etc.)
- Press **Ctrl+V** (Windows/Linux) or **Cmd+V** (Mac)
- Image will appear in the upload list

### 4. Select Bull for Each Image

- Each uploaded image shows a dropdown menu
- Select which bull (1-6) the image corresponds to
- You can upload different images for different bulls
- Or upload multiple angles of the same bull (latest will be used)

### 5. Process the Images

- Review your selections
- Click **"Process All"** button
- Wait 2-5 seconds per image
- Status will show:
  - ⏳ "Processing..." (with spinner)
  - ✅ "X shots" (success with detected count)
  - ❌ "Error" (if detection failed)

### 6. Review Results

After processing:
- Each image shows the number of detected shots
- Shots are automatically added to the corresponding bull
- You can see the shots on the interactive target visualization
- The shot positions and scores are calculated automatically

### 7. Save Your Work

- Click **"Save Scores"** button (top right or bottom)
- All data is saved to the database
- Images are stored and linked to bulls
- You can view them anytime

### 8. View Saved Images

- Look for the **"View"** button on any bull card
- It only appears if an image has been uploaded for that bull
- Click it to see the full-size target image
- The viewer shows the original photo and detected shot count

## Tips for Best Results

### Image Quality

**✅ DO:**
- Use good, even lighting (natural daylight is best)
- Take photos straight-on (perpendicular to target)
- Get close enough that target fills most of the frame
- Ensure image is sharp and in focus
- Use clean, undamaged targets when possible
- Take photos in landscape orientation

**❌ DON'T:**
- Take photos in dim lighting or with harsh shadows
- Photograph at an angle (causes distortion)
- Include too much background clutter
- Use blurry or out-of-focus images
- Photograph torn or heavily damaged targets
- Use extremely high-resolution images (over 10MB)

### File Formats

**Supported:**
- JPEG/JPG (recommended)
- PNG
- WEBP

**Maximum Size:** 10MB per image

### Shooting Conditions

Works best with:
- Standard bullseye targets
- Clear, round bullet holes
- Minimal shot overlap
- Targets with visible rings for scale reference

May struggle with:
- Shotgun patterns (too many holes)
- Heavily overlapping shots
- Torn or damaged holes
- Non-circular impacts

## Understanding Detection Results

### Coordinate System

- Detected shots are mapped to a 200x200 coordinate system
- Center of target is at (100, 100)
- Coordinates match the interactive target visualization

### Score Calculation

Scores are calculated based on distance from center:

| Distance from Center | Score | Ring Color |
|---------------------|-------|------------|
| 0-5% (center dot)   | 5     | Red        |
| 5-15% (inner ring)  | 5     | Red        |
| 15-30%              | 4     | Black      |
| 30-45%              | 3     | Dark Gray  |
| 45-60%              | 2     | Gray       |
| 60-80%              | 1     | Light Gray |
| 80%+ (outer/miss)   | 0     | White      |

### Confidence

Each detected shot has a confidence score (typically 0.8-0.95). Lower confidence may indicate:
- Faint bullet holes
- Overlapping shots
- Target damage
- Poor image quality

## Manual Adjustments

If detection isn't perfect:

1. **Add Missing Shots**: Click on the interactive target to manually add shots
2. **Remove False Positives**: Click on detected shots to remove them
3. **Adjust Positions**: Drag shots to correct positions
4. **Change Scores**: Shots will recalculate scores based on position

The system merges detected shots with manual entries, so you have full control.

## Troubleshooting

### "Detection service is not running"

**Problem**: The Python service isn't started or isn't reachable.

**Solution**:
```bash
cd python-ocr
./start-detector.sh  # or start-detector.bat on Windows
```

Verify it's running by visiting: http://localhost:5001/health

### "No shots detected"

**Possible Causes**:
- Image quality is poor (see tips above)
- Bullet holes are too faint
- Target is at an angle
- Background is too cluttered

**Solutions**:
- Retake photo with better lighting
- Get closer to target
- Ensure target is flat and straight
- Manually add shots if needed

### "Too many false detections"

**Possible Causes**:
- Target has damage or tears
- Background has circular objects
- Image has artifacts or noise

**Solutions**:
- Use a cleaner target
- Crop image to just the target
- Remove false positives manually
- Adjust detection parameters (advanced)

### "File size too large"

**Problem**: Image exceeds 10MB limit.

**Solution**:
- Resize image before uploading
- Use JPEG format with compression
- Crop to just the target area

### "Processing takes too long"

**Normal**: 2-5 seconds per image is expected.

**If longer**:
- Check Python service logs for errors
- Reduce image resolution
- Process fewer images at once

## Advanced: Adjusting Detection Parameters

If you're getting poor results consistently, you can adjust the detection algorithm.

**File**: `python-ocr/target_detector.py`

**Line ~90** in the `detect_bullet_holes()` function:

```python
circles = cv2.HoughCircles(
    gray,
    cv2.HOUGH_GRADIENT,
    dp=1.2,
    minDist=15,    # ← Increase if detecting same hole multiple times
    param1=50,     # ← Increase if too many false positives
    param2=25,     # ← Decrease to detect more holes (increase for fewer)
    minRadius=3,   # ← Adjust based on bullet hole size in pixels
    maxRadius=20   # ← Adjust based on bullet hole size in pixels
)
```

**After changes**: Restart the Python service.

## Workflow Examples

### Example 1: Single Bull Practice

1. Shoot 10 rounds at Bull 1
2. Take photo of target
3. Upload to sheet
4. Select "Bull 1"
5. Process
6. Review 10 detected shots
7. Save

### Example 2: Full Sheet (6 Bulls)

1. Shoot complete target (all 6 bulls)
2. Take 6 separate photos (one per bull)
3. Upload all 6 images at once
4. Assign each image to its bull (1-6)
5. Click "Process All"
6. Review all detected shots
7. Make any manual adjustments
8. Save

### Example 3: Multiple Sessions

1. Shoot several targets at the range
2. Take photos of each
3. Create sheets for each target
4. Upload and process images
5. Compare performance across sessions in Analytics

## Privacy & Storage

### Where Images Are Stored

- Images are saved to your local server: `/public/uploads/targets/`
- Filenames include sheet ID and timestamp
- Images are NOT uploaded to any external service
- Only you have access to your images

### Database Storage

- Image URL (path to file)
- Upload timestamp
- Detected shot count
- Shot positions and scores

### Deleting Images

To remove an image:
1. Clear the bull (removes all data including image reference)
2. Manually delete the file from `/public/uploads/targets/` if desired

## Performance & Limitations

### What It Does Well

✅ Detects clear, round bullet holes
✅ Works with standard bullseye targets
✅ Handles 5-30 shots per target
✅ Accurate score calculation
✅ Fast processing (2-5 seconds)

### Current Limitations

❌ Struggles with shotgun patterns (too many holes)
❌ May miss very faint holes
❌ Can't detect shots on non-circular targets (yet)
❌ Requires Python service to be running
❌ Doesn't work with heavily damaged targets

### Future Improvements

Planned enhancements:
- ML model for improved accuracy
- Support for different target types (IPSC, steel, etc.)
- Auto-rotation and perspective correction
- Shot grouping analysis (ES, SD)
- Mobile app with camera integration
- GPU acceleration for faster processing

## FAQ

**Q: Do I need to start the Python service every time?**
A: Yes, the detection service must be running to process images. You can leave it running in the background.

**Q: Can I use this on mobile?**
A: The web interface works on mobile, but the Python service needs to run on a computer. Future updates will include a mobile app.

**Q: What if detection misses some shots?**
A: You can manually add missing shots by clicking on the interactive target visualization.

**Q: Can I reprocess an image with different settings?**
A: Currently no, but you can delete and re-upload. Future updates will add this feature.

**Q: Does this work offline?**
A: Yes! Both the Next.js app and Python service run locally. No internet required.

**Q: Can I batch process multiple sessions?**
A: You can upload multiple images per session, but each must be assigned to a bull. Full batch processing across sessions is a future feature.

## Support

For issues or questions:

1. **Check this guide** - Most common issues are covered above
2. **Review setup guide** - See `readme/15-target-recognition-setup.md`
3. **Check Python logs** - Look at the terminal where service is running
4. **Verify image quality** - Follow the tips in this guide
5. **Try manual entry** - The feature is optional; manual entry always works

## Summary

The Target Image Recognition feature is a powerful tool for quickly and accurately recording your shooting data. While it works best with clean, well-lit images, it can save significant time compared to manual entry. Combined with manual adjustments, it provides a flexible and efficient workflow for tracking your shooting performance.

**Happy Shooting! 🎯**
