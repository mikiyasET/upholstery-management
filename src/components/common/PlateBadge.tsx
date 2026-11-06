import React from 'react';
import { parsePlateNumber, formatPlateNumber } from '../../utils/plate';
import { Tooltip } from '@mantine/core';

interface PlateBadgeProps {
  plate?: string | null;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  withTooltip?: boolean;
}

export const PlateBadge: React.FC<PlateBadgeProps> = ({
  plate,
  size = 'sm',
  className = '',
  withTooltip = true,
}) => {
  if (!plate || plate === 'N/A') {
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground bg-muted/30 rounded border border-border/50">
        —
      </span>
    );
  }

  const parsed = parsePlateNumber(plate);
  const formattedFull = formatPlateNumber(plate);

  // Category Accent Color Palette (Ethiopian Standards)
  let fg = '#1E50BC'; // Default Code 2 Blue
  let isPolice = false;

  if (parsed) {
    const cat = (parsed.category || '').toLowerCase();
    if (cat === '1') {
      fg = '#B91C1C'; // Red
    } else if (cat === '2') {
      fg = '#1E50BC'; // Blue
    } else if (cat === '3') {
      fg = '#15803D'; // Green
    } else if (cat === '4' || cat === '5') {
      fg = '#EA580C'; // Orange
    } else if (['un', 'au', 'temp'].includes(cat)) {
      fg = '#0284C7'; // Cyan
    } else if (cat === 'police') {
      fg = '#EAB308'; // Yellow
      isPolice = true;
    }
  }

  // Dimension presets
  const sizeStyles = {
    xs: {
      height: 'h-[19px]',
      countryText: 'text-[6px]',
      codeText: 'text-[9px]',
      serialText: 'text-[10px]',
      padding: 'px-1.5',
    },
    sm: {
      height: 'h-[22px]',
      countryText: 'text-[7px]',
      codeText: 'text-[10px]',
      serialText: 'text-[11px]',
      padding: 'px-2',
    },
    md: {
      height: 'h-[26px]',
      countryText: 'text-[8px]',
      codeText: 'text-[11px]',
      serialText: 'text-xs',
      padding: 'px-2.5',
    },
  }[size];

  const content = parsed ? (
    <div
      className={`inline-flex items-stretch rounded-[5px] overflow-hidden select-none shrink-0 border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] bg-white dark:bg-[#18181b] transition-all hover:border-slate-400 dark:hover:border-zinc-600 ${sizeStyles.height} ${className}`}
      style={{
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* 1. Country & Region Emblem Column */}
      <div
        className="flex flex-col items-center justify-center px-1.5 py-0.2 shrink-0 tracking-tight"
        style={{
          backgroundColor: fg,
          color: isPolice ? '#111827' : '#FFFFFF',
        }}
      >
        <span className={`${sizeStyles.countryText} leading-none font-black opacity-90`}>
          {parsed.amharic || 'ኢትዮ'}
        </span>
        <span className={`${sizeStyles.countryText} leading-none font-black mt-0.5`}>
          {parsed.english || 'ET'}
        </span>
      </div>

      {/* 2. Category Code Badge */}
      <div
        className="flex items-center justify-center px-1.5 border-r shrink-0 font-black"
        style={{
          borderColor: 'rgba(128,128,128,0.22)',
          color: fg,
        }}
      >
        <span className={sizeStyles.codeText}>{parsed.category.toUpperCase()}</span>
      </div>

      {/* 3. Serial Identifier */}
      <div
        className={`flex items-center justify-center ${sizeStyles.padding} font-mono font-bold tracking-wider text-slate-900 dark:text-zinc-100`}
      >
        <span className={sizeStyles.serialText}>{parsed.serial}</span>
      </div>
    </div>
  ) : (
    <div
      className={`inline-flex items-stretch rounded-[5px] overflow-hidden select-none shrink-0 border border-slate-300/90 dark:border-zinc-700 shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] bg-white dark:bg-[#18181b] transition-all hover:border-slate-400 dark:hover:border-zinc-600 ${sizeStyles.height} ${className}`}
    >
      <div className="flex items-center justify-center px-1.5 py-0.2 bg-blue-600 text-white font-black text-[7.5px] tracking-tight shrink-0">
        ET
      </div>
      <div
        className={`flex items-center justify-center ${sizeStyles.padding} font-mono font-bold tracking-wider text-slate-800 dark:text-zinc-100 ${sizeStyles.serialText}`}
      >
        {plate}
      </div>
    </div>
  );

  if (withTooltip) {
    return (
      <Tooltip label={formattedFull} withArrow position="top" fz="xs">
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default PlateBadge;
