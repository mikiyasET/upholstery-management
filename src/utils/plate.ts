export interface PlateData {
  category: string;
  system: 'old' | 'new';
  amharic: string;
  english: string;
  serial: string;
  isEV?: boolean;
  isPD?: boolean;
}

export function parsePlateNumber(plateStr?: string): PlateData | null {
  if (!plateStr || typeof plateStr !== 'string') return null;
  const trimmed = plateStr.trim();
  if (!trimmed) return null;

  // 1. Try parsing JSON
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const data = JSON.parse(trimmed);
      if (data && typeof data === 'object' && (data.serial || data.category)) {
        return {
          category: String(data.category || '2').toLowerCase(),
          system: data.system || 'old',
          amharic: data.amharic || 'ኢትዮጵያ',
          english: data.english || 'ET',
          serial: String(data.serial || '').trim(),
          isEV: Boolean(data.isEV),
          isPD: Boolean(data.isPD),
        };
      }
    } catch {
      // Continue to pattern parsing
    }
  }

  // 2. Pattern: "Code 2 - AA B12345" or "Code 2 - 12345"
  const codePrefixMatch = trimmed.match(/^Code\s*(\d+|UN|AU|POLICE|TEMP)\s*[-:•]?\s*([A-Za-z]{2,4})?\s*(.+)$/i);
  if (codePrefixMatch) {
    return {
      category: codePrefixMatch[1].toLowerCase(),
      system: 'new',
      amharic: 'ኢትዮጵያ',
      english: codePrefixMatch[2]?.toUpperCase() || 'ET',
      serial: codePrefixMatch[3].trim(),
    };
  }

  // 3. Pattern: "AA 2-12345" or "AA-2-12345" or "ET 2 12345"
  const regMatch = trimmed.match(/^([A-Za-z]{2,4})\s*[-:•]?\s*([1-5]|UN|AU|POLICE|TEMP)\s*[-:•\s]\s*(.+)$/i);
  if (regMatch) {
    return {
      category: regMatch[2].toLowerCase(),
      system: 'new',
      amharic: 'ኢትዮጵያ',
      english: regMatch[1].toUpperCase(),
      serial: regMatch[3].trim(),
    };
  }

  // 4. Pattern: "2-E89012" or "3-F90123" or "2 - 12345" or "UN-12345"
  const simpleMatch = trimmed.match(/^([1-5]|UN|AU|POLICE|TEMP)\s*[-:•]\s*(.+)$/i);
  if (simpleMatch) {
    return {
      category: simpleMatch[1].toLowerCase(),
      system: 'old',
      amharic: 'ኢትዮጵያ',
      english: 'ET',
      serial: simpleMatch[2].trim(),
    };
  }

  // Fallback: If it's a generic alphanumeric string, treat as serial with Code 2
  return null;
}

export function formatPlateNumber(plateStr?: string): string {
  if (!plateStr) return 'N/A';
  const data = parsePlateNumber(plateStr);
  if (data) {
    let catText = `Code ${data.category}`;
    if (['un', 'au', 'temp', 'police'].includes(data.category)) {
      catText = data.category.toUpperCase();
    }
    const region = data.english || data.amharic || 'ET';
    return `${catText} • ${region} ${data.serial}`;
  }
  return plateStr;
}

