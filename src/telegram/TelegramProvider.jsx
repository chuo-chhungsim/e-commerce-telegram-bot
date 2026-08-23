import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { tg, isTelegram, getUser, supports } from './tg';
import { applyTheme, applyViewport, getColorScheme } from './theme';

const TelegramContext = createContext(null);

/** Telegram user + client info for any component that needs it. */
export const useTelegram = () => useContext(TelegramContext);

/**
 * Boots the Mini App: tells Telegram we are ready to be shown, expands to full
 * height, mirrors the client theme into CSS variables, and keeps both in sync
 * while the app is open.
 */
export default function TelegramProvider({ children }) {
  const [colorScheme, setColorScheme] = useState(getColorScheme);
  const user = useMemo(() => getUser(), []);

  useEffect(() => {
    applyTheme();
    applyViewport();

    if (!tg) return undefined;

    tg.ready(); // hides Telegram's loading placeholder
    tg.expand(); // open at full height instead of the default half sheet

    if (supports('6.1')) {
      tg.setHeaderColor('bg_color');
      tg.setBackgroundColor('bg_color');
    }
    // Stop a downward swipe from minimising the app while scrolling a list.
    if (supports('7.7')) tg.disableVerticalSwipes();

    const onThemeChanged = () => setColorScheme(applyTheme());
    const onViewportChanged = () => applyViewport();

    tg.onEvent('themeChanged', onThemeChanged);
    tg.onEvent('viewportChanged', onViewportChanged);
    window.addEventListener('resize', onViewportChanged);

    return () => {
      tg.offEvent('themeChanged', onThemeChanged);
      tg.offEvent('viewportChanged', onViewportChanged);
      window.removeEventListener('resize', onViewportChanged);
    };
  }, []);

  // Outside Telegram, follow the operating system's light/dark setting.
  useEffect(() => {
    if (isTelegram || !window.matchMedia) return undefined;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setColorScheme(applyTheme());
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const value = useMemo(
    () => ({
      tg,
      isTelegram,
      user,
      colorScheme,
      platform: tg?.platform ?? 'web',
      version: tg?.version ?? '-',
    }),
    [user, colorScheme],
  );

  return <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>;
}
