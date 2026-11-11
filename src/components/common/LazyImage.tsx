import React, { useState, useEffect } from 'react';
import { cn, getImageUrl } from '../../lib/utils';
import { ImageOff } from 'lucide-react';

export interface LazyImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string | null;
  alt?: string;
  fallback?: React.ReactNode;
  wrapperClassName?: string;
  imgClassName?: string;
  showIconPlaceholder?: boolean;
  containWithBlur?: boolean;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  imgClassName = '',
  fallback,
  showIconPlaceholder: _showIconPlaceholder,
  containWithBlur = true,
  onClick,
  style,
  ...rest
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = src ? getImageUrl(src) : undefined;

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [resolvedSrc]);

  // If no source is provided or image failed to load, show fallback
  if (!resolvedSrc || hasError) {
    if (fallback !== undefined) {
      return <>{fallback}</>;
    }
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted/70 text-muted-foreground/40 shrink-0",
          wrapperClassName || className
        )}
        onClick={onClick}
        style={style}
      >
        <ImageOff className="h-4 w-4" />
      </div>
    );
  }

  // When containWithBlur is true, ensure the foreground image uses object-contain
  // and does not get overridden by any legacy object-cover passed in imgClassName or className
  const cleanedImgClassName = containWithBlur
    ? (imgClassName || className).replace(/\bobject-(cover|fill|none|scale-down)\b/g, '').trim()
    : (imgClassName || className);

  return (
    <div
      className={cn(
        "relative overflow-hidden shrink-0 flex items-center justify-center bg-zinc-200/80 dark:bg-zinc-800/80",
        wrapperClassName || className
      )}
      onClick={onClick}
      style={style}
    >
      {/* Grey Flowing Canvas Placeholder */}
      <div
        className={cn(
          "absolute inset-0 overflow-hidden pointer-events-none transition-opacity duration-700 ease-out z-0",
          isLoaded ? "opacity-0" : "opacity-100"
        )}
      >
        {/* Animated grey flowing gradient */}
        <div className="absolute inset-0 animate-generative-flow" />

        {/* Ambient soft grey glow blob */}
        <div className="absolute inset-[-15%] rounded-full bg-gradient-to-tr from-zinc-400/20 via-zinc-200/25 to-zinc-500/20 dark:from-zinc-600/25 dark:via-zinc-400/20 dark:to-zinc-500/25 blur-lg animate-generative-glow pointer-events-none" />

        {/* Gentle light-wave shimmer across the grey tones */}
        <div className="absolute inset-0 -translate-x-full animate-image-shimmer bg-gradient-to-r from-transparent via-white/30 dark:via-white/15 to-transparent pointer-events-none" />
      </div>

      {/* Blurred background of the same image covering unfilled space (Direct Sales style) */}
      {containWithBlur && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <img
            src={resolvedSrc}
            alt=""
            aria-hidden="true"
            className={cn(
              "w-full h-full object-cover blur-[2px] scale-[1.08] opacity-80 dark:opacity-70 transition-opacity duration-700 ease-out pointer-events-none select-none",
              isLoaded ? "opacity-80 dark:opacity-70" : "opacity-0"
            )}
          />
        </div>
      )}

      {/* Actual image: cleanly contained so the full product fits the space without being cropped */}
      <img
        src={resolvedSrc}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={cn(
          "w-full h-full relative z-10 transform-gpu transition-all duration-700 ease-out",
          containWithBlur && "object-contain p-[2px]",
          isLoaded
            ? "opacity-100 scale-100 translate-y-0"
            : "opacity-0 scale-95 translate-y-1 pointer-events-none",
          cleanedImgClassName
        )}
        {...rest}
      />
    </div>
  );
};

export default LazyImage;
