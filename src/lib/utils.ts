import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "../i18n"
import { formatEthiopian } from "amharic-datepicker-utils"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAppDate(dateInput: any, includeTime = false, language?: string): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';

    const currentLang = (language || i18n.language || 'en').startsWith('am') ? 'am' : 'en';

    if (currentLang === 'am') {
      return formatEthiopian(d, includeTime ? 'datetime' : 'long');
    }

    const options: Intl.DateTimeFormatOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      ...(includeTime ? { hour: '2-digit', minute: '2-digit' } : {})
    };
    return d.toLocaleDateString('en-US', options);
  } catch (error) {
    return String(dateInput);
  }
}

export function formatDashboardBannerDate(dateInput: any = new Date(), language?: string): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    const currentLang = (language || i18n.language || 'en').startsWith('am') ? 'am' : 'en';

    if (currentLang === 'am') {
      return formatEthiopian(d, 'full');
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  } catch {
    return '';
  }
}

export function formatShortDate(dateInput: any, includeTime = false, language?: string): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    const currentLang = (language || i18n.language || 'en').startsWith('am') ? 'am' : 'en';

    if (currentLang === 'am') {
      return formatEthiopian(d, includeTime ? 'MMMM D, a h:mm' : 'MMMM D');
    }

    const shortMonth = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    if (!includeTime) {
      return `${shortMonth} ${day}`;
    }
    const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `${shortMonth} ${day}, ${timeStr}`;
  } catch {
    return String(dateInput);
  }
}

export function formatCurrency(value: string | number | undefined | null, language?: 'en' | 'am'): string {
  const currentLang = language || (i18n.language as 'en' | 'am') || 'en';
  const currencySymbol = currentLang === 'am' ? 'ብር' : 'Birr';
  
  if (value === null || value === undefined) {
    return `0 ${currencySymbol}`;
  }
  
  const num = Number(value);
  if (isNaN(num)) {
    return `0 ${currencySymbol}`;
  }
  
  return `${num.toLocaleString('en-US')} ${currencySymbol}`;
}

export function formatInputNumber(value: string): string {
  if (!value) return '';
  const cleanValue = value.replace(/[^0-9.]/g, ''); // Allow digits and decimal points
  if (!cleanValue) return '';
  
  const parts = cleanValue.split('.');
  parts[0] = Number(parts[0]).toLocaleString('en-US');
  return parts.join('.');
}

export function parseInputNumber(value: string): number {
  if (!value) return 0;
  return Number(value.replace(/,/g, '')) || 0;
}

export function getImageUrl(relativeUrl?: string | null): string | undefined {
  if (!relativeUrl) return undefined;
  
  // Clean up leading slashes just in case
  const path = relativeUrl.startsWith('/') ? relativeUrl.slice(1) : relativeUrl;
  
  // Use VITE_API_BASE_URL or VITE_API_URL or default to localhost
  const baseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
  return `${baseUrl}/uploads/${path}`;
}

export function formatUnit(unit: string | undefined | null, language?: 'en' | 'am'): string {
  if (!unit) return '';
  const currentLang = language || (i18n.language as 'en' | 'am') || 'en';
  const normalized = unit.toUpperCase().trim();
  if (currentLang === 'am') {
    switch (normalized) {
      case 'PCS': return 'ፍሬ';
      case 'METERS': return 'ሜትር';
      case 'LITERS': return 'ሊትር';
      default: return unit;
    }
  }
  switch (normalized) {
    case 'PCS': return 'Pcs';
    case 'METERS': return 'Meters';
    case 'LITERS': return 'Liters';
    default: return unit;
  }
}

export function isUnitIntegerOnly(unit: string | undefined | null): boolean {
  if (!unit) return false;
  return unit.toUpperCase().trim() === 'PCS';
}

export function isValidQuantityForUnit(
  quantity: number | string | undefined | null,
  unit: string | undefined | null
): boolean {
  if (quantity === undefined || quantity === null || quantity === '') return false;
  const num = Number(quantity);
  if (isNaN(num)) return false;
  if (isUnitIntegerOnly(unit)) {
    return Number.isInteger(num);
  }
  return true;
}

export function getQuantityStep(unit: string | undefined | null): string {
  return isUnitIntegerOnly(unit) ? '1' : '0.01';
}

export function getQuantityPattern(unit: string | undefined | null, allowNegative = false): RegExp {
  const isInt = isUnitIntegerOnly(unit);
  if (allowNegative) {
    return isInt ? /^-?\d*$/ : /^-?\d*\.?\d*$/;
  }
  return isInt ? /^\d*$/ : /^\d*\.?\d*$/;
}

export function getMaterialUnallocatedStock(
  material: any,
  storeType: 'MAIN' | 'MINI'
): number {
  if (!material || !material.brands || material.brands.length === 0) return 0;
  const storeTypeStr = String(storeType);
  const matStock = material.materialStocks?.find(
    (s: any) => s.store?.type === storeTypeStr || s.storeType === storeTypeStr
  );
  const total = matStock ? Number(matStock.quantity) || 0 : 0;
  if (total <= 0) return 0;

  let brandTotal = 0;
  for (const b of material.brands) {
    const bStock = b.brandStocks?.find(
      (s: any) => s.store?.type === storeTypeStr || s.storeType === storeTypeStr
    );
    brandTotal += bStock ? Number(bStock.quantity) || 0 : 0;
  }

  const unallocated = total - brandTotal;
  return unallocated > 0 ? Math.round(unallocated * 100) / 100 : 0;
}

