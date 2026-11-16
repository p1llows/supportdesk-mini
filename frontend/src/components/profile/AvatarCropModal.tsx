import { useEffect, useRef, useState } from 'react';
import { Loader2, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AvatarCropModalProps {
  file: File | null;
  saving?: boolean;
  onClose: () => void;
  onConfirm: (croppedFile: File) => Promise<void>;
}

const VIEWPORT_SIZE = 240;
const OUTPUT_SIZE = 256;

export function AvatarCropModal({
  file,
  saving = false,
  onClose,
  onConfirm,
}: AvatarCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const dragStartRef = useRef<{ pointerX: number; pointerY: number; startX: number; startY: number }>({
    pointerX: 0,
    pointerY: 0,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!file) {
      setImageSrc(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [file, saving, onClose]);

  if (!file || !imageSrc) return null;

  // Base scale so the shorter side covers the 240x240 viewport
  const baseScale =
    naturalSize.w > 0 && naturalSize.h > 0
      ? Math.max(VIEWPORT_SIZE / naturalSize.w, VIEWPORT_SIZE / naturalSize.h)
      : 1;
  const effectiveScale = baseScale * zoom;
  const displayW = naturalSize.w * effectiveScale;
  const displayH = naturalSize.h * effectiveScale;

  const clampOffset = (x: number, y: number, scale: number) => {
    const maxX = Math.max(0, (naturalSize.w * scale - VIEWPORT_SIZE) / 2);
    const maxY = Math.max(0, (naturalSize.h * scale - VIEWPORT_SIZE) / 2);
    return {
      x: Math.min(maxX, Math.max(-maxX, x)),
      y: Math.min(maxY, Math.max(-maxY, y)),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      startX: offset.x,
      startY: offset.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const dx = e.clientX - dragStartRef.current.pointerX;
    const dy = e.clientY - dragStartRef.current.pointerY;
    setOffset(clampOffset(dragStartRef.current.startX + dx, dragStartRef.current.startY + dy, effectiveScale));
  };

  const handlePointerUp = () => {
    setDragging(false);
  };

  const handleZoomChange = (nextZoom: number) => {
    const nextScale = baseScale * nextZoom;
    setZoom(nextZoom);
    setOffset((prev) => clampOffset(prev.x, prev.y, nextScale));
  };

  const handleSave = async () => {
    const img = imgRef.current;
    if (!img || naturalSize.w === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const ratio = OUTPUT_SIZE / VIEWPORT_SIZE;
    const drawW = displayW * ratio;
    const drawH = displayH * ratio;
    const drawX = (OUTPUT_SIZE - drawW) / 2 + offset.x * ratio;
    const drawY = (OUTPUT_SIZE - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png', 0.92)
    );
    if (!blob) return;

    const croppedFile = new File([blob], 'avatar.png', { type: 'image/png' });
    await onConfirm(croppedFile);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      className="animate-sd-fade fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-xs"
      onClick={() => !saving && onClose()}
    >
      <div
        className="animate-sd-in w-full max-w-sm overflow-hidden rounded-xl border border-[#E5E2DA] bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3.5">
          <div>
            <h2 id="avatar-crop-title" className="text-sm font-bold text-stone-900">
              Adjust Profile Photo
            </h2>
            <p className="text-[11px] text-stone-500">Drag to reposition, use slider to zoom</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close crop dialog"
            className="rounded-lg p-1 text-stone-400 hover:bg-[#EFECE6] hover:text-stone-800 disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Crop Viewport */}
        <div className="flex flex-col items-center gap-5 p-6">
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE }}
            className={`relative overflow-hidden rounded-full border-2 border-[#0F766E] bg-stone-900 select-none touch-none ${
              dragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Avatar crop preview"
              draggable={false}
              onLoad={(e) => {
                const target = e.currentTarget;
                setNaturalSize({ w: target.naturalWidth, h: target.naturalHeight });
              }}
              style={{
                width: displayW || 'auto',
                height: displayH || 'auto',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex w-full items-center gap-3">
            <ZoomOut className="h-4 w-4 shrink-0 text-stone-400" />
            <input
              type="range"
              aria-label="Zoom"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => handleZoomChange(Number(e.target.value))}
              disabled={saving}
              className="h-1.5 w-full cursor-pointer accent-[#0F766E]"
            />
            <ZoomIn className="h-4 w-4 shrink-0 text-stone-400" />
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
              disabled={saving}
              title="Reset position"
              aria-label="Reset crop"
              className="rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E5E2DA] bg-[#FAF9F6] px-5 py-3.5">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || naturalSize.w === 0}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Save Photo
          </Button>
        </div>
      </div>
    </div>
  );
}
