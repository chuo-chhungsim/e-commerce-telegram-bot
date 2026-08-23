/**
 * Sending the order out of the Mini App.
 *
 * There are three ways a Mini App can hand data back to a bot, and which one is
 * available depends on how the app was opened:
 *
 *  1. A backend endpoint (bot/index.js here). The request carries `initData`,
 *     which the server verifies with the bot token before trusting the user id.
 *     Works no matter how the app was opened - this is the general case.
 *  2. `WebApp.sendData()` - only when the app was opened from a *reply keyboard*
 *     button. Telegram delivers the payload to the bot as a service message and
 *     closes the app. No server request, but max 4096 bytes.
 *  3. Neither: pure front-end demo mode, the order is only stored locally.
 */
import { tg, isTelegram, getInitData } from '../telegram/tg';

/**
 * Empty by default, which means "same origin": on Vercel the Mini App and the
 * functions share a domain, so `/api/order` is the right URL and there is no
 * CORS to configure. Local development points VITE_API_URL at the bot/ server.
 */
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export const hasBackend = true;

/** Base for every API call: empty string means "same origin". */
export const apiBase = API_URL;

/**
 * The URL encoded in the checkout QR. Opening it (by scanning with a phone
 * camera) records the payment; the checkout screen polls checkPayment() and
 * reacts. Falls back to the page's own origin when VITE_API_URL is unset.
 */
export function paymentUrl(payId) {
  const base = API_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/api/pay?i=${payId}`;
}

/** Has anyone scanned the QR for this payment yet? */
export async function checkPayment(payId) {
  const response = await fetch(`${API_URL}/api/pay-status?i=${payId}`, { cache: 'no-store' });
  if (!response.ok) return false;
  const data = await response.json().catch(() => ({}));
  return Boolean(data.paid);
}

/** Unguessable id so only whoever holds the QR can settle the payment. */
export function newPayId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function submitOrder(order) {
  // Only Telegram can produce the signed initData the server insists on, so a
  // visitor on the plain website goes straight to local demo mode instead of
  // getting a 401 from the API.
  if (isTelegram && getInitData()) {
    const response = await fetch(`${API_URL}/api/order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData(), order }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(detail || `Order failed (${response.status})`);
    }
    return { mode: 'backend', ...(await response.json().catch(() => ({}))) };
  }

  // Available only for apps opened from a reply-keyboard button.
  if (isTelegram && tg?.sendData) {
    try {
      tg.sendData(JSON.stringify(order));
      return { mode: 'sendData' };
    } catch {
      /* not opened from a keyboard button - fall through to demo mode */
    }
  }

  return { mode: 'demo' };
}
