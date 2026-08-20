import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import KhqrCard from './KhqrCard';
import { haptic } from '../telegram/tg';
import { buildKhqr } from '../lib/khqr';
import { checkPayment, newPayId, paymentUrl } from '../lib/api';

/**
 * The payment step.
 *
 * Two QR modes, chosen with VITE_QR_MODE:
 *
 *  'link' (default) — the QR holds this app's /api/pay?i=<payId> URL. Scanning it
 *      with a phone camera opens that endpoint, the server records the payment,
 *      and the polling below sees it and settles the order. The scan really is
 *      what completes the checkout.
 *
 *  'khqr' — the QR holds a genuine KHQR payload, so a Cambodian banking app reads
 *      the merchant and amount off it. Nothing can confirm such a transfer without
 *      a Bakong merchant account, so in this mode only the tap fallback settles it.
 *
 * Either way no money moves: this is a demo checkout, and the card says so.
 */
const QR_MODE = import.meta.env.VITE_QR_MODE || 'link';
const ALLOW_TAP = (import.meta.env.VITE_DEMO_PAY_TAP ?? '1') !== '0';
const POLL_INTERVAL = 2000;
const EXPIRY_SECONDS = 300;

const METHODS = {
  khqr: { label: 'KHQR' },
  aba: { label: 'ABA Pay (demo)' },
};

// In 'link' mode the QR holds a URL, which a banking app will not treat as a
// payment - the phone camera is what completes it. Say the right thing for the
// mode actually in use.
const SCAN_HINT =
  QR_MODE === 'khqr' ? 'Scan with any Cambodian banking app' : 'Scan with your phone camera';

const PaymentSheet = ({ open, method = 'khqr', amount, currency = 'USD', billNumber, onPaid, onClose }) => {
  const [status, setStatus] = useState('waiting');
  const [payload, setPayload] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
  const settledRef = useRef(false);

  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    haptic.notify('success');
    setStatus('paid');
    // Let the tick register visually before the order goes through.
    setTimeout(() => onPaid?.(), 1200);
  };

  useEffect(() => {
    if (!open) return undefined;

    settledRef.current = false;
    setStatus('waiting');
    setSecondsLeft(EXPIRY_SECONDS);

    const payId = newPayId();
    setPayload(
      QR_MODE === 'khqr'
        ? buildKhqr({
            accountId: import.meta.env.VITE_KHQR_ACCOUNT || 'forever_demo@bkrt',
            merchantName: import.meta.env.VITE_KHQR_MERCHANT || 'Forever',
            amount,
            currency,
            billNumber,
          })
        : paymentUrl(payId),
    );

    const countdown = setInterval(() => setSecondsLeft((left) => Math.max(0, left - 1)), 1000);

    // Ask the server whether the QR has been scanned yet.
    const poll =
      QR_MODE === 'khqr'
        ? null
        : setInterval(async () => {
            try {
              if (await checkPayment(payId)) settle();
            } catch {
              /* offline for a moment - the next tick tries again */
            }
          }, POLL_INTERVAL);

    return () => {
      clearInterval(countdown);
      if (poll) clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const style = METHODS[method] ?? METHODS.khqr;
  const minutes = String(Math.floor(secondsLeft / 60));
  const seconds = String(secondsLeft % 60).padStart(2, '0');
  const expired = secondsLeft === 0 && status === 'waiting';

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-medium text-gray-800">{style.label}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="text-gray-400">
            <X size={20} />
          </button>
        </div>

        {status === 'waiting' ? (
          <>
            <KhqrCard
              payload={payload}
              amount={amount}
              currency={currency}
              onSecretTap={ALLOW_TAP ? settle : undefined}
            />

            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-gray-500">
              {expired ? (
                'QR code expired — close and try again'
              ) : (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Waiting for payment…
                </>
              )}
            </div>
            <p className="mt-1 text-center text-xs text-gray-400">
              {SCAN_HINT}
              {!expired && ` · expires in ${minutes}:${seconds}`}
            </p>
            <p className="mt-3 text-center text-[10px] uppercase tracking-wider text-gray-400">
              Demo payment — no money moves
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check size={32} className="text-green-600" strokeWidth={3} />
            </div>
            <p className="mt-4 text-lg font-medium text-gray-800">Payment received</p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {currency === 'USD' ? '$' : ''}
              {amount.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-gray-400">Placing your order…</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSheet;
