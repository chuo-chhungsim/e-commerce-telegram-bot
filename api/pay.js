/**
 * GET /api/pay?i=<payId> — the URL encoded in the checkout QR code.
 *
 * Scanning the QR with a phone camera opens this in the browser, which records
 * the payment and shows a confirmation page. The checkout screen is polling
 * /api/pay-status for the same id, so it flips to "payment received" on its own.
 *
 * This is a *demo* payment: no bank is involved and no money moves. Confirming a
 * real KHQR transfer requires a Bakong merchant account, whose callback would
 * replace this endpoint.
 */
import { isValidPayId, markPaid } from './_lib/paymentStore.js';

const page = (title, message, tone) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<style>
  :root { color-scheme: light }
  body { margin:0; min-height:100vh; display:grid; place-items:center;
         font-family: system-ui, -apple-system, sans-serif; background:#f4f4f5; color:#111 }
  .card { background:#fff; border-radius:20px; padding:40px 28px; width:min(360px, 88vw);
          text-align:center; box-shadow:0 8px 30px rgb(0 0 0 / .08) }
  .mark { width:72px; height:72px; border-radius:50%; margin:0 auto 20px; display:grid; place-items:center;
          background:${tone === 'ok' ? '#dcfce7' : '#fee2e2'}; color:${tone === 'ok' ? '#16a34a' : '#dc2626'};
          font-size:38px; line-height:1 }
  h1 { font-size:20px; margin:0 0 8px }
  p { margin:0; color:#6b7280; font-size:14px; line-height:1.5 }
  .demo { margin-top:24px; font-size:11px; letter-spacing:.08em; text-transform:uppercase; color:#9ca3af }
</style></head>
<body><div class="card">
  <div class="mark">${tone === 'ok' ? '&check;' : '!'}</div>
  <h1>${title}</h1>
  <p>${message}</p>
  <p class="demo">Demo payment — no money moved</p>
</div></body></html>`;

export default async function handler(req, res) {
  const payId = req.query?.i;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // A scanner may prefetch the URL, but the page itself must never be cached.
  res.setHeader('Cache-Control', 'no-store');

  if (!isValidPayId(payId)) {
    return res.status(400).send(page('Invalid payment link', 'This QR code is not one of ours.', 'bad'));
  }

  try {
    await markPaid(payId);
  } catch (error) {
    console.error('could not record the payment:', error.message);
    return res
      .status(500)
      .send(page('Something went wrong', 'Please scan the code again.', 'bad'));
  }

  console.log(`payment ${payId} scanned`);
  return res
    .status(200)
    .send(page('Payment received', 'You can go back to the shop — your order is being placed.', 'ok'));
}
