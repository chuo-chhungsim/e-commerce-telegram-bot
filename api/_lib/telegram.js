/**
 * Shared Telegram helpers for the serverless functions.
 *
 * The bot token only ever exists as a server-side environment variable: it is
 * read here, on Vercel's side, and never reaches the browser bundle.
 */

export const BOT_TOKEN = process.env.BOT_TOKEN;

/**
 * Public URL of the Mini App. Set WEBAPP_URL explicitly for a stable link;
 * otherwise fall back to the URLs Vercel injects, so preview deployments work
 * without any configuration.
 */
export function webAppUrl() {
  if (process.env.WEBAPP_URL) return process.env.WEBAPP_URL;
  const host = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : '';
}

export const SHOP_NAME = process.env.SHOP_NAME || 'Forever';

export async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) console.error(`${method} failed:`, data.description);
  return data;
}

export const sendMessage = (chatId, text, extra = {}) =>
  callTelegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
