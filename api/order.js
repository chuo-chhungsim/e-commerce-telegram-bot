/**
 * POST /api/order — the endpoint the Mini App calls at checkout.
 *
 * Verifies the signed `initData` with the bot token, then sends the buyer their
 * order confirmation in the Telegram chat. Runs as a Vercel serverless function,
 * so it starts on request and stops afterwards - there is no long-running server.
 */
import { verifyInitData } from './_lib/initData.js';
import { formatReceipt } from './_lib/receipt.js';
import { BOT_TOKEN, SHOP_NAME, sendMessage } from './_lib/telegram.js';

/** Per-instance throttle. Serverless instances are recycled, so this is a speed
 *  bump against accidental double taps, not a real rate limiter. */
const lastOrderAt = new Map();

export default async function handler(req, res) {
  // Same-origin by default; ALLOWED_ORIGIN opens it up if the front-end is hosted
  // somewhere else.
  if (process.env.ALLOWED_ORIGIN) {
    res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'method not allowed' });

  if (!BOT_TOKEN) {
    console.error('BOT_TOKEN is not set in the environment');
    return res.status(500).json({ ok: false, error: 'server not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { initData, order } = body ?? {};

    // Never trust a user id sent by the client - derive it from initData.
    const check = verifyInitData(initData, BOT_TOKEN);
    if (!check.ok) return res.status(401).json({ ok: false, error: check.reason });

    if (!order?.items?.length) return res.status(400).json({ ok: false, error: 'empty order' });

    const previous = lastOrderAt.get(check.user.id) ?? 0;
    if (Date.now() - previous < 3000) {
      return res.status(429).json({ ok: false, error: 'slow down' });
    }
    lastOrderAt.set(check.user.id, Date.now());

    console.log(
      `Order ${order.id} from @${check.user.username ?? check.user.id}: ${order.currency}${order.total}`,
    );

    const sent = await sendMessage(check.user.id, formatReceipt(order, check.user, SHOP_NAME));
    // The buyer has to have started the bot before it may message them.
    if (!sent.ok) {
      return res.status(502).json({ ok: false, error: 'could not send the confirmation message' });
    }

    return res.status(200).json({ ok: true, orderId: order.id });
  } catch (error) {
    console.error('order failed:', error.message);
    return res.status(400).json({ ok: false, error: 'bad request' });
  }
}
