/**
 * Forever shop - demo bot + order API.
 *
 * Two jobs in one small process, with no npm dependencies (Node 20+ built-ins):
 *
 *   1. Bot: answers /start with a button that opens the Mini App, and receives
 *      orders sent through Telegram's `web_app_data` channel.
 *   2. API: POST /api/order from the Mini App. The request carries the signed
 *      `initData`, which is verified here with the bot token before the order is
 *      accepted and a receipt is sent to the buyer's chat.
 *
 * This is the *local development* bot: it long-polls, so it needs a machine that
 * stays on. The deployed version of the same logic lives in api/telegram.js and
 * api/order.js as Vercel functions, and both share api/_lib/. A bot can only use
 * one of the two at a time - see `npm run webhook -- set|delete`.
 *
 * Run it with:  npm start   (inside the bot/ folder)
 */
import http from 'node:http';
import { verifyInitData } from '../api/_lib/initData.js';
import { formatReceipt, escapeHtml } from '../api/_lib/receipt.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL; // https URL where the built app is hosted
const PORT = Number(process.env.PORT || 8787);
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '*';
const SHOP_NAME = process.env.SHOP_NAME || 'Forever';

if (!BOT_TOKEN) {
  console.error('BOT_TOKEN is missing. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
if (!WEBAPP_URL?.startsWith('https://')) {
  console.warn('WEBAPP_URL should be an https:// URL - Telegram refuses to open anything else.');
}

/* ------------------------------------------------------------ Telegram API */

async function callTelegram(method, payload) {
  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!data.ok) console.error(`${method} failed:`, data.description);
  return data;
}

const sendMessage = (chatId, text, extra = {}) =>
  callTelegram('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });

/* --------------------------------------------------------------- storage */

const orders = []; // in-memory "database" - plenty for a demo

/** Very small guard against one chat flooding the demo server. */
const lastOrderAt = new Map();
const tooSoon = (userId) => {
  const previous = lastOrderAt.get(userId) ?? 0;
  if (Date.now() - previous < 3000) return true;
  lastOrderAt.set(userId, Date.now());
  return false;
};

/* ------------------------------------------------------------- HTTP server */

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
  withCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req, limitBytes = 100_000) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > limitBytes) {
        reject(new Error('payload too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    withCors(res);
    res.writeHead(204);
    return res.end();
  }

  if (req.method === 'GET' && req.url === '/health') {
    return json(res, 200, { ok: true, orders: orders.length });
  }

  if (req.method === 'POST' && req.url === '/api/order') {
    try {
      const { initData, order } = JSON.parse(await readBody(req));

      // Never trust the user id sent by the client - derive it from initData.
      const check = verifyInitData(initData, BOT_TOKEN);
      if (!check.ok) return json(res, 401, { ok: false, error: check.reason });

      if (!order?.items?.length) return json(res, 400, { ok: false, error: 'empty order' });
      if (tooSoon(check.user.id)) return json(res, 429, { ok: false, error: 'slow down' });

      const record = { ...order, user: check.user, receivedAt: new Date().toISOString() };
      orders.push(record);
      console.log(`Order ${order.id} from @${check.user.username ?? check.user.id}: ${order.currency}${order.total}`);

      await sendMessage(check.user.id, formatReceipt(order, check.user, SHOP_NAME));
      return json(res, 200, { ok: true, orderId: order.id });
    } catch (error) {
      console.error('order failed:', error.message);
      return json(res, 400, { ok: false, error: 'bad request' });
    }
  }

  json(res, 404, { ok: false, error: 'not found' });
});

server.listen(PORT, () => console.log(`Order API listening on http://localhost:${PORT}`));

/* ---------------------------------------------------------- bot long polling */

const startKeyboard = {
  inline_keyboard: [[{ text: '🛍️ Open Shop', web_app: { url: WEBAPP_URL } }]],
};

// A reply-keyboard web_app button is the one case where the Mini App can send
// its payload straight to the bot with WebApp.sendData() and no HTTP call.
const replyKeyboard = {
  keyboard: [[{ text: '🛒 Open shop (sendData demo)', web_app: { url: WEBAPP_URL } }]],
  resize_keyboard: true,
};

async function handleUpdate(update) {
  const message = update.message;
  if (!message) return;

  const chatId = message.chat.id;

  // Orders that arrive through WebApp.sendData() land here.
  if (message.web_app_data?.data) {
    try {
      const order = JSON.parse(message.web_app_data.data);
      orders.push({ ...order, user: message.from, receivedAt: new Date().toISOString() });
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
      { reply_markup: startKeyboard },
    );
    return;
  }

  // Optional: pins a reply-keyboard button, the one way to open the app so that
  // WebApp.sendData() can deliver the order without any HTTP request.
  if (text.startsWith('/keyboard')) {
    await sendMessage(chatId, 'Keyboard button pinned below.', { reply_markup: replyKeyboard });
    return;
  }

  if (text.startsWith('/help')) {
    await sendMessage(
      chatId,
      '/start — open the shop\n/orders — how many orders this server has received\n/keyboard — pin the sendData demo button\n\nThis is a school demo of a Telegram Mini App.',
    );
    return;
  }

  if (text.startsWith('/orders')) {
    const mine = orders.filter((order) => order.user?.id === message.from.id);
    await sendMessage(chatId, `You have placed ${mine.length} order(s) in this session.`);
    return;
  }

  await sendMessage(chatId, 'Send /start to open the shop 🛍️');
}

async function poll() {
  let offset = 0;
  // Make the blue "Open shop" menu button next to the chat input open the app.
  if (WEBAPP_URL) {
    await callTelegram('setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Shop', web_app: { url: WEBAPP_URL } },
    });
  }
  console.log('Bot polling for updates… (Ctrl+C to stop)');

  for (;;) {
    try {
      const response = await fetch(
        `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?timeout=30&offset=${offset}`,
      );
      const data = await response.json();
      if (!data.ok) {
        console.error('getUpdates failed:', data.description);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        continue;
      }
      for (const update of data.result) {
        offset = update.update_id + 1;
        handleUpdate(update).catch((error) => console.error('update failed:', error.message));
      }
    } catch (error) {
      console.error('polling error:', error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

poll();
