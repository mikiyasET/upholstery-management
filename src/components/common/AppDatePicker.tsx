import React, { useMemo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useComputedColorScheme } from '@mantine/core';
import {
  AmharicDatePicker,
  type EthDateValue,
  toGregorianTime24h,
} from 'amharic-datepicker';
import { cn } from '../../lib/utils';

export interface AppDatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | null, dateString?: string) => void;
  placeholder?: string;
  showTime?: boolean;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'small' | 'medium' | 'large';
  allowManualInput?: boolean;
  showTodayButton?: boolean;
  useGeez?: boolean;
  minDate?: Date | string | null;
  maxDate?: Date | string | null;
}

export const AppDatePicker: React.FC<AppDatePickerProps> = ({
  value,
  onChange,
  placeholder,
  showTime = false,
  clearable = true,
  disabled = false,
  className,
  size = 'small',
  allowManualInput = true,
  showTodayButton = true,
  useGeez = false,
  minDate,
  maxDate,
}) => {
  const { t, i18n } = useTranslation();
  const isAmharic = i18n.language === 'am';
  const containerRef = useRef<HTMLDivElement>(null);

  const computedColorScheme = useComputedColorScheme('dark', { getInitialValueInEffect: false });
  const isDark = computedColorScheme === 'dark';

  const customColors = useMemo(() => {
    return isDark
      ? {
          text: '#FAFAF9',
          selectedText: '#000000',
          hoverBg: '#27272A',
          hoverText: '#FFFFFF',
          selectedHoverText: '#000000',
          disabledText: '#52525B',
          monthHeader: '#FAFAF9',
          saveBtnBg: '#F59E0B',
          saveBtnText: '#000000',
          cancelBtnBg: '#27272A',
          cancelBtnText: '#D4D4D8',
          todayBtnBg: 'transparent',
          todayBtnText: '#F59E0B',
          inRangeBg: 'rgba(245, 158, 11, 0.2)',
          inputBg: '#18181B',
          inputBorder: '#27272A',
          inputFocusBorder: '#F59E0B',
          todayIndicator: '#F59E0B',
        }
      : {
          text: '#1C1917',
          selectedText: '#FFFFFF',
          hoverBg: '#F0EDE8',
          hoverText: '#1C1917',
          selectedHoverText: '#FFFFFF',
          disabledText: '#A8A29E',
          monthHeader: '#1C1917',
          saveBtnBg: '#D97706',
          saveBtnText: '#FFFFFF',
          cancelBtnBg: '#F0EDE8',
          cancelBtnText: '#57534E',
          todayBtnBg: 'transparent',
          todayBtnText: '#D97706',
          inRangeBg: 'rgba(217, 119, 6, 0.15)',
          inputBg: '#FFFFFF',
          inputBorder: '#E8E4DF',
          inputFocusBorder: '#D97706',
          todayIndicator: '#D97706',
        };
  }, [isDark]);

  // Convert Date | string into safe Date object for AmharicDatePicker
  const safeValue = useMemo(() => {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }, [value]);

  // Keep datepicker popup floating with position: fixed relative to viewport
  // so it is NEVER clipped by parent containers with overflow: hidden or overflow: auto (e.g. card borders)
  useEffect(() => {
    const rootEl = containerRef.current;
    if (!rootEl) return;

    let resizeObserver: ResizeObserver | null = null;

    const positionPopup = () => {
      if (!rootEl) return;
      const popup = rootEl.querySelector('.eth-dp-popup') as HTMLElement | null;
      const inputWrapper = (rootEl.querySelector('.eth-dp-input-wrapper') || rootEl.querySelector('.eth-dp-container')) as HTMLElement | null;
      if (!popup || !inputWrapper) return;

      const rect = inputWrapper.getBoundingClientRect();
      const popupRect = popup.getBoundingClientRect();
      const popupWidth = popupRect.width || (size === 'small' ? 270 : 320);
      const popupHeight = popupRect.height || 360;

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Check available space below vs above
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      const showOnTop = spaceBelow < popupHeight + 10 && spaceAbove > spaceBelow;

      let top = showOnTop ? rect.top - popupHeight - 6 : rect.bottom + 6;
      top = Math.max(8, Math.min(top, viewportHeight - popupHeight - 8));

      let left = rect.left;
      if (left + popupWidth > viewportWidth - 8) {
        left = Math.max(8, viewportWidth - popupWidth - 8);
      }
      left = Math.max(8, left);

      popup.style.setProperty('position', 'fixed', 'important');
      popup.style.setProperty('top', `${Math.round(top)}px`, 'important');
      popup.style.setProperty('bottom', 'auto', 'important');
      popup.style.setProperty('left', `${Math.round(left)}px`, 'important');
      popup.style.setProperty('right', 'auto', 'important');
      popup.style.setProperty('z-index', '9999', 'important');
      popup.style.setProperty('margin', '0', 'important');
    };

    const attachPopupWatcher = () => {
      const popup = rootEl.querySelector('.eth-dp-popup') as HTMLElement | null;
      if (popup) {
        positionPopup();
        if (!resizeObserver && typeof ResizeObserver !== 'undefined') {
          resizeObserver = new ResizeObserver(() => positionPopup());
          resizeObserver.observe(popup);
        }
      } else if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
    };

    const mutationObserver = new MutationObserver(() => {
      attachPopupWatcher();
    });

    mutationObserver.observe(rootEl, { childList: true, subtree: true });

    // In case popup is already open
    attachPopupWatcher();

    window.addEventListener('scroll', positionPopup, { capture: true, passive: true });
    window.addEventListener('resize', positionPopup, { passive: true });

    return () => {
      mutationObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('scroll', positionPopup, { capture: true });
      window.removeEventListener('resize', positionPopup);
    };
  }, [size]);

  const handleChange = (selected: EthDateValue | null) => {
    if (!selected) {
      onChange?.(null, '');
      return;
    }

    const pad = (n: number) => String(n).padStart(2, '0');
    let gregHour = 0;
    let gregMinute = 0;

    if (showTime && selected.hour !== undefined) {
      const ampm = (selected.ampm || 'AM') as 'AM' | 'PM';
      gregHour = toGregorianTime24h(selected.hour, ampm);
      gregMinute = selected.minute || 0;
    }

    const jsDate = new Date(selected.year, selected.month - 1, selected.day, gregHour, gregMinute, 0);
    const isoDateStr = `${selected.year}-${pad(selected.month)}-${pad(selected.day)}${
      showTime ? `T${pad(gregHour)}:${pad(gregMinute)}:00` : ''
    }`;

    onChange?.(jsDate, isoDateStr);
  };

  const defaultPlaceholder = isAmharic
    ? t('common.selectDate', 'ቀን ይምረጡ...')
    : t('common.selectDate', 'Select date...');

  return (
    <div ref={containerRef} className={cn("relative flex items-center w-full", className)}>
      <div className="w-full [&>div]:w-full [&_.eth-dp-container]:w-full [&_.eth-dp-container]:max-w-full">
        <AmharicDatePicker
          value={safeValue}
          onChange={handleChange}
          calendarType={isAmharic ? 'ethiopian' : 'gregorian'}
          outputFormat="gregorian"
          theme={isDark ? 'dark' : 'light'}
          primaryColor={isDark ? '#F59E0B' : '#D97706'}
          customColors={customColors}
          showTime={showTime}
          size={size}
          placeholder={placeholder || defaultPlaceholder}
          showActions={showTime}
          allowManualInput={allowManualInput}
          clearable={clearable}
          showTodayButton={showTodayButton}
          useGeez={useGeez}
          disabled={disabled}
          minDate={minDate || undefined}
          maxDate={maxDate || undefined}
        />
      </div>
    </div>
  );
};

export default AppDatePicker;
