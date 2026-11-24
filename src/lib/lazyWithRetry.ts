import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

export interface PreloadableComponent<T extends ComponentType<any>>
  extends LazyExoticComponent<T> {
  preload: () => Promise<{ default: T }>;
}

/**
 * Lazy loads a React component with automatic retries on slow or flaky network connections.
 * If dynamic chunk fetching fails, it retries up to 3 times with exponential backoff.
 * Also detects version skews / stale chunks and safely triggers a single page refresh.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  componentName?: string
): PreloadableComponent<T> {
  let loadedPromise: Promise<{ default: T }> | null = null;

  const loadWithRetry = (): Promise<{ default: T }> => {
    if (!loadedPromise) {
      loadedPromise = new Promise<{ default: T }>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 3;

        const execute = () => {
          factory()
            .then(resolve)
            .catch((error: any) => {
              attempts++;
              const isChunkError =
                error?.name === 'ChunkLoadError' ||
                /loading chunk/i.test(error?.message || '') ||
                /failed to fetch dynamically imported module/i.test(error?.message || '') ||
                /dynamically imported module/i.test(error?.message || '');

              if (attempts < maxAttempts) {
                if (componentName) {
                  console.warn(`[lazyWithRetry] Retrying chunk load for ${componentName} (attempt ${attempts + 1}/${maxAttempts})`);
                }
                // Exponential backoff: 800ms, 1600ms
                setTimeout(execute, attempts * 800);
              } else {
                // If it's a version skew / stale chunk error, force reload once to get new index & chunks
                if (isChunkError && typeof window !== 'undefined') {
                  const storageKey = `chunk_reload_${window.location.pathname}`;
                  if (!sessionStorage.getItem(storageKey)) {
                    sessionStorage.setItem(storageKey, '1');
                    window.location.reload();
                    return;
                  }
                  sessionStorage.removeItem(storageKey);
                }

                // Reset cached promise so subsequent attempts can re-trigger loading
                loadedPromise = null;
                reject(error);
              }
            });
        };

        execute();
      });
    }
    return loadedPromise;
  };

  const LazyComp = lazy(loadWithRetry);
  (LazyComp as any).preload = loadWithRetry;

  return LazyComp as PreloadableComponent<T>;
}
