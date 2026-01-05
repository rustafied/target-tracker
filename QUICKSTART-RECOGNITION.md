# Target Image Recognition - Quick Start

## 🚀 Get Started in 3 Steps

### Step 1: Install Python Dependencies

```bash
cd python-ocr
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Step 2: Start the Detection Service

```bash
./start-detector.sh
```

You should see:
```
Starting Target Detection Service on http://localhost:5001
```

### Step 3: Use It!

1. Navigate to any Target Sheet in your app
2. Click **"Upload"** button (top right)
3. Upload or paste target images
4. Select which bull each image belongs to
5. Click **"Process All"**
6. Review detected shots and save!

## 📸 Tips for Best Results

- **Good lighting** - Avoid shadows
- **Straight angle** - Photo target head-on
- **Clean targets** - Works best with clear bullet holes
- **Close up** - Fill the frame with the target

## 🔧 Troubleshooting

### Service won't start?
```bash
cd python-ocr
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 target_detector.py
```

### Detection not working?
- Check that service is running on port 5001
- Verify image quality (see tips above)
- Try adjusting manually after detection

### Need more help?
See the full guide: [readme/15-target-recognition-setup.md](./readme/15-target-recognition-setup.md)

## 🎯 What It Does

- Automatically detects bullet holes in target images
- Maps shots to coordinate system
- Calculates scores (0-5) based on distance from center
- Saves images for future reference
- Merges with existing manual entries

## 🛠 Technology

- **OpenCV** - Circle detection (Hough Transform)
- **Flask** - Python REST API
- **Next.js** - File handling and UI
- **MongoDB** - Image metadata storage

---

**Full Documentation**: See [readme/14-target-image-recognition.md](./readme/14-target-image-recognition.md) for complete feature specification.
