import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Car, Loader2, Sparkles, Zap, Accessibility } from 'lucide-react';
import type { PlateData } from '../utils/plate';
import { parsePlateNumber } from '../utils/plate';
import opentype from 'opentype.js';
import { ModernSelect } from './ui/modern-select';
import { ModernInput } from './ui/modern-input';
import { useTranslation } from 'react-i18next';
import QRCode from 'qrcode';
import {
  loadCargoFont,
  loadHolographicFoil,
  loadEfpLogo,
  preloadPlateAssets,
  getCachedCargoFont,
  getCachedHoloFoil,
  getCachedEfpLogo,
} from '../utils/plateAssets';

const createWatermarkedPattern = (ctx: CanvasRenderingContext2D, color: string) => {
  const pCanvas = document.createElement('canvas');
  pCanvas.width = 70;
  pCanvas.height = 40;
  const pCtx = pCanvas.getContext('2d');
  if (!pCtx) return color;
  
  pCtx.fillStyle = color;
  pCtx.fillRect(0, 0, pCanvas.width, pCanvas.height);
  
  pCtx.font = 'bold 11px Inter, sans-serif';
  
  // Top row
  pCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  pCtx.fillText('ETHIOPIA', 2, 26);
  pCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  pCtx.fillText('ETHIOPIA', 0, 24);
  
  // Bottom row (staggered for density)
  pCtx.fillStyle = 'rgba(0, 0, 0, 0.15)';
  pCtx.fillText('ETHIOPIA', 82, 61);
  pCtx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  pCtx.fillText('ETHIOPIA', 80, 59);
  
  const pattern = ctx.createPattern(pCanvas, 'repeat');
  if (pattern && typeof DOMMatrix !== 'undefined') {
      pattern.setTransform(new DOMMatrix().rotate(-15));
  }
  return pattern || color;
};

