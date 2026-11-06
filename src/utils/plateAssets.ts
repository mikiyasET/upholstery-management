import opentype from 'opentype.js';

const CACHE_NAME = 'plate-assets-v1';

let cachedCargoFont: opentype.Font | null = null;
let fontLoadingPromise: Promise<opentype.Font | null> | null = null;

let cachedHoloFoil: HTMLImageElement | null = null;
let holoFoilLoadingPromise: Promise<HTMLImageElement | null> | null = null;

let cachedEfpLogo: HTMLImageElement | null = null;
let efpLoadingPromise: Promise<HTMLImageElement | null> | null = null;

/**
 * Fetch a resource with CacheStorage fallback to ensure persistent disk caching across reloads.
 */
async function fetchWithCache(urls: string[]): Promise<ArrayBuffer> {
  const isCacheSupported = typeof window !== 'undefined' && 'caches' in window;

  for (const url of urls) {
    if (isCacheSupported) {
      try {
        const cache = await window.caches.open(CACHE_NAME);
        const match = await cache.match(url);
        if (match) {
          return await match.arrayBuffer();
        }
      } catch (err) {
        console.warn(`[plateAssets] CacheStorage read error for ${url}:`, err);
      }
    }

    try {
      const res = await fetch(url, { cache: 'force-cache' });
      if (res.ok) {
        if (isCacheSupported) {
          try {
            const cache = await window.caches.open(CACHE_NAME);
            await cache.put(url, res.clone());
          } catch (err) {
            console.warn(`[plateAssets] CacheStorage put error for ${url}:`, err);
          }
        }
        return await res.arrayBuffer();
      }
    } catch {
      // Try next candidate URL
    }
  }

  throw new Error(`Failed to fetch asset from any candidate: ${urls.join(', ')}`);
}

/**
 * Load an image with CacheStorage caching and background decoding.
 */
async function loadImageWithCache(urls: string[]): Promise<HTMLImageElement | null> {
  let blobUrl: string | null = null;
  const isCacheSupported = typeof window !== 'undefined' && 'caches' in window;

  for (const url of urls) {
    if (isCacheSupported) {
      try {
        const cache = await window.caches.open(CACHE_NAME);
        let match = await cache.match(url);
        if (!match) {
          const res = await fetch(url, { cache: 'force-cache' });
          if (res.ok) {
            await cache.put(url, res.clone());
            match = res;
          }
        }
        if (match) {
          const blob = await match.blob();
          blobUrl = URL.createObjectURL(blob);
          break;
        }
      } catch (err) {
        console.warn(`[plateAssets] CacheStorage error for ${url}:`, err);
      }
    }
  }

  return new Promise((resolve) => {
    const img = new Image();
    const primaryUrl = blobUrl || urls[0];

    img.onload = async () => {
      try {
        if ('decode' in img) {
          await img.decode();
        }
      } catch {
        // Image is loaded even if decode() throws on older engines
      }
      resolve(img);
    };

    img.onerror = () => {
      // If blobUrl failed, try direct URL fallback
      if (blobUrl) {
        const fallback = new Image();
        fallback.onload = async () => {
          try {
            if ('decode' in fallback) {
              await fallback.decode();
            }
          } catch {
            // ignore
          }
          resolve(fallback);
        };
        fallback.onerror = () => resolve(null);
        fallback.src = urls[0];
      } else {
        resolve(null);
      }
    };

    img.src = primaryUrl;
  });
}

/**
 * Loads and parses CARGO2.ttf with opentype.js and registers it with the FontFace API.
 */
export async function loadCargoFont(): Promise<opentype.Font | null> {
  if (cachedCargoFont) return cachedCargoFont;
  if (fontLoadingPromise) return fontLoadingPromise;

  fontLoadingPromise = (async () => {
    try {
      const buffer = await fetchWithCache(['/CARGO2.ttf', '/cargo2.ttf']);
      
      // Register with the browser's native FontFace registry so CSS & canvas have it immediately
      if (typeof FontFace !== 'undefined' && typeof document !== 'undefined' && document.fonts) {
        try {
          const fontFace = new FontFace('CARGO', buffer);
          await fontFace.load();
          document.fonts.add(fontFace);
        } catch (fontFaceErr) {
          console.warn('[plateAssets] Could not register FontFace:', fontFaceErr);
        }
      }

      cachedCargoFont = opentype.parse(buffer);
      return cachedCargoFont;
    } catch (err) {
      console.error('[plateAssets] Failed to load CARGO2.ttf:', err);
      fontLoadingPromise = null;
      return null;
    }
  })();

  return fontLoadingPromise;
}

/**
 * Loads, caches, and decodes the holographic foil texture image.
 */
export async function loadHolographicFoil(): Promise<HTMLImageElement | null> {
  if (cachedHoloFoil) return cachedHoloFoil;
  if (holoFoilLoadingPromise) return holoFoilLoadingPromise;

  holoFoilLoadingPromise = (async () => {
    try {
      const img = await loadImageWithCache(['/holographic-foil.jpg', '/Holographic-foil.jpg']);
      cachedHoloFoil = img;
      return img;
    } catch (err) {
      console.error('[plateAssets] Failed to load holographic-foil.jpg:', err);
      holoFoilLoadingPromise = null;
      return null;
    }
  })();

  return holoFoilLoadingPromise;
}

/**
 * Loads, caches, and decodes the EFP police badge logo image.
 */
export async function loadEfpLogo(): Promise<HTMLImageElement | null> {
  if (cachedEfpLogo) return cachedEfpLogo;
  if (efpLoadingPromise) return efpLoadingPromise;

  efpLoadingPromise = (async () => {
    try {
      const img = await loadImageWithCache(['/efp.png']);
      cachedEfpLogo = img;
      return img;
    } catch (err) {
      console.error('[plateAssets] Failed to load efp.png:', err);
      efpLoadingPromise = null;
      return null;
    }
  })();

  return efpLoadingPromise;
}

/**
 * Preloads and warms up all plate assets (font, foil image, and police logo).
 * Called when the admin panel loads so assets are immediately available in memory.
 */
export function preloadPlateAssets(): Promise<[opentype.Font | null, HTMLImageElement | null, HTMLImageElement | null]> {
  return Promise.all([
    loadCargoFont(),
    loadHolographicFoil(),
    loadEfpLogo()
  ]);
}

export function getCachedCargoFont(): opentype.Font | null {
  return cachedCargoFont;
}

export function getCachedHoloFoil(): HTMLImageElement | null {
  return cachedHoloFoil;
}

export function getCachedEfpLogo(): HTMLImageElement | null {
  return cachedEfpLogo;
}

