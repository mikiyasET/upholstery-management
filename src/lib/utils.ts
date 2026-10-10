import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n from "../i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAppDate(dateInput: any, includeTime = false): string {
  if (!dateInput) return '-';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '-';
    
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
  
  // Use VITE_API_URL or default to localhost
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
  
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
    case 'CBEBIRR': return 'ሲቢኢ ብር';
    case 'CBE': return 'ንግድ ባንክ';
    case 'BANK_TRANSFER':
    case 'BANK': return 'Bank Transfer';
    case 'CARD': return 'Card';
    case 'MOBILE': return 'Mobile';
    case 'OTHER': return 'Other';
    default: return i18n.t(`payment.${norm.toLowerCase()}`, method.replace(/_/g, ' '));
  }
}



