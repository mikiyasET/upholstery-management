import { useState, useEffect } from 'react';
import type { WheelEvent, MouseEvent as ReactMouseEvent } from 'react';
import { ZoomIn, ZoomOut, Maximize, X } from 'lucide-react';
import { Button } from './button';

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

export function ImagePreviewModal({ isOpen, onClose, imageUrl }: ImagePreviewModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !imageUrl) return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/95 dark:bg-black/95 backdrop-blur-md animate-in fade-in duration-300"
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        className="absolute top-6 right-6 z-[210] flex items-center gap-2 bg-white/90 dark:bg-black/70 p-2 rounded-xl backdrop-blur-md border border-black/10 dark:border-white/10 shadow-xl text-foreground"
        onClick={(e) => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-black/10 dark:hover:bg-white/20" onClick={handleZoomOut}>
          <ZoomOut className="h-5 w-5" />
        </Button>
        <span className="text-foreground text-sm font-semibold w-12 text-center select-none">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-black/10 dark:hover:bg-white/20" onClick={handleZoomIn}>
          <ZoomIn className="h-5 w-5" />
        </Button>
        <div className="w-[1px] h-6 bg-black/15 dark:bg-white/20 mx-1" />
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-black/10 dark:hover:bg-white/20" onClick={handleReset}>
          <Maximize className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-foreground hover:bg-black/10 dark:hover:bg-white/20 hover:text-red-600 dark:hover:text-red-400" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
      </div>

      {/* Image Container */}
      <div
        className={`w-full h-full flex items-center justify-center relative p-8 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Preview"
          className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out pointer-events-none select-none"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
        />
      </div>
    </div>
  );
}
