#!/usr/bin/env node
/**
 * Offline check of the two Vercel functions.
 *
 * Calls to api.telegram.org are stubbed, so nothing is sent to Telegram and no
 * bot token is needed: a throwaway token is used to sign the test initData and
 * to verify it, which is exactly what the real check does.
 *
 *   npm run selftest
 */
const TOKEN = '123456:SELFTEST-TOKEN';
process.env.BOT_TOKEN = TOKEN;
process.env.WEBAPP_URL = 'https://example.vercel.app';
process.env.WEBHOOK_SECRET = 'test-secret';

const sent = [];
globalThis.fetch = async (url, options) => {
  const method = String(url).split('/').pop();
  sent.push({ method, payload: JSON.parse(options.body) });
  return { json: async () => ({ ok: true, result: {} }) };
};

const { createHmac } = await import('node:crypto');
const order = await import('../api/order.js');
const telegram = await import('../api/telegram.js');

/** Sign initData the way Telegram does. */
function signInitData(user) {
  const payload = JSON.stringify(user);
  const authDate = Math.floor(Date.now() / 1000);
  const checkString = [`auth_date=${authDate}`, `user=${payload}`].sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  const hash = createHmac('sha256', secret).update(checkString).digest('hex');
  return new URLSearchParams({ user: payload, auth_date: String(authDate), hash }).toString();
}

const mockRes = () => {
  const res = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (key, value) => {
    res.headers[key] = value;
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    return res;
  };
  res.end = () => res;
  return res;
};

const ORDER = {
  id: '#1024',
  currency: '$',
  shipping: 10,
  total: 110,
  status: 'Processing',
  paymentMethod: 'cod',
  customer: { firstName: 'Tola', street: '12 Norodom Blvd', city: 'Phnom Penh', phone: '012345678' },
  items: [{ name: 'Women Round Neck Cotton Top', size: 'M', quantity: 1, price: 100 }],
};

let failures = 0;
const check = (name, condition, detail = '') => {
  console.log(`${condition ? '  ok  ' : '  FAIL'}  ${name}${detail && !condition ? ` — ${detail}` : ''}`);
  if (!condition) failures += 1;
};

console.log('\napi/order.js');

const signed = signInitData({ id: 42, first_name: 'Tola', username: 'tola' });
let res = mockRes();
await order.default({ method: 'POST', headers: {}, body: { initData: signed, order: ORDER } }, res);
check('genuine signature accepted', res.statusCode === 200, `got ${res.statusCode}`);
check('order id echoed back', res.body?.orderId === '#1024');

const receipt = sent.at(-1)?.payload?.text ?? '';
check('receipt says "Order #1024 Confirmed"', receipt.includes('Order #1024 Confirmed'));
check('receipt carries the total', receipt.includes('$110'));
check('receipt carries the status', receipt.includes('Processing'));
check('receipt goes to the id from initData', sent.at(-1)?.payload?.chat_id === 42);

res = mockRes();
const forged = signed.replace(/hash=.*/, `hash=${'0'.repeat(64)}`);
await order.default({ method: 'POST', headers: {}, body: { initData: forged, order: ORDER } }, res);
check('forged signature rejected', res.statusCode === 401, `got ${res.statusCode}`);

res = mockRes();
await order.default({ method: 'POST', headers: {}, body: { order: ORDER } }, res);
check('missing initData rejected', res.statusCode === 401);

res = mockRes();
await order.default({ method: 'GET', headers: {} }, res);
check('GET not allowed', res.statusCode === 405);

console.log('\napi/telegram.js');

const secretHeader = { 'x-telegram-bot-api-secret-token': 'test-secret' };

res = mockRes();
await telegram.default(
  { method: 'POST', headers: secretHeader, body: { message: { chat: { id: 7 }, from: { id: 7, first_name: 'Tola' }, text: '/start' } } },
  res,
);
const welcome = sent.at(-1)?.payload;
check('/start answered', res.statusCode === 200);
check('/start offers the Open Shop button', welcome?.reply_markup?.inline_keyboard?.[0]?.[0]?.text?.includes('Open Shop'));
check('button opens the Mini App URL', welcome?.reply_markup?.inline_keyboard?.[0]?.[0]?.web_app?.url === 'https://example.vercel.app');

res = mockRes();
await telegram.default(
  { method: 'POST', headers: secretHeader, body: { message: { chat: { id: 7 }, from: { id: 7, first_name: 'Tola' }, web_app_data: { data: JSON.stringify(ORDER) } } } },
  res,
);
check('sendData order gets a receipt', (sent.at(-1)?.payload?.text ?? '').includes('Order #1024 Confirmed'));

res = mockRes();
const before = sent.length;
await telegram.default({ method: 'POST', headers: { 'x-telegram-bot-api-secret-token': 'wrong' }, body: {} }, res);
check('wrong webhook secret rejected', res.statusCode === 401 && sent.length === before);

console.log(failures === 0 ? '\nAll checks passed.\n' : `\n${failures} check(s) failed.\n`);
process.exit(failures === 0 ? 0 : 1);
