import crypto from 'node:crypto';

/**
 * Verify Telegram Mini App `initData`.
 *
 * The Mini App front-end can claim to be anyone - `initDataUnsafe` is called
 * "unsafe" for exactly that reason. The signed `initData` string is the only
 * trustworthy source of the user's identity, and it can only be checked with the
 * bot token, which never leaves the server.
 *
 * Algorithm (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
 *   secret       = HMAC_SHA256(key: "WebAppData", data: bot_token)
 *   checkString  = every "key=value" pair except `hash`, sorted, joined with \n
 *   expectedHash = HMAC_SHA256(key: secret, data: checkString) as hex
 *   valid        = expectedHash === hash  (compared in constant time)
 *
 * @returns {{ok: true, user: object, authDate: Date}|{ok: false, reason: string}}
 */
export function verifyInitData(initData, botToken, maxAgeSeconds = 86400) {
  if (!initData || typeof initData !== 'string') {
    return { ok: false, reason: 'missing initData' };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) return { ok: false, reason: 'missing hash' };

  params.delete('hash');
  // `signature` belongs to the newer third-party validation flow and is not part
  // of the bot-token check string.
  params.delete('signature');

  const checkString = [...params.entries()]
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expectedHash = crypto.createHmac('sha256', secret).update(checkString).digest('hex');

  const a = Buffer.from(expectedHash, 'hex');
  const b = Buffer.from(hash, 'hex');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return { ok: false, reason: 'bad signature' };
  }

  // A valid but old initData string could have been captured and replayed.
  const authDate = Number(params.get('auth_date') || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSeconds > maxAgeSeconds) {
    return { ok: false, reason: 'initData expired' };
  }

  let user = null;
  try {
    user = JSON.parse(params.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'malformed user' };
  }
  if (!user?.id) return { ok: false, reason: 'no user in initData' };

  return { ok: true, user, authDate: new Date(authDate * 1000) };
}
