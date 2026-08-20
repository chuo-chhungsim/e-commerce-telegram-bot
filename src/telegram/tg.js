/**
 * Thin, defensive wrapper around window.Telegram.WebApp.
 *
 * Every helper here is safe to call in a normal desktop browser, so the app can
 * still be developed with `npm run dev` and opened at http://localhost:5173
 * without Telegram. Anything Telegram-only degrades to a sensible web fallback.
 *
 * API reference: https://core.telegram.org/bots/webapps
 */

export const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

/**
 * Telegram sets `platform` to 'unknown' when the script is loaded on a normal
 * web page, which is how we tell "running inside Telegram" from "running in a
 * browser tab".
 */
export const isTelegram = Boolean(tg && tg.platform && tg.platform !== 'unknown');

/** Guard for features added in later Bot API versions (older clients ignore them). */
export const supports = (version) => Boolean(tg?.isVersionAtLeast?.(version));

/** Stand-in profile so the UI has something to render outside Telegram. */
export const DEMO_USER = {
  id: 1000000,
  first_name: 'Demo',
  last_name: 'Student',
  username: 'demo_student',
  language_code: 'en',
  photo_url: '',
};

/** The Telegram account that opened the Mini App (never trust this on a server). */
export const getUser = () => tg?.initDataUnsafe?.user ?? (isTelegram ? null : DEMO_USER);

/**
 * The raw, signed init data string. This is what a backend must verify with the
 * bot token before it believes anything about the user - see bot/initData.js.
 */
export const getInitData = () => tg?.initData ?? '';

/* ------------------------------------------------------------------ haptics */

export const haptic = {
  impact(style = 'light') {
    if (supports('6.1')) tg.HapticFeedback.impactOccurred(style);
  },
  notify(type = 'success') {
    if (supports('6.1')) tg.HapticFeedback.notificationOccurred(type);
  },
  select() {
    if (supports('6.1')) tg.HapticFeedback.selectionChanged();
  },
};

/* ------------------------------------------------------------- native popups */

export const showAlert = (message) =>
  new Promise((resolve) => {
    if (supports('6.2')) tg.showAlert(message, resolve);
    else {
      window.alert(message);
      resolve();
    }
  });

export const showConfirm = (message) =>
  new Promise((resolve) => {
    if (supports('6.2')) tg.showConfirm(message, resolve);
    else resolve(window.confirm(message));
  });

export const showPopup = (params) =>
  new Promise((resolve) => {
    if (supports('6.2')) tg.showPopup(params, resolve);
    else {
      window.alert(`${params.title ?? ''}\n\n${params.message ?? ''}`.trim());
      resolve('ok');
    }
  });

/* -------------------------------------------------------------------- misc */

export const closeApp = () => tg?.close?.();

/** Open a link outside the Mini App (t.me links use Telegram's own handler). */
export const openLink = (url) => {
  if (!tg) {
    window.open(url, '_blank', 'noopener');
    return;
  }
  if (url.startsWith('https://t.me/')) tg.openTelegramLink(url);
  else tg.openLink(url);
};

/**
 * Ask Telegram to keep the app open when the user swipes down, and warn before
 * closing while a cart is in progress. Both are no-ops on older clients.
 */
export const guardClosing = (enabled) => {
  if (!supports('6.2')) return;
  if (enabled) tg.enableClosingConfirmation();
  else tg.disableClosingConfirmation();
};
