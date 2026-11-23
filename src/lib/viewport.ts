/**
 * Viewport & Virtual Keyboard Handler for Mobile and Tablet Devices.
 * 
 * Tracks the visual viewport on mobile devices (iOS Safari, Android Chrome, WebViews)
 * and dynamically calculates the virtual keyboard height and visible viewport space.
 * 
 * Sets CSS custom properties on document.documentElement:
 * - --keyboard-offset: 0px when closed, ~280-420px when virtual keyboard is open on iOS
 * - --visual-viewport-h: The exact visible height in px above the virtual keyboard
 */

export function initViewportHandler() {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  const updateViewportVars = () => {
    const vv = window.visualViewport;
    const windowH = window.innerHeight;
    const visualH = vv ? vv.height : windowH;
    const offsetTop = vv ? vv.offsetTop : 0;

    // Detect virtual keyboard opening:
    // On iOS Safari, window.innerHeight stays constant while vv.height drops by keyboard height.
    // On Android (with interactive-widget=resizes-content), both resize together, so rawOffset <= 0.
    const rawOffset = windowH - (visualH + offsetTop);
    const keyboardOffset = rawOffset > 60 ? Math.round(rawOffset) : 0;

    root.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);
    root.style.setProperty('--visual-viewport-h', `${Math.round(visualH)}px`);
  };

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateViewportVars, { passive: true });
    window.visualViewport.addEventListener('scroll', updateViewportVars, { passive: true });
  }

  window.addEventListener('resize', updateViewportVars, { passive: true });
  window.addEventListener('orientationchange', () => {
    setTimeout(updateViewportVars, 100);
    setTimeout(updateViewportVars, 300);
  }, { passive: true });

  // Initial calculation
  updateViewportVars();
}
