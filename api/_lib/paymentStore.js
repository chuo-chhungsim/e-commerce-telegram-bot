/**
 * Where "this payment was scanned" is remembered.
 *
 * Serverless functions do not share memory: the request created by scanning the
 * QR and the request the checkout page polls with are different invocations, on
 * possibly different machines. So the flag lives in a Vercel Blob store, keyed by
 * an unguessable payment id.
 *
 * The state is carried by the *existence* of the object rather than its contents,
 * which keeps a check to a single metadata lookup.
 */
import { put, head } from '@vercel/blob';

/** Payment ids come from the client; only accept the shape we generate. */
export const isValidPayId = (id) => typeof id === 'string' && /^[a-f0-9]{16,64}$/i.test(id);

const keyFor = (payId) => `payments/${payId}/paid`;

export async function markPaid(payId) {
  await put(keyFor(payId), '1', {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'text/plain',
    // Demo payments are worthless after the presentation.
    cacheControlMaxAge: 3600,
  });
}

export async function isPaid(payId) {
  try {
    await head(keyFor(payId));
    return true;
  } catch {
    return false; // BlobNotFoundError - nobody has scanned it yet
  }
}
