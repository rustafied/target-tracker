"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface ImageViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  bullIndex: number;
  shotCount?: number;
  bullId: string;
  onImageDeleted?: () => void;
}

export function ImageViewerModal({
  open,
  onOpenChange,
  imageUrl,
  bullIndex,
  shotCount,
  bullId,
  onImageDeleted,
}: ImageViewerModalProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Delete this target image? The shot data will be preserved.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/bulls/${bullId}/delete-image`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Image deleted");
        onOpenChange(false);
        onImageDeleted?.();
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to delete image");
      }
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error("Failed to delete image");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Bull {bullIndex} - Target Image</DialogTitle>
            {shotCount !== undefined && (
              <Badge variant="secondary">{shotCount} shots detected</Badge>
            )}
          </div>
        </DialogHeader>
        <div className="relative w-full h-[70vh] bg-muted rounded-lg overflow-hidden">
          <img
            src={imageUrl}
            alt={`Bull ${bullIndex} target`}
            className="w-full h-full object-contain"
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Image
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
