import { useState, useEffect, useRef } from 'react';
import type { WheelEvent, MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
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
  const hasDraggedRef = useRef(false);

  useEffect(() => {
    if (!isOpen) return;

    setScale(1);
    setPosition({ x: 0, y: 0 });
    hasDraggedRef.current = false;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        setScale((s) => Math.min(s + 0.5, 5));
      } else if (e.key === '-' || e.key === '_') {
        setScale((s) => Math.max(s - 0.5, 0.5));
      } else if (e.key === '0') {
        setScale(1);
        setPosition({ x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;
  if (typeof document === 'undefined') return null;

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.5, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleMouseDown = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    hasDraggedRef.current = false;
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      const deltaX = Math.abs(e.clientX - (dragStart.x + position.x));
      const deltaY = Math.abs(e.clientY - (dragStart.y + position.y));
      if (deltaX > 4 || deltaY > 4) {
        hasDraggedRef.current = true;
      }
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleBackdropClick = () => {
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }
    onClose();
  };

  const modalContent = (
    <div
      className="fixed inset-0 w-screen h-screen z-[99999] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none overflow-hidden"
      style={{ margin: 0, padding: 0 }}
    >
      {/* Fixed Toolbar at top-right of the viewport */}
      <div
        className="fixed top-4 right-4 md:top-6 md:right-6 z-[100000] flex items-center gap-1.5 md:gap-2 bg-neutral-900/90 text-white p-1.5 md:p-2 rounded-2xl backdrop-blur-xl border border-white/15 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          onClick={handleZoomOut}
          title="Zoom Out (-)"
        >
          <ZoomOut className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <span className="text-white text-xs md:text-sm font-semibold w-12 text-center tabular-nums select-none">
          {Math.round(scale * 100)}%
        </span>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          onClick={handleZoomIn}
          title="Zoom In (+)"
        >
          <ZoomIn className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <div className="w-[1px] h-5 bg-white/20 mx-0.5" />

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-neutral-300 hover:text-white hover:bg-white/15 rounded-xl transition-colors"
          onClick={handleReset}
          title="Fit / Reset (0)"
        >
          <Maximize className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-white bg-white/10 hover:bg-red-500/80 rounded-xl transition-colors"
          onClick={onClose}
          title="Close (Esc)"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Interactive Stage / Backdrop */}
      <div
        className={`w-full h-full flex items-center justify-center p-4 md:p-12 ${
          isDragging ? 'cursor-grabbing' : scale > 1 ? 'cursor-grab' : 'cursor-zoom-in'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleBackdropClick}
      >
        <img
          src={imageUrl}
          alt="Preview"
          draggable={false}
          className="max-w-[92vw] max-h-[88vh] object-contain transition-transform duration-100 ease-out pointer-events-none select-none rounded-lg shadow-2xl"
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
          }}
        />
      </div>

      {/* Guidance badge */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 text-neutral-400 text-xs tracking-wider uppercase pointer-events-none bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10">
        Click outside or press Esc to close
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
