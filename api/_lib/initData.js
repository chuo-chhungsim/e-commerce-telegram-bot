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

  // Parsed by hand rather than with URLSearchParams: that class applies HTML form
  // decoding, which turns a literal '+' into a space. Telegram's query_id and
  // signature are base64, so a '+' in them would silently corrupt the check
  // string and every signature would look forged.
  const fields = new Map();
  for (const pair of initData.split('&')) {
    if (!pair) continue;
    const separator = pair.indexOf('=');
    if (separator === -1) continue;
    const key = decodeURIComponent(pair.slice(0, separator));
    const value = decodeURIComponent(pair.slice(separator + 1));
    fields.set(key, value);
  }

  const hash = fields.get('hash');
  if (!hash) return { ok: false, reason: 'missing hash' };
  fields.delete('hash');

  const secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();

  const hashFor = (entries) => {
    const checkString = entries
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join('\n');
    return crypto.createHmac('sha256', secret).update(checkString).digest('hex');
  };

  const entries = [...fields.entries()];
  // `signature` carries the newer Ed25519 third-party proof. Telegram clients
  // disagree about whether it belongs in the bot-token check string, so accept
  // either reading - both are still HMACs over the data Telegram sent, keyed by
  // the bot token, so neither weakens the check.
  const candidates = [hashFor(entries.filter(([key]) => key !== 'signature'))];
  if (fields.has('signature')) candidates.push(hashFor(entries));

  const received = Buffer.from(hash, 'hex');
  const matches = candidates.some((candidate) => {
    const expected = Buffer.from(candidate, 'hex');
    return expected.length === received.length && crypto.timingSafeEqual(expected, received);
  });

  if (!matches) {
    // Field names only - no values, so nothing sensitive reaches the logs.
    console.error('initData rejected; fields present:', [...fields.keys()].sort().join(','));
    return { ok: false, reason: 'bad signature' };
  }

  // A valid but old initData string could have been captured and replayed.
  const authDate = Number(fields.get('auth_date') || 0);
  const ageSeconds = Math.floor(Date.now() / 1000) - authDate;
  if (!authDate || ageSeconds > maxAgeSeconds) {
    return { ok: false, reason: 'initData expired' };
  }

  let user = null;
  try {
    user = JSON.parse(fields.get('user') || 'null');
  } catch {
    return { ok: false, reason: 'malformed user' };
  }
  if (!user?.id) return { ok: false, reason: 'no user in initData' };

  return { ok: true, user, authDate: new Date(authDate * 1000) };
}
