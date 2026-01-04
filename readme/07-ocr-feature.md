# OCR Feature for Range Notes

## Overview
Added OCR (Optical Character Recognition) capability to automatically extract shooting data from images of handwritten range notes.

## How to Use

1. **Navigate to New Sheet**: Go to any range session and click "New Sheet"

2. **Upload Image**:
   - Click the upload area to select an image file
   - OR paste an image directly with Cmd+V (Mac) or Ctrl+V (Windows)
   - Supported formats: JPEG, PNG, and other common image formats

3. **Process Image**: 
   - Click "Process Image" button
   - OCR will extract text and parse the data
   - Progress bar shows processing status

4. **Review Results**:
   - Successfully parsed data shows in a green card
   - Number of bulls detected is displayed
   - Distance is auto-filled if found in the image

5. **Edit if Needed**:
   - Click "Edit Data" to review/correct parsed values
   - Modify any scores that were incorrectly read
   - Remove bulls that shouldn't be included
   - Click "Done Editing" when finished

6. **Create Sheet**:
   - Fill in the standard form (firearm, caliber, optic, etc.)
   - Submit to create the sheet
   - Bull data is automatically saved with the sheet

## Expected Image Format

The OCR works best with clear, well-lit images in this format:

```
5.56 @ 20 yds DMH 1/5

Bull#  5  4  3  2  1  0
1      2  1  6  1  0  4
2      1  2  5  2  0  3
3      1  4  5  0  0  2
...
```

## Troubleshooting

**If no data is parsed:**
- Click "View Raw OCR Text" to see what was extracted
- Check image quality and lighting
- Ensure handwriting is clear
- Try retaking the photo with better contrast

**If data is incorrect:**
- Use the "Edit Data" feature to manually correct values
- Remove incorrect bulls with the trash icon
- Adjust individual score counts as needed

## Technical Details

- Uses Tesseract.js for client-side OCR
- Parser looks for:
  - Distance pattern: `\d+ yds` or `\d+ yards`
  - Bull data: Lines with 7+ numbers (bull# + 6 scores)
- All processing happens in your browser (no server upload)
- Original images are not saved or sent anywhere

