/**
 * Formatting of the order confirmation the bot posts back into the chat.
 * Kept separate from index.js so it can be checked without starting the server.
 */

export const escapeHtml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PAYMENT_LABELS = {
  khqr: 'KHQR (demo)',
  aba: 'ABA Pay (demo)',
  cod: 'Cash on Delivery',
};

export function formatReceipt(order, user, shopName = 'Forever') {
  const products = order.items
    .map((item) => `${escapeHtml(item.name)} (${escapeHtml(item.size)}) \u00d7 ${item.quantity}`)
    .join('\n            ');

  const customer = order.customer ?? {};
  // The checkout collects one free-form address; older orders had split fields.
  const address =
    customer.address ??
    [customer.street, customer.city, customer.state, customer.country].filter(Boolean).join(', ');

  return [
    `\u2705 <b>Order ${escapeHtml(order.id)} Confirmed</b>`,
    '',
    `<b>Product:</b> ${products}`,
    `<b>Total:</b> ${order.currency}${order.total}`,
    `<b>Status:</b> ${escapeHtml(order.status ?? 'Processing')}`,
    '',
    `Payment: ${escapeHtml(PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod)}`,
    customer.name ? `Name: ${escapeHtml(customer.name)}` : '',
    address ? `Deliver to: ${escapeHtml(address)}` : '',
    customer.phone ? `Phone: ${escapeHtml(customer.phone)}` : '',
    '',
    `Thanks for shopping with ${escapeHtml(shopName)}, ${escapeHtml(user.first_name)}! \ud83d\udecd\ufe0f`,
  ]
    .filter(Boolean)
    .join('\n');
}
