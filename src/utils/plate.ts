export interface PlateData {
  category: string;
  system: 'old' | 'new';
  amharic: string;
  english: string;
  serial: string;
  isEV?: boolean;
  isPD?: boolean;
}

export function formatPlateNumber(plateStr?: string): string {
  if (!plateStr) return 'N/A';
  try {
    const data: PlateData = JSON.parse(plateStr);
    
    // Extract category name if possible (e.g. Code 2, UN, etc)
    let catText = `Code ${data.category}`;
    if (['un', 'au', 'temp', 'police'].includes(data.category)) {
      catText = data.category.toUpperCase();
    }
    
    // e.g. "Code 2 - AA AAA0000"
    if (data.system === 'new') {
      return `${catText} - ${data.english || data.amharic} ${data.serial}`;
    } else {
      return `${catText} - ${data.english || data.amharic} ${data.serial}`;
    }
  } catch (e) {
    // Legacy plate number string
    return plateStr;
  }
}

export function parsePlateNumber(plateStr?: string): PlateData | null {
  if (!plateStr) return null;
  try {
    return JSON.parse(plateStr) as PlateData;
  } catch (e) {
    return null;
  }
}