export function formatBrandSizeLabel(brand?: { name?: string | null; size?: string | null; color?: string | null; type?: string | null; brandName?: string | null; sizeName?: string | null; colorName?: string | null; typeName?: string | null }): string {
  if (!brand) return '';
  const name = (brand.name || brand.brandName || '').trim();
  const size = (brand.size || brand.sizeName || '').trim();
  const color = (brand.color || brand.colorName || '').trim();
  const type = (brand.type || brand.typeName || '').trim();
  const isUniversal = name.toLowerCase() === 'universal' || name.toLowerCase() === 'standard';

  // Build attribute parts (skip empties)
  const attrs = [size, color, type].filter(Boolean);

  if (isUniversal) {
    return attrs.length > 0 ? attrs.join(' • ') : '';
  }
  if (name && attrs.length > 0) {
    return `${name} • ${attrs.join(' • ')}`;
  }
  return name || (attrs.length > 0 ? attrs.join(' • ') : '');
}

export function formatStatus(status: string | undefined | null, language?: 'en' | 'am'): string {
  if (!status) return '';
  const currentLang = language || (i18n.language as 'en' | 'am') || 'en';
  const norm = status.toUpperCase().replace(/\s+/g, '_').trim();
  
  if (currentLang === 'am') {
    switch (norm) {
      case 'OPEN': return 'ክፍት';
      case 'WAITING': return 'በመጠባበቅ ላይ';
      case 'IN_PROGRESS':
      case 'INPROGRESS': return 'በሂደት ላይ';
      case 'READY_FOR_PICKUP': return 'ለመረከብ ዝግጁ';
      case 'COMPLETED': return 'ተጠናቋል';
      case 'DELIVERED': return 'ተረክቧል';
      case 'CANCELLED': return 'ተሰርዟል';
      case 'ALL': return 'ሁሉም';
      case 'UNPAID': return 'ያልተከፈለ';
      case 'PARTIALLY_PAID':
      case 'PARTIAL': return 'በከፊል የተከፈለ';
      case 'PAID': return 'የተከፈለ';
      case 'ACTIVE': return 'ንቁ';
      case 'INACTIVE': return 'ቦዝኗል';
      case 'REFUNDED': return 'የተመለሰ';
      case 'DAMAGE': return 'ብልሽት/ጉዳት';
      case 'LOST': return 'የጠፋ/የጎደለ';
      case 'EXPIRED': return 'ጊዜው ያለፈበት';
      case 'RESTOCK': return 'የዕቃ ግዢ';
      case 'RETURN': return 'ተመላሽ';
      default: return i18n.t(`status.${norm.toLowerCase()}`, status.replace(/_/g, ' '));
    }
  }

  switch (norm) {
    case 'OPEN': return 'Open';
    case 'WAITING': return 'Waiting';
    case 'IN_PROGRESS':
    case 'INPROGRESS': return 'In Progress';
    case 'READY_FOR_PICKUP': return 'Ready for Pickup';
    case 'COMPLETED': return 'Completed';
    case 'DELIVERED': return 'Delivered';
    case 'CANCELLED': return 'Cancelled';
    case 'ALL': return 'All';
    case 'UNPAID': return 'Unpaid';
    case 'PARTIALLY_PAID':
    case 'PARTIAL': return 'Partially Paid';
    case 'PAID': return 'Paid';
    case 'ACTIVE': return 'Active';
    case 'INACTIVE': return 'Inactive';
    case 'REFUNDED': return 'Refunded';
    case 'DAMAGE': return 'Damage';
    case 'LOST': return 'Lost / Shortage';
    case 'EXPIRED': return 'Expired';
    case 'RESTOCK': return 'Restock';
    case 'RETURN': return 'Return';
    default: return i18n.t(`status.${norm.toLowerCase()}`, status.replace(/_/g, ' '));
  }
}

export function formatPaymentMethod(method: string | undefined | null, language?: 'en' | 'am'): string {
  if (!method) return '';
  const currentLang = language || (i18n.language as 'en' | 'am') || 'en';
  const norm = method.toUpperCase().replace(/\s+/g, '_').trim();

  if (currentLang === 'am') {
    switch (norm) {
      case 'CASH': return 'ጥሬ ገንዘብ';
      case 'TELEBIRR': return 'ቴሌብር';
      case 'CBE_BIRR':
      case 'CBEBIRR': return 'ሲቢኢ ብር';
      case 'CBE': return 'ንግድ ባንክ';
      case 'BANK_TRANSFER':
      case 'BANK': return 'የባንክ ዝውውር';
      case 'CARD': return 'ካርድ';
      case 'MOBILE': return 'ሞባይል';
      case 'OTHER': return 'ሌላ';
      default: return i18n.t(`payment.${norm.toLowerCase()}`, method.replace(/_/g, ' '));
    }
  }

  switch (norm) {
    case 'CASH': return 'Cash';
    case 'TELEBIRR': return 'Telebirr';
    case 'CBE_BIRR':
    case 'CBEBIRR': return 'CBE Birr';
    case 'CBE': return 'CBE';
    case 'BANK_TRANSFER':
    case 'BANK': return 'Bank Transfer';
    case 'CARD': return 'Card';
    case 'MOBILE': return 'Mobile';
    case 'OTHER': return 'Other';
    default: return i18n.t(`payment.${norm.toLowerCase()}`, method.replace(/_/g, ' '));
  }
}



