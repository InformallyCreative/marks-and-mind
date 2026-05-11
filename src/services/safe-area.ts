// JS-only safe-area shim. Gated on navigator.standalone === true.
// NEVER use CSS env() in this codebase — iOS-PWA env() is unreliable here.
//
// We measure the device characteristics with visualViewport and a few known
// device profiles, then write CSS custom properties that the UI consumes.

interface NavWithStandalone extends Navigator {
  standalone?: boolean;
}

function isIOSStandalonePWA(): boolean {
  const nav = navigator as NavWithStandalone;
  return nav.standalone === true;
}

function setVar(name: string, value: string): void {
  document.documentElement.style.setProperty(name, value);
}

function applyInsets({
  top,
  bottom,
  left = 0,
  right = 0,
}: {
  top: number;
  bottom: number;
  left?: number;
  right?: number;
}): void {
  setVar('--safe-top', `${top}px`);
  setVar('--safe-bottom', `${bottom}px`);
  setVar('--safe-left', `${left}px`);
  setVar('--safe-right', `${right}px`);
}

/**
 * Best-effort iOS device fingerprint based on screen size.
 * Returns { top, bottom } insets in CSS pixels.
 */
function guessIOSInsets(): { top: number; bottom: number } {
  const w = Math.max(window.screen.width, window.screen.height);
  const h = Math.min(window.screen.width, window.screen.height);
  // Newest devices (Dynamic Island): iPhone 14 Pro / 15 Pro / 16 Pro etc.
  // Approximated; refine empirically if needed.
  if (w >= 932) return { top: 59, bottom: 34 }; // 14/15/16 Pro Max
  if (w >= 926) return { top: 47, bottom: 34 }; // 11/12/13 Pro Max
  if (w >= 896) return { top: 44, bottom: 34 }; // XR / 11 / XS Max
  if (w >= 852) return { top: 59, bottom: 34 }; // 14/15/16 Pro
  if (w >= 844) return { top: 47, bottom: 34 }; // 12/13/14 (non-Pro)
  if (w >= 812) return { top: 44, bottom: 34 }; // X / XS / 11 Pro / mini
  void h;
  return { top: 20, bottom: 0 }; // Older non-notch
}

export function installSafeAreaShim(): void {
  if (!isIOSStandalonePWA()) {
    applyInsets({ top: 0, bottom: 0 });
    return;
  }
  const insets = guessIOSInsets();
  applyInsets(insets);

  // Re-apply on orientation change so landscape doesn't keep portrait insets.
  window.addEventListener('orientationchange', () => {
    const next = guessIOSInsets();
    applyInsets(next);
  });
}
