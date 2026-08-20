/**
 * Key/value persistence for the Mini App.
 *
 * Inside Telegram this uses CloudStorage (Bot API 6.9+), so a cart saved on a
 * phone shows up on Telegram Desktop for the same account. Everywhere else it
 * falls back to localStorage. Both paths are promise-based and store JSON.
 */
import { tg, supports } from './tg';

const PREFIX = 'forever_';
/** CloudStorage rejects values longer than this, so oversized data stays local. */
const CLOUD_VALUE_LIMIT = 4096;

const cloudAvailable = () => supports('6.9') && Boolean(tg?.CloudStorage);

const readLocal = (fullKey, fallback) => {
  try {
    const raw = window.localStorage.getItem(fullKey);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeLocal = (fullKey, raw) => {
  try {
    window.localStorage.setItem(fullKey, raw);
    return true;
  } catch {
    return false; // quota or private mode - the value just will not survive a reload
  }
};

export function storageGet(key, fallback = null) {
  const fullKey = PREFIX + key;

  if (!cloudAvailable()) return Promise.resolve(readLocal(fullKey, fallback));

  return new Promise((resolve) => {
    tg.CloudStorage.getItem(fullKey, (err, value) => {
      // Nothing in the cloud: the value may have been too large to store there.
      if (err || !value) return resolve(readLocal(fullKey, fallback));
      try {
        resolve(JSON.parse(value));
      } catch {
        resolve(fallback);
      }
    });
  });
}

export function storageSet(key, value) {
  const fullKey = PREFIX + key;
  const raw = JSON.stringify(value);

  if (!cloudAvailable() || raw.length > CLOUD_VALUE_LIMIT) {
    return Promise.resolve(writeLocal(fullKey, raw));
  }

  return new Promise((resolve) => {
    tg.CloudStorage.setItem(fullKey, raw, (err, ok) => {
      if (err || !ok) return resolve(writeLocal(fullKey, raw));
      return resolve(true);
    });
  });
}

export function storageRemove(key) {
  const fullKey = PREFIX + key;
  window.localStorage.removeItem(fullKey);
  if (!cloudAvailable()) return Promise.resolve(true);
  return new Promise((resolve) => {
    tg.CloudStorage.removeItem(fullKey, (err, ok) => resolve(!err && ok));
  });
}

/** Which backend is active - shown on the Profile screen for the demo. */
export const storageBackend = () => (cloudAvailable() ? 'Telegram CloudStorage' : 'localStorage');
