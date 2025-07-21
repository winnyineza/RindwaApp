import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageCropperProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
  imageFile: File | null;
  aspectRatio?: number;
}

export function ImageCropper({ 
  isOpen, 
  onClose, 
  onCrop, 
  imageFile, 
  aspectRatio = 1 
}: ImageCropperProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleImageLoad = useCallback(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImageSrc(e.target?.result as string);
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  const handleCrop = useCallback(async () => {
    if (!imageRef.current || !canvasRef.current || !imageSrc) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const image = imageRef.current;
    const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
    
    // Set canvas size to desired output size
    canvas.width = 400;
    canvas.height = 400;

    // Calculate crop area
    const cropX = (image.naturalWidth - cropSize) / 2 + crop.x;
    const cropY = (image.naturalHeight - cropSize) / 2 + crop.y;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save context state
    ctx.save();

    // Apply transformations
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Draw the cropped image
    ctx.drawImage(
      image,
      cropX,
      cropY,
      cropSize,
      cropSize,
      -canvas.width / 2,
      -canvas.height / 2,
      canvas.width,
      canvas.height
    );

    // Restore context state
    ctx.restore();

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        const croppedFile = new File([blob], imageFile?.name || 'cropped-image.jpg', {
          type: 'image/jpeg',
          lastModified: Date.now(),
        });
        onCrop(croppedFile);
      }
    }, 'image/jpeg', 0.9);
  }, [crop, zoom, rotation, imageSrc, imageFile, onCrop]);

  const handleClose = () => {
    setImageSrc(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    onClose();
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  // Load image when file changes
  React.useEffect(() => {
    if (imageFile && isOpen) {
      handleImageLoad();
    }
  }, [imageFile, isOpen, handleImageLoad]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Profile Picture</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {imageSrc && (
            <div className="relative">
              <div className="relative w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  className="w-full h-full object-contain"
                  style={{
                    transform: `translate(${crop.x}px, ${crop.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                  }}
                />
                
                {/* Crop overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-0 bg-black bg-opacity-50" />
                  <div 
                    className="absolute border-2 border-white shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                      width: '200px',
                      height: '200px',
                      transform: 'translate(-50%, -50%)',
                      borderRadius: '50%',
                      boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <ZoomIn className="w-4 h-4" />
                Zoom: {zoom.toFixed(1)}x
              </Label>
              <Slider
                value={[zoom]}
                onValueChange={(value) => setZoom(value[0])}
                min={0.5}
                max={3}
                step={0.1}
                className="w-full"
              />
            </div>

            <div className="space-y-2">
              <Label>Rotation: {rotation}°</Label>
              <Slider
                value={[rotation]}
                onValueChange={(value) => setRotation(value[0])}
                min={-180}
                max={180}
                step={1}
                className="w-full"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Label>Position X</Label>
              <Label>Position Y</Label>
              <Slider
                value={[crop.x]}
                onValueChange={(value) => setCrop(prev => ({ ...prev, x: value[0] }))}
                min={-100}
                max={100}
                step={1}
              />
              <Slider
                value={[crop.y]}
                onValueChange={(value) => setCrop(prev => ({ ...prev, y: value[0] }))}
                min={-100}
                max={100}
                step={1}
              />
            </div>
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleCrop}>
                Crop & Save
              </Button>
            </div>
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="hidden"
          width={400}
          height={400}
        />
      </DialogContent>
    </Dialog>
  );
}