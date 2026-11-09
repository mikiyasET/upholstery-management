import React, { useId } from 'react';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showTextOnMobile?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  className = '',
  onClick,
  showTextOnMobile = false,
}) => {
  const gradientId = useId().replace(/:/g, '');

  const config = {
    sm: {
      logoHeight: 34,
      svgWidth: 120,
      svgHeight: 32,
      line1Y: 16,
      line1Size: 16.5,
      line2Y: 29,
      line2Size: 9.5,
    },
    md: {
      logoHeight: 38,
      svgWidth: 138,
      svgHeight: 36,
      line1Y: 18,
      line1Size: 19,
      line2Y: 32,
      line2Size: 10.8,
    },
    lg: {
      logoHeight: 46,
      svgWidth: 156,
      svgHeight: 42,
      line1Y: 21,
      line1Size: 21.5,
      line2Y: 37,
      line2Size: 12,
    },
  }[size];

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`inline-flex items-center select-none ${onClick ? 'cursor-pointer' : ''} ${
        showTextOnMobile ? 'gap-2.5' : 'lg:gap-2.5'
      } ${className}`}
    >
      {/* 1. Official Crest Logo */}
      <img
        src="/logo.png"
        alt="Yonatan Upholstery Logo"
        className="object-contain shrink-0 transition-transform duration-200 hover:scale-105"
        style={{
          height: `${config.logoHeight}px`,
          width: 'auto',
          filter: 'drop-shadow(0 2px 8px rgba(212, 175, 55, 0.35))',
        }}
      />

      {/* 2. Symmetrical 2-Line Typography: hidden on mobile & tablet, visible on desktop (lg+) */}
      <svg
        viewBox={`0 0 ${config.svgWidth} ${config.svgHeight}`}
        width={config.svgWidth}
        height={config.svgHeight}
        className={`shrink-0 brand-logo-svg overflow-visible ${
          showTextOnMobile ? 'block' : 'hidden lg:block'
        }`}
        aria-label="YONATAN UPHOLSTERY"
      >
        <defs>
          <linearGradient id={`goldGrad-${gradientId}`} x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="var(--gold-stop-0, #C59B27)" />
            <stop offset="25%" stopColor="var(--gold-stop-1, #F5C542)" />
            <stop offset="55%" stopColor="var(--gold-stop-2, #FFDF6D)" />
            <stop offset="80%" stopColor="var(--gold-stop-3, #D4AF37)" />
            <stop offset="100%" stopColor="var(--gold-stop-4, #A67C1E)" />
          </linearGradient>
        </defs>

        {/* Line 1: YONATAN */}
        <text
          x="0"
          y={config.line1Y}
          textLength={config.svgWidth}
          lengthAdjust="spacing"
          fill={`url(#goldGrad-${gradientId})`}
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="900"
          fontSize={config.line1Size}
          letterSpacing="0"
        >
          YONATAN
        </text>

        {/* Line 2: UPHOLSTERY */}
        <text
          x="0"
          y={config.line2Y}
          textLength={config.svgWidth}
          lengthAdjust="spacing"
          fill={`url(#goldGrad-${gradientId})`}
          fontFamily="'Plus Jakarta Sans', system-ui, -apple-system, sans-serif"
          fontWeight="800"
          fontSize={config.line2Size}
          letterSpacing="0"
        >
          UPHOLSTERY
        </text>
      </svg>
    </div>
  );
};

export default BrandLogo;
