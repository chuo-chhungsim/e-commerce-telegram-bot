/**
 * Builds a KHQR payload — the Cambodian flavour of the EMVCo merchant QR that
 * Bakong-connected banking apps (ABA, ACLEDA, Wing…) read.
 *
 * The string is assembled from TLV blocks: a two-digit tag, a two-digit length,
 * then the value. The last block is the CRC over everything before it, which is
 * what makes a scanner accept or reject the code.
 *
 * Spec shape:
 *   00 payload format       "01"
 *   01 point of initiation  "11" static (no amount) / "12" dynamic (one-off)
 *   29 merchant account     00 = bakong account id, 01 = merchant id
 *   52 merchant category    "5999" = miscellaneous retail
 *   53 currency             "840" USD / "116" KHR
 *   54 amount               omitted for a static code
 *   58 country              "KH"
 *   59 merchant name        max 25 chars
 *   60 merchant city        max 15 chars
 *   62 additional data      01 = bill number
 *   63 CRC                  4 uppercase hex digits
 */

const CURRENCIES = { USD: '840', KHR: '116' };

/** One TLV block; values longer than 99 characters cannot be encoded. */
function tlv(tag, value) {
  if (value === undefined || value === null || value === '') return '';
  const text = String(value);
  return `${tag}${String(text.length).padStart(2, '0')}${text}`;
}

/**
 * CRC-16/CCITT-FALSE (polynomial 0x1021, initial value 0xFFFF) — the checksum
 * EMVCo specifies. Computed over the payload *including* the "6304" tag header.
 */
export function crc16(input) {
  let crc = 0xffff;
  for (let index = 0; index < input.length; index += 1) {
    crc ^= input.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * @param {object} options
 * @param {string} options.accountId  Bakong account, e.g. "forever_demo@bkrt"
 * @param {string} options.merchantName
 * @param {string} [options.merchantCity]
 * @param {number} [options.amount]   omit for a static QR with no amount
 * @param {'USD'|'KHR'} [options.currency]
 * @param {string} [options.billNumber]
 * @returns {string} the complete KHQR payload
 */
export function buildKhqr({
  accountId,
  merchantName,
  merchantCity = 'Phnom Penh',
  amount,
  currency = 'USD',
  merchantId = '000000000',
  billNumber,
}) {
  const dynamic = typeof amount === 'number' && amount > 0;

  const payload = [
    tlv('00', '01'),
    tlv('01', dynamic ? '12' : '11'),
    tlv('29', tlv('00', accountId) + tlv('01', merchantId)),
    tlv('52', '5999'),
    tlv('53', CURRENCIES[currency] ?? CURRENCIES.USD),
    dynamic ? tlv('54', amount.toFixed(2)) : '',
    tlv('58', 'KH'),
    tlv('59', merchantName.slice(0, 25)),
    tlv('60', merchantCity.slice(0, 15)),
    billNumber ? tlv('62', tlv('01', String(billNumber).slice(0, 25))) : '',
  ].join('');

  // The CRC covers the payload plus the CRC tag and length ("6304").
  return `${payload}6304${crc16(`${payload}6304`)}`;
}
