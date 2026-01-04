import Tesseract from 'tesseract.js';

export interface ParsedSheetData {
  distance?: number;
  bullsData: {
    bullIndex: number;
    score5Count: number;
    score4Count: number;
    score3Count: number;
    score2Count: number;
    score1Count: number;
    score0Count: number;
  }[];
}

/**
 * Preprocess image to improve OCR accuracy
 */
async function preprocessImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Grayscale
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        
        // Increase contrast using threshold
        const threshold = 128;
        const value = gray > threshold ? 255 : 0;
        
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
      }
      
      // Put processed image back
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to data URL
      resolve(canvas.toDataURL('image/png'));
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Parse OCR text from range notes into structured data
 * Expected format: bull# followed by 5 4 3 2 1 0 counts
 */
export function parseRangeNotes(text: string): ParsedSheetData {
  const result: ParsedSheetData = {
    distance: undefined,
    bullsData: []
  };

  // Try to extract distance
  const distanceMatch = text.match(/(\d+)\s*(?:yds?|yards?)/i);
  if (distanceMatch) {
    result.distance = parseInt(distanceMatch[1]);
  }

  // Extract ALL numbers from the text
  const allNumbers = text.match(/\d+/g);
  
  if (!allNumbers || allNumbers.length === 0) {
    return result;
  }

  // Convert to integers
  const nums = allNumbers.map(n => parseInt(n));
  
  // Try to identify bull data patterns
  // Looking for: bullIndex (1-10) followed by 6 numbers (scores)
  for (let i = 0; i < nums.length - 6; i++) {
    const potentialBullIndex = nums[i];
    
    // Check if this looks like a bull index
    if (potentialBullIndex >= 1 && potentialBullIndex <= 10) {
      const scores = nums.slice(i + 1, i + 7);
      
      // Validate scores (should be reasonable shot counts 0-20)
      if (scores.every(s => s >= 0 && s <= 20)) {
        // Check if we already have this bull index
        const existingBull = result.bullsData.find(b => b.bullIndex === potentialBullIndex);
        
        if (!existingBull) {
          result.bullsData.push({
            bullIndex: potentialBullIndex,
            score5Count: scores[0],
            score4Count: scores[1],
            score3Count: scores[2],
            score2Count: scores[3],
            score1Count: scores[4],
            score0Count: scores[5],
          });
        }
      }
    }
  }

  // Sort by bull index
  result.bullsData.sort((a, b) => a.bullIndex - b.bullIndex);

  return result;
}

/**
 * Perform OCR on an image with preprocessing
 */
export async function performOCR(
  imageFile: File,
  onProgress?: (progress: number) => void
): Promise<ParsedSheetData> {
  try {
    // Preprocess image
    const processedImage = await preprocessImage(imageFile);
    
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          onProgress(Math.round(m.progress * 100));
        }
      },
    });

    // Configure for better digit recognition
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789 ydsYDS@./\n',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });

    const { data: { text } } = await worker.recognize(processedImage);
    await worker.terminate();

    console.log('OCR Result:', text);
    return parseRangeNotes(text);
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to process image');
  }
}

