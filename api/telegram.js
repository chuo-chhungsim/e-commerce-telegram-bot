/**
 * POST /api/telegram — the bot's webhook.
 *
 * On Vercel there is no process to run a getUpdates loop in, so Telegram pushes
 * each update here instead. Register the webhook once with:
 *
 *     npm run webhook -- set https://<your-project>.vercel.app
 *
 * A bot can use either a webhook or long polling, never both: `npm run webhook --
 * delete` hands control back to the local bot/ server.
 */
import { formatReceipt, escapeHtml } from './_lib/receipt.js';
import { BOT_TOKEN, SHOP_NAME, sendMessage, webAppUrl } from './_lib/telegram.js';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

const openShopKeyboard = (url) => ({
  inline_keyboard: [[{ text: '🛍️ Open Shop', web_app: { url } }]],
});

// A reply-keyboard web_app button is the one way to open the Mini App so that
// WebApp.sendData() can deliver the order with no HTTP request at all.
const replyKeyboard = (url) => ({
  keyboard: [[{ text: '🛒 Open shop (sendData demo)', web_app: { url } }]],
  resize_keyboard: true,
});

async function handleUpdate(update) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;
  const url = webAppUrl();

  // Orders that arrive through WebApp.sendData() land here.
  if (message.web_app_data?.data) {
    try {
      const order = JSON.parse(message.web_app_data.data);
      await sendMessage(chatId, formatReceipt(order, message.from, SHOP_NAME));
    } catch {
      await sendMessage(chatId, 'Could not read that order 🤔');
    }
    return;
  }

  const text = message.text ?? '';

  if (text.startsWith('/start')) {
    await sendMessage(
      chatId,
      `👋 Welcome to <b>${escapeHtml(SHOP_NAME)}</b>!\n\nBrowse the catalogue, add items to your cart and check out — all without leaving Telegram.`,
      url ? { reply_markup: openShopKeyboard(url) } : {},
    );
    return;
  }

  if (text.startsWith('/keyboard')) {
    await sendMessage(chatId, 'Keyboard button pinned below.', {
      reply_markup: replyKeyboard(url),
    });
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(
      chatId,
      '/start — open the shop\n/keyboard — pin the sendData demo button\n\nThis is a school demo of a Telegram Mini App.',
    );
    return;
  }

  await sendMessage(chatId, 'Send /start to open the shop 🛍️');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    // Handy for eyeballing the deployment in a browser.
    return res.status(200).json({ ok: true, webhook: 'ready', webAppUrl: webAppUrl() });
  }

  // Anyone can POST to a public URL, so check the secret Telegram echoes back.
  if (WEBHOOK_SECRET && req.headers['x-telegram-bot-api-secret-token'] !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false });
  }
  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set in the environment');
    return res.status(500).json({ ok: false });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    await handleUpdate(update ?? {});
  } catch (error) {
    // Always answer 200: a non-2xx makes Telegram retry the same update forever.
    console.error('update failed:', error.message);
  }

  return res.status(200).json({ ok: true });
}
