"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Upload, Image as ImageIcon, X, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import { performOCR, ParsedSheetData } from "@/lib/ocr-parser";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OCRUploaderProps {
  onDataParsed: (data: ParsedSheetData) => void;
}

export function OCRUploader({ onDataParsed }: OCRUploaderProps) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [rawOcrText, setRawOcrText] = useState<string>("");
  const [showRawText, setShowRawText] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setImageFile(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          setImageFile(file);
          
          const reader = new FileReader();
          reader.onload = (e) => {
            setImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
          
          toast.success('Image pasted! Click "Process Image" to extract data.');
        }
        break;
      }
    }
  };

  const handleProcess = async () => {
    if (!imageFile) {
      toast.error('Please select or paste an image first');
      return;
    }

    setProcessing(true);
    setProgress(0);

    try {
      // Import Tesseract dynamically to get raw text
      const Tesseract = await import('tesseract.js');
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data: { text } } = await worker.recognize(imageFile);
      await worker.terminate();

      setRawOcrText(text);

      // Now parse it
      const { parseRangeNotes } = await import('@/lib/ocr-parser');
      const data = parseRangeNotes(text);
      
      if (data.bullsData.length === 0) {
        toast.error('No bull data found. Click "View Raw OCR Text" to debug.');
        setShowRawText(true);
        return;
      }

      toast.success(`Successfully parsed ${data.bullsData.length} bulls!`);
      onDataParsed(data);
    } catch (error) {
      toast.error('Failed to process image. Please try again.');
      console.error(error);
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const handleClear = () => {
    setImageFile(null);
    setImagePreview(null);
    setProgress(0);
    setRawOcrText("");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Upload Range Notes (OCR)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Upload or Paste Image</Label>
            <div
              className="mt-2 border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onPaste={handlePaste}
              tabIndex={0}
            >
              {imagePreview ? (
                <div className="relative">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="max-h-64 mx-auto rounded"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClear();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Click to upload or paste (Cmd/Ctrl+V) an image of your range notes
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPEG, PNG, or other image formats
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {imageFile && (
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleProcess}
                disabled={processing}
                className="flex-1"
              >
                {processing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing... {progress}%
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Process Image
                  </>
                )}
              </Button>
              {rawOcrText && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowRawText(true)}
                  disabled={processing}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Raw Text
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleClear}
                disabled={processing}
              >
                Clear
              </Button>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-1">
            <p className="font-semibold">Tips for best results:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Write clearly with good spacing between numbers</li>
              <li>Use dark pen/pencil on white paper</li>
              <li>Take photo with good lighting (no shadows)</li>
              <li>Keep camera directly above paper (not angled)</li>
              <li>Format: Bull# then 6 numbers (5, 4, 3, 2, 1, 0 counts)</li>
              <li>Distance info: e.g., "20 yds" or "100 yards"</li>
            </ul>
            <p className="text-xs italic mt-2">Note: You can review and edit all parsed data before creating the sheet</p>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showRawText} onOpenChange={setShowRawText}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Raw OCR Text</DialogTitle>
            <DialogDescription>
              This is the text extracted from the image. Use this to debug if parsing failed.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted p-4 rounded-lg">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {rawOcrText || "No text extracted yet"}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}


