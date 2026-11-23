import React, { useState, useEffect, useRef, useMemo } from 'react';
import { cn, getImageUrl } from '../../lib/utils';
import { ImageOff, RotateCw } from 'lucide-react';

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
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const retryStartTimeRef = useRef<number>(0);

  const baseResolvedSrc = src ? getImageUrl(src) : undefined;

  // Add cache-busting timestamp / query param when retrying to bypass browser error caching
  const resolvedSrc = useMemo(() => {
    if (!baseResolvedSrc) return undefined;
    if (retryCount === 0) return baseResolvedSrc;
    if (baseResolvedSrc.startsWith('data:') || baseResolvedSrc.startsWith('blob:')) {
      return baseResolvedSrc;
    }
    const separator = baseResolvedSrc.includes('?') ? '&' : '?';
    return `${baseResolvedSrc}${separator}_retry=${retryCount}`;
  }, [baseResolvedSrc, retryCount]);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    setIsRetrying(false);
    setRetryCount(0);
  }, [baseResolvedSrc]);

  // Preload retry image with minimum spin feedback
  useEffect(() => {
    if (retryCount === 0 || !resolvedSrc) return;

    let active = true;
    const img = new Image();
    img.src = resolvedSrc;

    img.onload = () => {
      if (!active) return;
      setIsLoaded(true);
      setHasError(false);
      setIsRetrying(false);
    };

    img.onerror = () => {
      if (!active) return;
      const elapsed = Date.now() - retryStartTimeRef.current;
      const remainingDelay = Math.max(0, 450 - elapsed);
      setTimeout(() => {
        if (!active) return;
        setHasError(true);
        setIsRetrying(false);
      }, remainingDelay);
    };

    return () => {
      active = false;
    };
  }, [retryCount, resolvedSrc]);

  const handleRetry = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isRetrying || !baseResolvedSrc) return;

    retryStartTimeRef.current = Date.now();
    setIsRetrying(true);
    setRetryCount((prev) => prev + 1);
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(e as unknown as React.MouseEvent<HTMLImageElement>);
    } else {
      handleRetry(e);
    }
  };

  // If no source is provided at all
  if (!resolvedSrc && !baseResolvedSrc) {
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

  // If image failed to load due to network error, show broken image with clickable refresh icon inside
  if (hasError) {
    return (
      <div
        className={cn(
          "relative flex items-center justify-center bg-muted/70 text-muted-foreground/50 shrink-0 overflow-hidden select-none group",
          wrapperClassName || className
        )}
        onClick={handleContainerClick}
        style={style}
        title={isRetrying ? "Retrying..." : "Image failed to load. Click to reload"}
      >
        {/* Soft broken image watermark in center */}
        <ImageOff
          className={cn(
            "h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground/25 absolute inset-0 m-auto pointer-events-none transition-opacity duration-200",
            isRetrying && "opacity-15"
          )}
        />

        {/* Centered Refresh Button */}
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          aria-label="Reload image"
          title="Reload image"
          className={cn(
            "relative z-10 p-1.5 sm:p-2 rounded-full bg-card/90 hover:bg-amber-500 hover:text-white dark:hover:text-white text-muted-foreground border border-border/80 shadow-xs transition-all cursor-pointer active:scale-95 group-hover:bg-amber-500 group-hover:text-white group-hover:border-amber-500",
            isRetrying && "bg-amber-500/15 text-amber-500 border-amber-500/30 cursor-wait"
          )}
        >
          <RotateCw
            className={cn(
              "h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0",
              isRetrying && "animate-spin text-amber-500"
            )}
          />
        </button>
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
            key={`blur-${resolvedSrc}`}
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
        key={resolvedSrc}
        src={resolvedSrc}
        alt={alt}
        loading={retryCount > 0 ? "eager" : "lazy"}
        decoding="async"
        onLoad={() => {
          setIsLoaded(true);
          setHasError(false);
          setIsRetrying(false);
        }}
        onError={() => {
          setHasError(true);
          setIsRetrying(false);
        }}
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
