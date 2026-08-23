/**
 * The shop keeps its own light design on the web and inside Telegram, so this
 * module does not mirror Telegram's colour scheme into the page. It only paints
 * the native chrome white to match the site, and exposes the real viewport size
 * and safe-area insets as CSS variables.
 */
import { tg, isTelegram, supports } from './tg';

const SITE_BG = '#ffffff';

/** Only used for display (the Profile screen) - the UI itself is light-only. */
export const getColorScheme = () => {
  if (isTelegram && tg?.colorScheme) return tg.colorScheme;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

/** Match Telegram's header and background to the white site background. */
export function applyTheme() {
  if (!isTelegram || !supports('6.1')) return getColorScheme();

  if (supports('6.9')) {
    // Bot API 6.9+ accepts an explicit colour.
    tg.setHeaderColor(SITE_BG);
    tg.setBackgroundColor(SITE_BG);
  } else {
    tg.setHeaderColor('bg_color');
    tg.setBackgroundColor('bg_color');
  }

  return getColorScheme();
}

/**
 * Expose the usable height as --tg-viewport-height and the notch / home-indicator
 * insets as --tg-safe-*. Telegram shrinks the viewport when the keyboard opens,
 * and `100vh` lies inside an in-app browser.
 */
export function applyViewport() {
  const root = document.documentElement;
  const height = tg?.viewportHeight || window.innerHeight;
  const stable = tg?.viewportStableHeight || window.innerHeight;
  root.style.setProperty('--tg-viewport-height', `${height}px`);
  root.style.setProperty('--tg-viewport-stable-height', `${stable}px`);

  // Safe-area insets (Bot API 8.0+); zero everywhere else.
  const safe = tg?.safeAreaInset ?? {};
  const content = tg?.contentSafeAreaInset ?? {};
  root.style.setProperty('--tg-safe-top', `${(safe.top ?? 0) + (content.top ?? 0)}px`);
  root.style.setProperty('--tg-safe-bottom', `${(safe.bottom ?? 0) + (content.bottom ?? 0)}px`);
}
