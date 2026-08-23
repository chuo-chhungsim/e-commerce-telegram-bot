import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

const MERCHANT = import.meta.env.VITE_KHQR_MERCHANT || 'Forever';

/**
 * The familiar red KHQR card: merchant, amount, and the QR itself.
 *
 * `payload` is whatever the QR should contain — either the payment URL that
 * makes a scan settle the order, or a real KHQR string (see src/lib/khqr.js).
 */
const KhqrCard = ({ payload, amount, currency = 'USD', onSecretTap }) => {
  const [svg, setSvg] = useState('');

  useEffect(() => {
    if (!payload) return undefined;
    let cancelled = false;
    QRCode.toString(payload, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' }).then((markup) => {
      if (!cancelled) setSvg(markup);
    });
    return () => {
      cancelled = true;
    };
  }, [payload]);

  return (
    <div
      onClick={onSecretTap}
      className="mx-auto w-[250px] select-none overflow-hidden rounded-xl bg-white shadow-lg"
    >
      {/* Red banner, like the printed KHQR cards */}
      <div className="bg-[#e11b26] py-2.5 text-center">
        <span className="text-base font-semibold tracking-[0.15em] text-white">KHQR</span>
      </div>

      <div className="px-5 pb-4 pt-3">
        <p className="text-sm text-gray-700">{MERCHANT}</p>
        <p className="mt-0.5">
          <span className="text-2xl font-semibold text-gray-900">{amount.toFixed(2)}</span>
          <span className="ml-1 text-xs text-gray-500">{currency}</span>
        </p>

        <div className="mt-3 border-t border-dashed pt-3">
          {svg ? (
            <div
              className="mx-auto aspect-square w-full [&>svg]:h-full [&>svg]:w-full"
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          ) : (
            <div className="aspect-square w-full animate-pulse bg-gray-100" />
          )}
        </div>
      </div>
    </div>
  );
};

export default KhqrCard;
