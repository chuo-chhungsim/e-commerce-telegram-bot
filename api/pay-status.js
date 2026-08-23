/**
 * GET /api/pay-status?i=<payId> — polled by the checkout screen while the QR is
 * on display. Returns `{ paid: true }` once /api/pay has been opened by a scan.
 */
import { isValidPayId, isPaid } from './_lib/paymentStore.js';

export default async function handler(req, res) {
  const payId = req.query?.i;
  res.setHeader('Cache-Control', 'no-store');

  if (!isValidPayId(payId)) return res.status(400).json({ ok: false, error: 'bad payment id' });

  try {
    return res.status(200).json({ ok: true, paid: await isPaid(payId) });
  } catch (error) {
    console.error('status lookup failed:', error.message);
    return res.status(500).json({ ok: false, error: 'lookup failed' });
  }
}
