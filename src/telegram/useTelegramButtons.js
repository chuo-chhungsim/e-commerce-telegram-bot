import { useEffect, useRef } from 'react';
import { tg, isTelegram } from './tg';

/**
 * Shows Telegram's native BackButton in the header while `active` is true, and
 * routes taps to the latest `onBack`. A no-op in a normal browser, where the
 * site's own navigation is used instead.
 */
export function useBackButton(onBack, active = true) {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!isTelegram || !tg?.BackButton) return undefined;
    const button = tg.BackButton;
    const onTap = () => handler.current?.();
    button.onClick(onTap);
    return () => {
      button.offClick(onTap);
      button.hide();
    };
  }, []);

  useEffect(() => {
    if (!isTelegram || !tg?.BackButton) return undefined;
    if (active) tg.BackButton.show();
    else tg.BackButton.hide();
    return undefined;
  }, [active]);
}
