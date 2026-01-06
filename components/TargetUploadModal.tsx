"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, X, Loader2, CheckCircle, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface ImageUpload {
  id: string;
  file?: File;
  dataUrl: string;
  bullIndex: number;
  status: "pending" | "processing" | "success" | "error";
  detectedShots?: Array<{ x: number; y: number; score: number }>;
  error?: string;
}

interface TargetUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sheetId: string;
  onShotsDetected: (bullIndex: number, shots: Array<{ x: number; y: number; score: number }>, imageUrl: string) => void;
}

export function TargetUploadModal({ open, onOpenChange, sheetId, onShotsDetected }: TargetUploadModalProps) {
  const [images, setImages] = useState<ImageUpload[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle paste from clipboard
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (!open) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleFileAdd(file);
          }
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [open]);

  const handleFileAdd = (file: File) => {
    // Validate file type
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Invalid file type. Only JPG, PNG, and WEBP are supported.");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const newImage: ImageUpload = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        dataUrl,
        bullIndex: 1, // Default to bull 1
        status: "pending",
      };
      setImages((prev) => [...prev, newImage]);
    };
    reader.readAsDataURL(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(handleFileAdd);
  };

  const handleRemoveImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleBullIndexChange = (id: string, bullIndex: number) => {
    setImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, bullIndex } : img))
    );
  };

  const handleProcessAll = async () => {
    if (images.length === 0) {
      toast.error("Please add at least one image");
      return;
    }

    setProcessing(true);

    try {
      // Process images using batch endpoint
      const batchData = {
        images: images.map((img) => ({
          imageData: img.dataUrl,
          bullIndex: img.bullIndex,
        })),
        sheetId,
      };

      const response = await fetch("/api/bulls/detect-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batchData),
      });

      if (!response.ok) {
        throw new Error("Failed to process images");
      }

      const data = await response.json();

      if (data.success) {
        // Update image statuses and trigger callbacks
        data.results.forEach((result: any) => {
          setImages((prev) =>
            prev.map((img) =>
              img.bullIndex === result.bullIndex
                ? {
                    ...img,
                    status: result.success ? "success" : "error",
                    detectedShots: result.detectedShots,
                    error: result.error,
                  }
                : img
            )
          );

          if (result.success) {
            onShotsDetected(result.bullIndex, result.detectedShots || [], result.imageUrl);
          }
        });

        toast.success(`Processed ${data.results.filter((r: any) => r.success).length} images successfully`);
      }
    } catch (error: any) {
      console.error("Processing error:", error);
      toast.error(error.message || "Failed to process images");
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setImages([]);
    onOpenChange(false);
  };

  const allProcessed = images.length > 0 && images.every((img) => img.status !== "pending");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Target Images</DialogTitle>
          <DialogDescription>
            Upload or paste images of your targets. We'll automatically detect bullet placements.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload Area */}
          <div
            className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Click to upload or paste images (Ctrl/Cmd+V)
            </p>
            <p className="text-xs text-muted-foreground">
              Supports JPG, PNG, WEBP (max 10MB per image)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Image List */}
          {images.length > 0 && (
            <div className="space-y-3">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30"
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-24 h-24 bg-muted rounded overflow-hidden">
                    <img
                      src={img.dataUrl}
                      alt="Target"
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Bull Selection */}
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">
                      Select Bull
                    </label>
                    <Select
                      value={img.bullIndex.toString()}
                      onValueChange={(value) =>
                        handleBullIndexChange(img.id, parseInt(value))
                      }
                      disabled={img.status !== "pending"}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            Bull {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status */}
                  <div className="flex-shrink-0 w-32 text-sm">
                    {img.status === "pending" && (
                      <span className="text-muted-foreground">Ready</span>
                    )}
                    {img.status === "processing" && (
                      <span className="flex items-center gap-2 text-blue-600">
                        <Spinner size="sm" />
                        Processing...
                      </span>
                    )}
                    {img.status === "success" && (
                      <span className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        {img.detectedShots?.length || 0} shots
                      </span>
                    )}
                    {img.status === "error" && (
                      <span className="flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Error
                      </span>
                    )}
                  </div>

                  {/* Remove Button */}
                  {img.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveImage(img.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {allProcessed ? "Close" : "Cancel"}
          </Button>
          {!allProcessed && (
            <Button onClick={handleProcessAll} disabled={processing || images.length === 0}>
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Process All ({images.length})
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