const CargoTextOverlay = ({ text, font, className = '' }: { text: string, font: opentype.Font | null, className?: string }) => {
  const [svgPath, setSvgPath] = useState<any>(null);

  useEffect(() => {
    if (!font || !text) {
      setSvgPath(null);
      return;
    }
    try {
      const fontSize = 36;
      const scale = fontSize / (font.unitsPerEm || 1000);
      const ascender = (font.ascender || 800) * scale;
      const descender = (font.descender || -200) * scale;
      
      const advanceWidth = font.getAdvanceWidth(text, fontSize);
      
      const path = font.getPath(text, 0, ascender, fontSize);
      
      const calculatedWidth = advanceWidth;
      const calculatedHeight = (ascender - descender);

      setSvgPath({
        d: path.toPathData(2),
        width: calculatedWidth,
        height: calculatedHeight
      });
    } catch (err) {
      setSvgPath(null);
    }
  }, [text, font]);

  if (!svgPath) return <div className={`absolute inset-0 flex items-center justify-center pointer-events-none opacity-50 text-gray-900 dark:text-gray-100 ${className}`}>{text}</div>;

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none ${className}`}>
      <svg 
        width={svgPath.width} 
        height={svgPath.height} 
        viewBox={`0 0 ${svgPath.width} ${svgPath.height}`}
        className="fill-current text-gray-900 dark:text-gray-100"
      >
        <path d={svgPath.d} />
      </svg>
    </div>
  );
};

export const PLATE_PRESETS = [
  { id: '1', name: 'Code 1 - Taxi', amharic: 'ኢ.አ', english: 'AA', code: '1', fg: '#B91C1C', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AAA0000' },
  { id: '2', name: 'Code 2 - Private', amharic: 'ኢ.አ', english: 'AA', code: '2', fg: '#1E50BC', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AAA0000' },
  { id: '3', name: 'Code 3 - Commercial', amharic: 'ኢ.ት', english: 'ET', code: '3', fg: '#15803D', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AAA0000' },
  { id: '4', name: 'Code 4 - Government', amharic: 'ኢ.ት', english: 'ET', code: '4', fg: '#111827', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AAA0000' },
  { id: '5', name: 'Code 5 - NGO / Civic', amharic: 'ኢ.አ', english: 'AA', code: '5', fg: '#EA580C', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AAA0000' },
  { id: 'un', name: 'UN - United Nations', amharic: 'የተመ', english: 'UN', code: '', fg: '#009BDA', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'UN00000' },
  { id: 'au', name: 'AU - African Union', amharic: 'አሕ', english: 'AU', code: '', fg: '#00838F', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'AU00000' },
  { id: 'temp', name: 'ተላላፊ - Temporary', amharic: 'ተላላፊ', english: 'ET', code: '', fg: '#009BDA', bg: '#FFFFFF', serialOld: 'A12345', serialNew: 'TMP0000' },
  { id: 'police', name: 'ፖሊስ - Police', amharic: 'ፖሊስ', english: 'AA', code: '', fg: '#111827', bg: '#FFB300', serialOld: 'A12345', serialNew: '0001' }
];

interface Props {
  value: string;
  onChange: (val: string) => void;
  isSearching?: boolean;
  inputSize?: 'sm' | 'default';
}

export function EthiopianPlateConfigurator({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [data, setData] = useState<PlateData>(() => {
    const parsed = parsePlateNumber(value);
    if (parsed) return parsed;
    return {
      category: '2',
      system: 'new',
      amharic: 'ኢ.አ',
      english: 'AA',
      serial: 'AAA0000'
    };
  });
  const [interactedParts, setInteractedParts] = useState({ letters: false, numbers: false });
  const [cargoFont, setCargoFont] = useState<opentype.Font | null>(() => getCachedCargoFont());
  const [efpLogo, setEfpLogo] = useState<HTMLImageElement | null>(() => getCachedEfpLogo());
  const [holoFoil, setHoloFoil] = useState<HTMLImageElement | null>(() => getCachedHoloFoil());
  const [qrImage, setQrImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (data.serial && data.system === 'new') {
      QRCode.toDataURL(data.serial, { margin: 1, color: { dark: '#000', light: '#fff' } })
        .then(url => {
          const img = new Image();
          img.onload = () => setQrImage(img);
          img.src = url;
        })
        .catch(console.error);
    }
  }, [data.serial, data.system]);

  useEffect(() => {
    if (!cargoFont) {
      loadCargoFont().then(f => {
        if (f) setCargoFont(f);
      });
    }
  }, [cargoFont]);

  useEffect(() => {
    if (data.category === 'police' && !efpLogo) {
      loadEfpLogo().then(img => {
        if (img) setEfpLogo(img);
      });
    }
  }, [data.category, efpLogo]);

  useEffect(() => {
    if (!holoFoil) {
      loadHolographicFoil().then(img => {
        if (img) setHoloFoil(img);
      });
    }
  }, [holoFoil]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const newLettersInputRef = useRef<HTMLInputElement>(null);
  const newDigitsInputRef = useRef<HTMLInputElement>(null);
  const oldLettersInputRef = useRef<HTMLInputElement>(null);
  const oldDigitsInputRef = useRef<HTMLInputElement>(null);

  const handlePreviewClick = () => {
    if (data.system === 'new') {
      newLettersInputRef.current?.focus();
    } else {
      oldLettersInputRef.current?.focus();
    }
  };

  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data]);

  const setField = (field: keyof PlateData, val: any) => {
    setData(prev => ({ ...prev, [field]: val }));
  };

  const applyPreset = (preset: typeof PLATE_PRESETS[0]) => {
    setInteractedParts({ letters: false, numbers: false });
    setData(prev => ({
      ...prev,
      category: preset.id,
      amharic: prev.system === 'new' ? (preset.id === 'police' ? 'ፖሊስ' : 'ኢት') : preset.amharic,
      english: preset.english,
      serial: prev.system === 'new' ? preset.serialNew : preset.serialOld,
    }));
  };

  /** Returns a fully-padded serial for display (canvas + overlays).
   *  New plate: 3 letters padded with 'A' + 4 digits padded with '0'  → e.g. "AB" → "ABA0000", "AB12" → "AB01200"  (wrong)
   *  Actually: letters part padded right with 'A', digits part padded right with '0'.
   *  Old plate: 1 letter padded with 'A' + 5 digits padded with '0'  → e.g. "" → "A00000", "B46" → "B46000"
   */
  const getPaddedSerial = () => {
    const letters = (data.serial.match(/^[A-Z]+/i) || [''])[0].toUpperCase();
    const digits = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '');
    
    if (data.system === 'new') {
      if (data.category === 'police') {
        const clean = data.serial.replace(/[^A-Z0-9]/ig, '').toUpperCase();
        return (clean || '0000').padEnd(4, '0').substring(0, 4);
      }
      const paddedLetters = (letters || 'AAA').padEnd(3, 'A').substring(0, 3);
      const paddedDigits = (digits || '0000').padEnd(4, '0').substring(0, 4);
      return paddedLetters + paddedDigits;
    } else {
      const paddedLetter = (letters || 'A').substring(0, 1) || 'A';
      const paddedDigits = (digits || '00000').padEnd(5, '0').substring(0, 5);
      return paddedLetter + paddedDigits;
    }
  };

  const renderPlate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const preset = PLATE_PRESETS.find(p => p.id === data.category) || PLATE_PRESETS[1];
    let fgColor = preset.fg;
    let bgColor = preset.bg;

    if (data.system === 'new') {
      if (['1', '2', '3', '4', '5'].includes(data.category)) {
        fgColor = data.isEV ? '#137048' : '#000000';
      } else if (data.category === 'police') {
        bgColor = '#2563EB';
        fgColor = '#E5E7EB';
      }
    }
    const cornerRadius = 20;

    const watermarkedFg = createWatermarkedPattern(ctx, fgColor);

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(10, 10, width - 20, height - 20, cornerRadius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    // ── Holographic security foil shimmer (new plates only) ──
    if (data.system === 'new' && data.category !== 'police') {
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(10, 10, width - 20, height - 20, cornerRadius);
      ctx.clip();

      // 1) Subtle diagonal silver gradient sheen
      const sheenGrad = ctx.createLinearGradient(0, 0, width, height);
      sheenGrad.addColorStop(0.0, 'rgba(220,220,230,0.0)');
      sheenGrad.addColorStop(0.20, 'rgba(200,210,225,0.12)');
      sheenGrad.addColorStop(0.35, 'rgba(230,235,245,0.22)');
      sheenGrad.addColorStop(0.50, 'rgba(245,248,255,0.08)');
      sheenGrad.addColorStop(0.65, 'rgba(210,220,235,0.18)');
      sheenGrad.addColorStop(0.80, 'rgba(195,205,220,0.10)');
      sheenGrad.addColorStop(1.0, 'rgba(220,225,235,0.0)');
      ctx.fillStyle = sheenGrad;
      ctx.fillRect(10, 10, width - 20, height - 20);

      // 2) Rainbow iridescent diagonal bands (very subtle)
      const iridGrad = ctx.createLinearGradient(0, height, width * 0.7, 0);
      iridGrad.addColorStop(0.0, 'rgba(100,150,255,0.0)');
      iridGrad.addColorStop(0.15, 'rgba(100,180,255,0.04)');
      iridGrad.addColorStop(0.30, 'rgba(80,220,180,0.05)');
      iridGrad.addColorStop(0.45, 'rgba(255,220,100,0.03)');
      iridGrad.addColorStop(0.60, 'rgba(255,130,130,0.04)');
      iridGrad.addColorStop(0.75, 'rgba(180,120,255,0.05)');
      iridGrad.addColorStop(0.90, 'rgba(100,200,255,0.03)');
      iridGrad.addColorStop(1.0, 'rgba(100,150,255,0.0)');
      ctx.fillStyle = iridGrad;
      ctx.fillRect(10, 10, width - 20, height - 20);

      // 3) Micro-prism sparkle dots (deterministic pseudo-random)
      const sparkleColors = [
        'rgba(255,255,255,0.45)',
        'rgba(255,255,255,0.30)',
        'rgba(200,220,255,0.25)',
        'rgba(180,255,220,0.15)',
        'rgba(255,200,200,0.12)',
        'rgba(220,200,255,0.15)',
      ];
      // Simple seeded pseudo-random for consistent sparkle positions
      let seed = 42;
      const nextRand = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
      for (let i = 0; i < 80; i++) {
        const sx = 20 + nextRand() * (width - 40);
        const sy = 16 + nextRand() * (height - 32);
        const sr = 0.5 + nextRand() * 1.8;
        const colorIdx = Math.floor(nextRand() * sparkleColors.length);
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fillStyle = sparkleColors[colorIdx];
        ctx.fill();
      }

      // 4) Faint security watermark text "AUTHENTIC" repeated diagonally
      ctx.save();
      ctx.globalAlpha = 0.025;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 6; col++) {
          const tx = 80 + col * 180 + (row % 2) * 90;
          const ty = 50 + row * 60;
          ctx.save();
          ctx.translate(tx, ty);
          ctx.rotate(-0.26); // ~-15°
          ctx.fillText('AUTHENTIC', 0, 0);
          ctx.restore();
        }
      }
      ctx.restore();

      ctx.restore();
    }

    ctx.shadowColor = 'transparent';

    ctx.beginPath();
    ctx.roundRect(22, 22, width - 44, height - 44, cornerRadius - 6);
    ctx.lineWidth = 8;
    ctx.strokeStyle = (data.system === 'new' && data.category === 'police') ? '#8C8561' : fgColor;
    if (data.system === 'new') {
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 2;
    }
    ctx.stroke();

    ctx.shadowColor = 'transparent';

    if (data.system === 'new') {
      if (data.category === 'police') {
        const panelLeftX = 60;
        if (efpLogo) {
          ctx.drawImage(efpLogo, panelLeftX, 75, 110, 110);
        }

        ctx.fillStyle = fgColor;
        ctx.font = '900 36px "Noto Sans Ethiopic", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        
        const amhX = 210;
        ctx.fillText('ኢ', amhX, 85);
        ctx.fillText('ፌ', amhX, 130);
        ctx.fillText('ፖ', amhX, 175);
        
        ctx.shadowColor = 'transparent';

        const defaultCharWidth = 52;
        const charHeight = 135;
        const charSpacing = cargoFont ? 4 : 12;
        
        const displaySerial = getPaddedSerial();
        const advances = displaySerial.split('').map(char => 
          cargoFont ? cargoFont.getAdvanceWidth(char, charHeight) : defaultCharWidth
        );
        
        let totalWidth = advances.reduce((a, b) => a + b, 0) + (displaySerial.length - 1) * charSpacing;
        
        const startX = 250 + (600 - totalWidth) / 2;
        const startY = (height - charHeight) / 2;

        ctx.fillStyle = '#8C8561';
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        
        let currentX = startX;
        for (let i = 0; i < displaySerial.length; i++) {
          const char = displaySerial[i];
          drawStencilChar(ctx, char, currentX, startY, advances[i], charHeight, cargoFont);
          currentX += advances[i] + charSpacing;
        }

        ctx.shadowColor = 'transparent';

        const engX = 890;
        ctx.fillStyle = fgColor;
        ctx.font = '900 42px Inter, sans-serif';
        
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 2;
        
        ctx.fillText('E', engX, 80);
        ctx.fillText('F', engX, 130);
        ctx.fillText('P', engX, 180);
        
        ctx.shadowColor = 'transparent';

      } else {
        const panelLeftX = 35;

        ctx.fillStyle = '#000000';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const amhY = 68;
        const cleanAmharic = 'ኢት';
        
        ctx.font = '900 46px "Noto Sans Ethiopic", sans-serif';
        ctx.fillText(cleanAmharic[0], panelLeftX + 55, amhY);
        ctx.fillText(cleanAmharic[1], panelLeftX + 88, amhY);

        const ethBadgeX = panelLeftX + 32;
        const ethBadgeY = 104;
        const ethBadgeW = 75;
        const ethBadgeH = 36;

        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#D1D5DB';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 3;
        ctx.beginPath();
        ctx.roundRect(ethBadgeX, ethBadgeY, ethBadgeW, ethBadgeH, 6);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillRect(ethBadgeX + 2, ethBadgeY + 2, ethBadgeW - 4, 3);
        
        ctx.fillStyle = '#000000';
        ctx.font = '900 24px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('ETH', ethBadgeX + ethBadgeW / 2, ethBadgeY + ethBadgeH / 2 + 1);
        ctx.restore();

        if (qrImage) {
          const qrSize = 56;
          const qrX = ethBadgeX + (ethBadgeW - qrSize) / 2;
          const qrY = ethBadgeY + ethBadgeH + 15;
          ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);
        }

        // ── Vertical holographic security strip (divider) ──
        const stripX = 186;
        const stripW = 18;
        const stripTop = 26;
        const stripBottom = height - 26;
        const stripH = stripBottom - stripTop;

        ctx.save();
        ctx.beginPath();
        ctx.rect(stripX, stripTop, stripW, stripH);
        ctx.clip();

        if (holoFoil) {
          // Draw the holographic foil texture image, stretched to fill the strip
          ctx.drawImage(holoFoil, stripX, stripTop, stripW, stripH);
        } else {
          // Fallback: simple silver gradient if image hasn't loaded yet
          ctx.fillStyle = '#C8CCD4';
          ctx.fillRect(stripX, stripTop, stripW, stripH);
        }

        // Subtle embossed edges for depth
        const edgeL = ctx.createLinearGradient(stripX, 0, stripX + 2, 0);
        edgeL.addColorStop(0, 'rgba(0,0,0,0.15)');
        edgeL.addColorStop(1, 'rgba(0,0,0,0.0)');
        ctx.fillStyle = edgeL;
        ctx.fillRect(stripX, stripTop, 2, stripH);

        const edgeR = ctx.createLinearGradient(stripX + stripW - 2, 0, stripX + stripW, 0);
        edgeR.addColorStop(0, 'rgba(0,0,0,0.0)');
        edgeR.addColorStop(1, 'rgba(0,0,0,0.12)');
        ctx.fillStyle = edgeR;
        ctx.fillRect(stripX + stripW - 2, stripTop, 2, stripH);

        ctx.restore();
        
        if (data.isPD) {
          const pdX = 145;
          const pdY = 45;
          ctx.save();
          ctx.fillStyle = '#2563EB';
          ctx.beginPath();
          ctx.roundRect(pdX, pdY, 40, 40, 6);
          ctx.fill();
          ctx.fillStyle = '#FFFFFF';
          ctx.font = '900 16px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('PD', pdX + 20, pdY + 14);
          ctx.beginPath();
          ctx.arc(pdX + 20, pdY + 28, 5, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.restore();
        }

        const defaultCharWidth = 54;
        const charHeight = 125;
        const charSpacing = cargoFont ? 8 : 20;
        
        const displaySerial = getPaddedSerial();
        const advances = displaySerial.split('').map(char => 
          cargoFont ? cargoFont.getAdvanceWidth(char, charHeight) : defaultCharWidth
        );
        
        let totalWidth = advances.reduce((a, b) => a + b, 0) + (displaySerial.length - 1) * charSpacing;
        
        const startX = 250 + (710 - totalWidth) / 2;
        const startY = (height - charHeight) / 2;

        ctx.fillStyle = watermarkedFg;
        let currentX = startX;
        for (let i = 0; i < displaySerial.length; i++) {
          const char = displaySerial[i];
          drawStencilChar(ctx, char, currentX, startY, advances[i], charHeight, cargoFont, { isNewPlateText: true });
          currentX += advances[i] + charSpacing;
        }
      }
    } else {
      if (preset.code !== '') {
        const circleX = 85;
        const circleY = height / 2;
        const circleR = 42;

        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = fgColor;
        ctx.stroke();

        ctx.fillStyle = fgColor;
        ctx.font = '900 56px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(preset.code, circleX, circleY + 2);
      }

      ctx.fillStyle = fgColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      let leftAmharicX = preset.code !== '' ? 172 : 125;
      
      const parts = data.amharic.split('');
      if (parts.length >= 3 && parts[1] === '.') {
        ctx.font = '900 44px "Noto Sans Ethiopic", sans-serif';
        ctx.fillText(parts[0] + '.', leftAmharicX, height / 2 - 34);
        ctx.fillText(parts[2] + '.', leftAmharicX, height / 2 + 34);
      } else {
        ctx.font = '900 46px "Noto Sans Ethiopic", sans-serif';
        ctx.fillText(data.amharic, leftAmharicX, height / 2);
      }

      const defaultDigitWidth = 52;
      const digitHeight = 142;
      const digitSpacing = cargoFont ? 8 : 16;
      
      const displaySerial = getPaddedSerial();
      const digitAdvances = displaySerial.split('').map(char => 
        cargoFont ? cargoFont.getAdvanceWidth(char, digitHeight) : defaultDigitWidth
      );
      
      const totalSerialWidth = digitAdvances.reduce((a, b) => a + b, 0) + (displaySerial.length - 1) * digitSpacing;
      
      const startSerialX = 330 + (430 - totalSerialWidth) / 2;
      const startSerialY = (height - digitHeight) / 2;

      ctx.fillStyle = fgColor;
      let currentSerialX = startSerialX;
      for (let i = 0; i < displaySerial.length; i++) {
        const char = displaySerial[i];
        drawStencilChar(ctx, char, currentSerialX, startSerialY, digitAdvances[i], digitHeight, cargoFont);
        currentSerialX += digitAdvances[i] + digitSpacing;
      }

      const rightCodeX = width - 72;
      ctx.fillStyle = fgColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const engParts = data.english.split('');
      if (engParts.length === 2) {
        ctx.font = '900 58px Inter, sans-serif';
        ctx.fillText(engParts[0], rightCodeX, height / 2 - 38);
        ctx.fillText(engParts[1], rightCodeX, height / 2 + 38);
      } else {
        ctx.font = '900 52px Inter, sans-serif';
        ctx.fillText(data.english, rightCodeX, height / 2);
      }
    }
    
    const boltPositions = data.system === 'new' ? [] : [
        { x: 45, y: height / 2 },
        { x: width - 45, y: height / 2 }
    ];

    boltPositions.forEach(b => {
        ctx.save();
        ctx.beginPath();
        ctx.arc(b.x, b.y, 11, 0, Math.PI * 2);
        ctx.fillStyle = '#475569';
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 2;
        ctx.stroke();

        const bGrad = ctx.createRadialGradient(b.x - 2, b.y - 2, 2, b.x, b.y, 10);
        bGrad.addColorStop(0, '#FFFFFF');
        bGrad.addColorStop(0.5, '#94A3B8');
        bGrad.addColorStop(1, '#334155');
        ctx.fillStyle = bGrad;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(b.x - 5, b.y - 3);
        ctx.lineTo(b.x + 5, b.y + 3);
        ctx.stroke();
        ctx.restore();
    });

    ctx.restore();
  };

  useEffect(() => {
    document.fonts.ready.then(() => {
      renderPlate();
    });
  }, [data, cargoFont, efpLogo, holoFoil]);

  return (
    <div className="space-y-5">
      {/* 1. Plate Showcase & System Selector */}
      <div className="rounded-2xl border border-border bg-muted/30 dark:bg-muted/10 p-5 flex flex-col items-center">
        {/* Creative Segmented Switcher */}
        <div className="inline-flex items-center p-1 rounded-2xl bg-muted/60 dark:bg-muted/30 border border-border gap-1.5 mb-4 shadow-2xs">
          <button 
            type="button"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              data.system === 'old' 
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border scale-[1.02]' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40 font-semibold'
            }`}
            onClick={() => {
               setInteractedParts({ letters: false, numbers: false });
               const defaultPreset = PLATE_PRESETS.find(p => p.id === '2');
               setData(prev => ({
                 ...prev,
                 system: 'old',
                 category: '2',
                 amharic: defaultPreset?.amharic || 'ኢ.ት',
                 english: defaultPreset?.english || 'AA',
                 serial: defaultPreset?.serialOld || 'A12345'
               }));
            }}
          >
            <span className={`w-2 h-2 rounded-full transition-all ${data.system === 'old' ? 'bg-primary ring-2 ring-primary/25 scale-110' : 'bg-muted-foreground/30'}`} />
            <span>{t('plate.oldPlate', 'Old Plate')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono tracking-tight transition-colors ${
              data.system === 'old' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
            }`}>
              A12345
            </span>
          </button>
          <button 
            type="button"
            className={`flex items-center gap-2.5 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
              data.system === 'new' 
                ? 'bg-background text-foreground shadow-sm ring-1 ring-border scale-[1.02]' 
                : 'text-muted-foreground hover:text-foreground hover:bg-background/40 font-semibold'
            }`}
            onClick={() => {
                const defaultPreset = PLATE_PRESETS.find(p => p.id === data.category) || PLATE_PRESETS[1];
                setData(prev => ({
                 ...prev,
                 system: 'new',
                 amharic: data.category === 'police' ? 'ፖሊስ' : 'ኢት',
                 serial: defaultPreset?.serialNew || 'AAA0000'
                }));
            }}
          >
            <span className={`w-2 h-2 rounded-full transition-all ${data.system === 'new' ? 'bg-emerald-500 ring-2 ring-emerald-500/25 scale-110' : 'bg-muted-foreground/30'}`} />
            <span>{t('plate.newPlate', 'New Plate')}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono tracking-tight transition-colors ${
              data.system === 'new' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
            }`}>
              {data.category === 'police' ? '0001' : 'AAA0000'}
            </span>
          </button>
        </div>

        <div className="w-full flex justify-center py-2">
          <canvas 
            ref={canvasRef} 
            onClick={handlePreviewClick}
            width={1000} 
            height={260} 
            className="w-full h-auto max-w-[560px] drop-shadow-md transition-transform duration-150 rounded-lg cursor-pointer hover:scale-[1.01] active:scale-[0.99]" 
            style={{ fontFamily: 'CARGO' }} 
            title={t('plate.clickToEdit', 'Click to edit plate serial number')}
          />
        </div>
      </div>

      {/* 2. Plate Serial Number Card */}
      <div className="bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between max-w-lg mx-auto mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {t('plate.enterPlateNumber', 'Plate Serial Number')}
            </label>
          </div>
          <button 
            type="button" 
            onClick={() => setField('serial', '')} 
            className="text-xs text-red-500 hover:text-red-600 font-semibold px-2.5 py-1 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors border border-red-200 dark:border-red-900/50"
          >
            {t('common.clear', 'Clear')}
          </button>
        </div>
        
        <div className="max-w-lg mx-auto">
          <div className="flex bg-white dark:bg-[#101012] p-1.5 rounded-xl border border-slate-300 dark:border-zinc-700 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
            {data.system === 'new' ? (
              data.category === 'police' ? (
                <div className="relative w-full flex items-center justify-center">
                  <CargoTextOverlay text={data.serial.replace(/[^A-Z0-9]/ig, '').toUpperCase().substring(0, 4)} font={cargoFont} className={!data.serial ? 'opacity-0' : ''} />
                  <input
                    type="text"
                    value={data.serial.replace(/[^A-Z0-9]/ig, '').toUpperCase().substring(0, 4)}
                    onChange={e => {
                      setField('serial', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4));
                    }}
                    maxLength={4}
                    className="w-full bg-transparent py-3 text-center uppercase tracking-widest text-transparent selection:bg-primary/30 selection:text-transparent caret-primary z-10 text-4xl outline-none"
                  />
                </div>
              ) : (
              <>
                <div className="relative w-2/5 flex items-center justify-center">
                  <CargoTextOverlay text={(data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 3)} font={cargoFont} className={!(data.serial.match(/^[A-Z]+/i) || [''])[0] ? 'opacity-0' : ''} />
                  <input 
                    ref={newLettersInputRef}
                    type="text" 
                    onFocus={() => {
                      if (!interactedParts.letters) {
                        const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '');
                        setField('serial', n);
                        setInteractedParts(prev => ({ ...prev, letters: true }));
                      }
                    }}
                    onClick={e => {
                      const input = e.currentTarget;
                      if (input.value.length === 3) {
                        const start = input.selectionStart || 0;
                        if (start === input.selectionEnd) {
                          if (start > 0) input.setSelectionRange(start - 1, start);
                          else input.setSelectionRange(0, 1);
                        }
                      }
                    }}
                    value={(data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 3)} 
                    onChange={e => {
                       const l = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3);
                       const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 4);
                       setField('serial', l + n);
                       if (l.length === 3) {
                         setTimeout(() => newDigitsInputRef.current?.focus(), 0);
                       }
                    }}
                    maxLength={3}
                    onKeyDown={e => {
                      const input = e.currentTarget;
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      if (start === end && input.value.length === 3 && /^[A-Za-z]$/.test(e.key) && start < 3) {
                        e.preventDefault();
                        const val = input.value;
                        const newVal = val.slice(0, start) + e.key.toUpperCase() + val.slice(start + 1);
                        const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 4);
                        setField('serial', newVal + n);
                        setTimeout(() => {
                          if (start + 1 >= 3) {
                            newDigitsInputRef.current?.focus();
                          } else {
                            input.setSelectionRange(start + 1, start + 1);
                          }
                        }, 0);
                      }
                    }}
                    className="w-full bg-transparent py-3 text-center uppercase tracking-widest text-transparent selection:bg-primary/30 selection:text-transparent caret-primary z-10 text-4xl outline-none"
                  />
                </div>
                <div className="w-px bg-slate-200 dark:bg-zinc-800 my-2"></div>
                <div className="relative w-3/5 flex items-center justify-center">
                  <CargoTextOverlay text={data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 4)} font={cargoFont} className={!data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '') ? 'opacity-0' : ''} />
                  <input 
                    ref={newDigitsInputRef}
                    type="text" 
                    onFocus={() => {
                      if (!interactedParts.numbers) {
                        const l = (data.serial.match(/^[A-Z]+/i) || [''])[0];
                        setField('serial', l);
                        setInteractedParts(prev => ({ ...prev, numbers: true }));
                      }
                    }}
                    onClick={e => {
                      const input = e.currentTarget;
                      if (input.value.length === 4) {
                        const start = input.selectionStart || 0;
                        if (start === input.selectionEnd) {
                          if (start > 0) input.setSelectionRange(start - 1, start);
                          else input.setSelectionRange(0, 1);
                        }
                      }
                    }}
                    value={data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 4)} 
                    onChange={e => {
                       const l = (data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 3);
                       const n = e.target.value.replace(/[^0-9]/g, '').substring(0, 4);
                       setField('serial', l + n);
                    }}
                    maxLength={4}
                    onKeyDown={e => {
                      const input = e.currentTarget;
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      if (start === end && input.value.length === 4 && /^[0-9]$/.test(e.key) && start < 4) {
                        e.preventDefault();
                        const val = input.value;
                        const newVal = val.slice(0, start) + e.key + val.slice(start + 1);
                        const l = (data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 3);
                        setField('serial', l + newVal);
                        setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                      }
                    }}
                    className="w-full bg-transparent py-3 text-center uppercase tracking-widest text-transparent selection:bg-primary/30 selection:text-transparent caret-primary z-10 text-4xl outline-none"
                  />
                </div>
              </>
              )
            ) : (
              <>
                <div className="relative w-1/4 flex items-center justify-center">
                  <CargoTextOverlay text={(data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 1)} font={cargoFont} className={!(data.serial.match(/^[A-Z]+/i) || [''])[0] ? 'opacity-0' : ''} />
                  <input 
                    ref={oldLettersInputRef}
                    type="text" 
                    onFocus={() => {
                      if (!interactedParts.letters) {
                        const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '');
                        setField('serial', n);
                        setInteractedParts(prev => ({ ...prev, letters: true }));
                      }
                    }}
                    onClick={e => {
                      const input = e.currentTarget;
                      if (input.value.length === 1) {
                        const start = input.selectionStart || 0;
                        if (start === input.selectionEnd) {
                          if (start > 0) input.setSelectionRange(start - 1, start);
                          else input.setSelectionRange(0, 1);
                        }
                      }
                    }}
                    value={(data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 1)} 
                    onChange={e => {
                       const l = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 1);
                       const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 5);
                       setField('serial', l + n);
                       if (l.length === 1) {
                         setTimeout(() => oldDigitsInputRef.current?.focus(), 0);
                       }
                    }}
                    maxLength={1}
                    onKeyDown={e => {
                      const input = e.currentTarget;
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      if (start === end && input.value.length === 1 && /^[A-Za-z]$/.test(e.key) && start < 1) {
                        e.preventDefault();
                        const val = input.value;
                        const newVal = val.slice(0, start) + e.key.toUpperCase() + val.slice(start + 1);
                        const n = data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 5);
                        setField('serial', newVal + n);
                        setTimeout(() => oldDigitsInputRef.current?.focus(), 0);
                      }
                    }}
                    className="w-full bg-transparent py-3 text-center uppercase tracking-widest text-transparent selection:bg-primary/30 selection:text-transparent caret-primary z-10 text-4xl outline-none"
                  />
                </div>
                <div className="w-px bg-slate-200 dark:bg-zinc-800 my-2"></div>
                <div className="relative w-3/4 flex items-center justify-center">
                  <CargoTextOverlay text={data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 5)} font={cargoFont} className={!data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '') ? 'opacity-0' : ''} />
                  <input 
                    ref={oldDigitsInputRef}
                    type="text" 
                    onFocus={() => {
                      if (!interactedParts.numbers) {
                        const l = (data.serial.match(/^[A-Z]+/i) || [''])[0];
                        setField('serial', l);
                        setInteractedParts(prev => ({ ...prev, numbers: true }));
                      }
                    }}
                    onClick={e => {
                      const input = e.currentTarget;
                      if (input.value.length === 5) {
                        const start = input.selectionStart || 0;
                        if (start === input.selectionEnd) {
                          if (start > 0) input.setSelectionRange(start - 1, start);
                          else input.setSelectionRange(0, 1);
                        }
                      }
                    }}
                    value={data.serial.replace(/^[A-Z]+/i, '').replace(/[^0-9]/g, '').substring(0, 5)} 
                    onChange={e => {
                       const l = (data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 1);
                       const n = e.target.value.replace(/[^0-9]/g, '').substring(0, 5);
                       setField('serial', l + n);
                    }}
                    maxLength={5}
                    onKeyDown={e => {
                      const input = e.currentTarget;
                      const start = input.selectionStart || 0;
                      const end = input.selectionEnd || 0;
                      if (start === end && input.value.length === 5 && /^[0-9]$/.test(e.key) && start < 5) {
                        e.preventDefault();
                        const val = input.value;
                        const newVal = val.slice(0, start) + e.key + val.slice(start + 1);
                        const l = (data.serial.match(/^[A-Z]+/i) || [''])[0].substring(0, 1);
                        setField('serial', l + newVal);
                        setTimeout(() => input.setSelectionRange(start + 1, start + 1), 0);
                      }
                    }}
                    className="w-full bg-transparent py-3 text-center uppercase tracking-widest text-transparent selection:bg-primary/30 selection:text-transparent caret-primary z-10 text-4xl outline-none"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex justify-between items-center px-3 pt-2 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            <span>{data.system === 'new' ? t('plate.lettersHint', '3 Letters (e.g. AAA)') : t('plate.letterHint', '1 Letter (e.g. A)')}</span>
            <span>{data.system === 'new' ? t('plate.digitsHintNew', '4 Digits (e.g. 1234)') : t('plate.digitsHintOld', '5 Digits (e.g. 12345)')}</span>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-[#161619] border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            {t('plate.configurationOptions', 'Category & Parameters')}
          </label>
        </div>

        <div className={`grid grid-cols-1 gap-4 ${data.system === 'old' ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
          <div className={data.system === 'new' ? 'md:col-span-1' : ''}>
            <ModernSelect 
              label={t('common.category', 'Category')}
              value={data.category} 
              onValueChange={v => {
                 const preset = PLATE_PRESETS.find(p => p.id === v);
                 if (preset) applyPreset(preset);
              }}
              options={PLATE_PRESETS.map(p => ({ value: p.id, label: t(`plate.presets.${['1','2','3','4','5'].includes(p.id) ? 'code'+p.id : p.id}`, p.name) }))}
            />
          </div>

          {data.system === 'new' && (
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setField('isEV', !data.isEV)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                  data.isEV
                    ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-950 dark:text-emerald-300 ring-1 ring-emerald-500/30'
                    : 'bg-white dark:bg-[#121214] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  data.isEV ? 'bg-emerald-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}>
                  <Zap className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('plate.isEV', 'Electric / EV')}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t('plate.isEVDesc', 'Green Transport Stripe')}</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setField('isPD', !data.isPD)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left group ${
                  data.isPD
                    ? 'bg-blue-500/10 border-blue-500/40 text-blue-950 dark:text-blue-300 ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-[#121214] border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-zinc-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  data.isPD ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-zinc-800 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'
                }`}>
                  <Accessibility className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{t('plate.isPD', 'Disabilities (PD)')}</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{t('plate.isPDDesc', 'Wheelchair PD Badge')}</div>
                </div>
              </button>
            </div>
          )}

          {data.system === 'old' && (
            <>
              <div>
                 <ModernSelect 
                    label={t('plate.amharicCode', 'Amharic Code')}
                    value={data.amharic} 
                    onValueChange={v => setField('amharic', v)}
                    options={['ኢ.ት', 'ኢ.አ', 'አፋ', 'አማ', 'ቤጉ', 'ድሬ', 'ጋም', 'ሐረ', 'ኦሮ', 'ሶማ', 'ደቡ', 'ትግራ', 'ሲዳ', 'የተመ', 'አሕ', 'ተላላፊ', 'ፖሊስ'].map(c => ({ value: c, label: c }))}
                 />
              </div>

              <div>
                <ModernSelect 
                    label={t('plate.englishCode', 'English Code')}
                    value={data.english} 
                    onValueChange={v => setField('english', v)}
                    options={['AA', 'ET', 'AF', 'AM', 'BG', 'DD', 'GM', 'HR', 'OR', 'SM', 'SN', 'TG', 'UN', 'AU'].map(c => ({ value: c, label: c }))}
                />
              </div>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('plate.quickPresets', 'Quick Presets')}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {PLATE_PRESETS.map(p => {
              const isSelected = data.category === p.id;
              let dotColor = p.fg;
              if (data.system === 'new') {
                if (['1', '2', '3', '4', '5'].includes(p.id)) dotColor = '#000000';
                else if (p.id === 'police') dotColor = '#2563EB';
              }
              
              return (
                <button 
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`text-left p-3 rounded-xl border transition-all flex items-center justify-between group shadow-xs ${
                    isSelected 
                      ? 'border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary/40' 
                      : 'border-slate-200 dark:border-zinc-800 bg-white dark:bg-[#121214] hover:border-slate-300 dark:hover:border-zinc-700 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className={`text-xs font-bold truncate ${isSelected ? 'text-primary font-extrabold' : 'text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors'}`}>
                      {t(`plate.presets.${['1','2','3','4','5'].includes(p.id) ? 'code'+p.id : p.id}`, p.name)}
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                      {p.amharic} {data.system === 'old' && p.english ? `• ${p.english}` : ''}
                    </div>
                  </div>
                  <div 
                    className={`w-4 h-4 rounded-full border-2 shadow-xs shrink-0 transition-transform ${isSelected ? 'scale-110 ring-2 ring-primary/50' : 'group-hover:scale-105'}`} 
                    style={{ backgroundColor: dotColor, borderColor: dotColor === '#FFFFFF' ? '#CBD5E1' : '#FFFFFF' }} 
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function drawStencilChar(
    ctx: CanvasRenderingContext2D, 
    char: string, 
    x: number, 
    y: number, 
    width: number, 
    height: number,
    cargoFont?: opentype.Font | null,
    opts?: { isNewPlateText?: boolean }
) {
    if (cargoFont) {
        ctx.save();
        const fontSize = height; 
        
        const path = cargoFont.getPath(char, 0, 0, fontSize);
        const bbox = path.getBoundingBox();
        
        const charActualWidth = bbox.x2 - bbox.x1;
        const charActualHeight = bbox.y2 - bbox.y1;
        
        const xOffset = x + (width - charActualWidth) / 2 - bbox.x1;
        const yOffset = y + (height - charActualHeight) / 2 - bbox.y1;
        
        const positionedPath = cargoFont.getPath(char, xOffset, yOffset, fontSize);
        
        if (opts?.isNewPlateText) {
            const originalFill = ctx.fillStyle as string;
            
            ctx.shadowColor = 'rgba(0,0,0,0.4)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 4;
            ctx.lineJoin = 'round';
            positionedPath.stroke = '#FFFFFF';
            positionedPath.strokeWidth = 6;
            positionedPath.fill = null;
            positionedPath.draw(ctx);
            
            ctx.shadowColor = 'transparent';
            positionedPath.stroke = null;
            positionedPath.fill = originalFill;
            positionedPath.draw(ctx);
        } else {
            positionedPath.fill = ctx.fillStyle as string;
            positionedPath.draw(ctx);
        }
        
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(x, y);

    const w = width;
    const h = height;
    const t = w * 0.20;
    const chamfer = w * 0.24;

    ctx.beginPath();

    switch (char) {
        case 'A':
            ctx.moveTo(w * 0.35, 0);
            ctx.lineTo(w * 0.65, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(w - t * 1.3, h);
            ctx.lineTo(w * 0.72, h * 0.58);
            ctx.lineTo(w * 0.28, h * 0.58);
            ctx.lineTo(t * 1.3, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.moveTo(w * 0.5, h * 0.16);
            ctx.lineTo(w * 0.68, h * 0.44);
            ctx.lineTo(w * 0.32, h * 0.44);
            ctx.closePath();
            ctx.fill();
            break;
        case 'B':
            ctx.moveTo(0, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h * 0.44 - chamfer);
            ctx.lineTo(w - chamfer, h * 0.44);
            ctx.lineTo(w - chamfer, h * 0.56);
            ctx.lineTo(w, h * 0.56 + chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(0, h);
            ctx.closePath();
            ctx.moveTo(t, t);
            ctx.lineTo(w - chamfer, t);
            ctx.lineTo(w - t, chamfer + t * 0.2);
            ctx.lineTo(w - t, h * 0.44 - t);
            ctx.lineTo(t, h * 0.44 - t);
            ctx.closePath();
            ctx.moveTo(t, h * 0.56 + t);
            ctx.lineTo(w - t, h * 0.56 + t);
            ctx.lineTo(w - t, h - chamfer);
            ctx.lineTo(w - chamfer, h - t);
            ctx.lineTo(t, h - t);
            ctx.closePath();
            ctx.fill();
            break;
        case 'C':
            ctx.moveTo(w, chamfer);
            ctx.lineTo(w - t * 1.2, chamfer);
            ctx.lineTo(w - t * 1.2, t);
            ctx.lineTo(chamfer, t);
            ctx.lineTo(t, chamfer);
            ctx.lineTo(t, h - chamfer);
            ctx.lineTo(chamfer, h - t);
            ctx.lineTo(w - t * 1.2, h - t);
            ctx.lineTo(w - t * 1.2, h - chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(chamfer, h);
            ctx.lineTo(0, h - chamfer);
            ctx.lineTo(0, chamfer);
            ctx.lineTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.closePath();
            ctx.fill();
            break;
        case '0':
            ctx.moveTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(chamfer, h);
            ctx.lineTo(0, h - chamfer);
            ctx.lineTo(0, chamfer);
            ctx.closePath();
            ctx.moveTo(t, chamfer);
            ctx.lineTo(t, h - chamfer);
            ctx.lineTo(chamfer, h - t);
            ctx.lineTo(w - chamfer, h - t);
            ctx.lineTo(w - t, h - chamfer);
            ctx.lineTo(w - t, chamfer);
            ctx.lineTo(w - chamfer, t);
            ctx.lineTo(chamfer, t);
            ctx.closePath();
            ctx.fill();
            break;
        case '1':
            ctx.moveTo(0, h * 0.28);
            ctx.lineTo(w * 0.45, 0);
            ctx.lineTo(w, 0);
            ctx.lineTo(w, h);
            ctx.lineTo(w - t * 1.5, h);
            ctx.lineTo(w - t * 1.5, t * 1.1);
            ctx.lineTo(w * 0.35, t * 1.1);
            ctx.lineTo(0, h * 0.38);
            ctx.closePath();
            ctx.fill();
            break;
        case '2':
            ctx.moveTo(0, chamfer);
            ctx.lineTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h * 0.46);
            ctx.lineTo(t * 1.5, h - t);
            ctx.lineTo(w, h - t);
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.lineTo(0, h * 0.65);
            ctx.lineTo(w - t * 1.8, h * 0.42);
            ctx.lineTo(w - t * 1.4, t);
            ctx.lineTo(chamfer, t);
            ctx.lineTo(0, chamfer + t * 0.4);
            ctx.closePath();
            ctx.fill();
            break;
        case '3':
            ctx.moveTo(0, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h * 0.44);
            ctx.lineTo(w - t * 1.3, h * 0.44);
            ctx.lineTo(w - t * 1.3, t);
            ctx.lineTo(t, t);
            ctx.lineTo(t, 0);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w * 0.25, h * 0.48);
            ctx.lineTo(w - chamfer, h * 0.48);
            ctx.lineTo(w, h * 0.48 + chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(0, h);
            ctx.lineTo(0, h - t);
            ctx.lineTo(w - chamfer, h - t);
            ctx.lineTo(w - t * 1.3, h - chamfer);
            ctx.lineTo(w - t * 1.3, h * 0.48 + t);
            ctx.lineTo(w * 0.25, h * 0.48 + t);
            ctx.closePath();
            ctx.fill();
            break;
        case '4':
            ctx.fillRect(0, 0, t, h * 0.52);
            ctx.fillRect(0, h * 0.42, w, t * 1.1);
            ctx.fillRect(w - t * 1.4, 0, t * 1.4, h);
            break;
        case '5':
            ctx.fillRect(0, 0, w, t);
            ctx.fillRect(0, 0, t, h * 0.46);
            ctx.beginPath();
            ctx.moveTo(0, h * 0.42);
            ctx.lineTo(w - chamfer, h * 0.42);
            ctx.lineTo(w, h * 0.42 + chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(0, h);
            ctx.lineTo(0, h - t);
            ctx.lineTo(w - chamfer, h - t);
            ctx.lineTo(w - t, h - chamfer);
            ctx.lineTo(w - t, h * 0.42 + t);
            ctx.lineTo(0, h * 0.42 + t);
            ctx.closePath();
            ctx.fill();
            break;
        case '6':
            ctx.moveTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, t);
            ctx.lineTo(t * 1.3, t);
            ctx.lineTo(0, h - chamfer);
            ctx.lineTo(chamfer, h);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w, h * 0.44);
            ctx.lineTo(chamfer, h * 0.44);
            ctx.lineTo(0, h * 0.44 + chamfer);
            ctx.closePath();
            ctx.moveTo(t * 1.2, h * 0.44 + t);
            ctx.lineTo(w - t * 1.2, h * 0.44 + t);
            ctx.lineTo(w - t * 1.2, h - t);
            ctx.lineTo(t * 1.2, h - t);
            ctx.closePath();
            ctx.fill();
            break;
        case '7':
            ctx.moveTo(0, 0);
            ctx.lineTo(w, 0);
            ctx.lineTo(w * 0.52, h);
            ctx.lineTo(w * 0.52 - t * 1.4, h);
            ctx.lineTo(w - t * 1.4, t);
            ctx.lineTo(0, t);
            ctx.closePath();
            ctx.fill();
            break;
        case '8':
            ctx.moveTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h * 0.46 - chamfer);
            ctx.lineTo(w - chamfer, h * 0.46);
            ctx.lineTo(chamfer, h * 0.46);
            ctx.lineTo(0, h * 0.46 - chamfer);
            ctx.lineTo(0, chamfer);
            ctx.closePath();
            ctx.moveTo(t, chamfer);
            ctx.lineTo(t, h * 0.46 - chamfer);
            ctx.lineTo(chamfer, h * 0.46 - t);
            ctx.lineTo(w - chamfer, h * 0.46 - t);
            ctx.lineTo(w - t, h * 0.46 - chamfer);
            ctx.lineTo(w - t, chamfer);
            ctx.lineTo(w - chamfer, t);
            ctx.lineTo(chamfer, t);
            ctx.closePath();
            ctx.moveTo(chamfer, h * 0.54);
            ctx.lineTo(w - chamfer, h * 0.54);
            ctx.lineTo(w, h * 0.54 + chamfer);
            ctx.lineTo(w, h - chamfer);
            ctx.lineTo(w - chamfer, h);
            ctx.lineTo(chamfer, h);
            ctx.lineTo(0, h - chamfer);
            ctx.lineTo(0, h * 0.54 + chamfer);
            ctx.closePath();
            ctx.moveTo(t, h * 0.54 + chamfer);
            ctx.lineTo(t, h - chamfer);
            ctx.lineTo(chamfer, h - t);
            ctx.lineTo(w - chamfer, h - t);
            ctx.lineTo(w - t, h - chamfer);
            ctx.lineTo(w - t, h * 0.54 + chamfer);
            ctx.lineTo(w - chamfer, h * 0.54 + t);
            ctx.lineTo(chamfer, h * 0.54 + t);
            ctx.closePath();
            ctx.fill();
            break;
        case '9':
            ctx.moveTo(chamfer, 0);
            ctx.lineTo(w - chamfer, 0);
            ctx.lineTo(w, chamfer);
            ctx.lineTo(w, h);
            ctx.lineTo(w - t * 1.4, h);
            ctx.lineTo(w - t * 1.4, h * 0.54);
            ctx.lineTo(chamfer, h * 0.54);
            ctx.lineTo(0, h * 0.54 - chamfer);
            ctx.lineTo(0, chamfer);
            ctx.closePath();
            ctx.moveTo(t * 1.2, chamfer);
            ctx.lineTo(t * 1.2, h * 0.54 - t);
            ctx.lineTo(w - t * 1.4, h * 0.54 - t);
            ctx.lineTo(w - t * 1.4, t);
            ctx.lineTo(chamfer, t);
            ctx.closePath();
            ctx.fill();
            break;
        default:
            ctx.font = `900 ${h * 0.95}px Inter, sans-serif`;
            ctx.textAlign = "left";
            ctx.textBaseline = "top";
            ctx.fillText(char, 0, 0);
            break;
    }

    ctx.restore();
}

export default function EthiopianPlateInput({ value, onChange, isSearching, inputSize = 'default' }: Props) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  // Preload plate assets as soon as the input component mounts
  useEffect(() => {
    preloadPlateAssets();
  }, []);

  const displayData = parsePlateNumber(value);
  const displayText = displayData 
    ? `${displayData.amharic} - ${displayData.system === 'new' ? '' : displayData.english + ' '}${displayData.category} - ${displayData.serial}`
    : t('plate.configure', 'Configure License Plate');

  const handleOpen = () => {
    if (!value || value === '{"category":"","system":"old","amharic":"","english":"","serial":""}') {
        const defaultPreset = PLATE_PRESETS.find(p => p.id === '2') || PLATE_PRESETS[1];
        setTempValue(JSON.stringify({
           category: defaultPreset.id,
           system: 'old',
           amharic: defaultPreset.amharic,
           english: defaultPreset.english,
           serial: defaultPreset.serialOld
        }));
    } else {
        setTempValue(value);
    }
    setIsOpen(true);
  };

  return (
    <>
      <div 
        className="relative cursor-pointer group" 
        onClick={handleOpen}
        onMouseEnter={() => preloadPlateAssets()}
      >
        <ModernInput
          readOnly
          value={displayText}
          icon={Car}
          inputSize={inputSize}
          className={`cursor-pointer pr-24 ${displayData ? 'font-mono font-semibold text-xs text-foreground' : 'font-medium text-xs text-muted-foreground'}`}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
          {isSearching ? (
            <span className="flex items-center gap-1.5 text-[8.5px] text-blue-600 dark:text-blue-400 font-bold px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded uppercase tracking-wider shadow-xs">
              <Loader2 className="w-2.5 h-2.5 animate-spin" />
              {t('orders.create.searching', 'Searching...')}
            </span>
          ) : (
            <span className="text-[9px] text-primary font-bold px-2 py-0.5 bg-primary/10 rounded uppercase tracking-wider shadow-2xs">{t('plate.configureBadge', 'Configure')}</span>
          )}
        </div>
      </div>

      {isOpen && createPortal(
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-black/60 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#161618] border border-slate-200 dark:border-zinc-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-[#121214]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-xs">
                  <Car className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">
                    {t('plate.configuration', 'License Plate Configuration')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('plate.subtitle', 'Configure Ethiopian standard or federal vehicle plate')}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-500 dark:text-slate-300 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar">
              <EthiopianPlateConfigurator value={tempValue} onChange={setTempValue} />
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-slate-50 dark:bg-[#121214]">
              <button 
                type="button" 
                onClick={() => setIsOpen(false)}
                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-zinc-800 transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button 
                type="button" 
                onClick={() => {
                  onChange(tempValue);
                  setIsOpen(false);
                }}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary/90 flex items-center gap-2 transition-all shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/35 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98]"
              >
                <Check size={18} />
                {t('plate.confirmPlate', 'Confirm Plate')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
