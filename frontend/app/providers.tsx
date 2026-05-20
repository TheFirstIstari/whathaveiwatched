'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { SpacetimeDBProvider } from 'spacetimedb/react';
import { DbConnection } from '@/src/module_bindings';
import { DARK_THEME, LIGHT_THEME, ThemeTokens } from '@/lib/theme';
import { getIdentityToken, setIdentityToken, setIdentityHex } from '@/lib/db/connection';

// ---------------------------------------------------------------------------
// Theme context
// ---------------------------------------------------------------------------
interface ThemeContextValue { theme: ThemeTokens; isDark: boolean; toggle: () => void; }
export const ThemeContext = createContext<ThemeContextValue>({
  theme: LIGHT_THEME, isDark: false, toggle: () => {},
});
export function useTheme() { return useContext(ThemeContext); }

function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const dark = localStorage.getItem('ihw_theme') === 'dark';
    setIsDark(dark);
    document.documentElement.classList.toggle('dark', dark);
  }, []);
  const toggle = () => {
    setIsDark(d => {
      const next = !d;
      localStorage.setItem('ihw_theme', next ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', next);
      return next;
    });
  };
  return (
    <ThemeContext.Provider value={{ theme: isDark ? DARK_THEME : LIGHT_THEME, isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// SpacetimeDB provider wrapper — builds the connection once on mount
// ---------------------------------------------------------------------------
function SpacetimeProvider({ children }: { children: React.ReactNode }) {
  const [builder] = useState(() =>
    DbConnection.builder()
      .withUri(process.env.NEXT_PUBLIC_SPACETIMEDB_HOST!)
      .withDatabaseName(process.env.NEXT_PUBLIC_SPACETIMEDB_DB!)
      .withToken(getIdentityToken() ?? undefined)
      .onConnect((_conn, identity, token) => {
        setIdentityToken(token);
        setIdentityHex(identity.toHexString());
      })
      .onConnectError((_ctx, err) => {
        console.error('[SpacetimeDB] connect error:', err);
      })
      .onDisconnect((_ctx, err) => {
        if (err) console.warn('[SpacetimeDB] disconnected:', err);
      })
  );

  return (
    <SpacetimeDBProvider connectionBuilder={builder}>
      {children}
    </SpacetimeDBProvider>
  );
}

// ---------------------------------------------------------------------------
// Root providers
// ---------------------------------------------------------------------------
export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Don't render SpacetimeProvider (or its children) during SSR — hooks like
  // useReducer/useTable depend on SpacetimeDBProvider being present and will
  // throw if rendered server-side. Return a bare shell (no children) until
  // the client mounts.
  if (!mounted) {
    return (
      <ThemeProvider>
        <span style={{ display: 'none' }} suppressHydrationWarning />
      </ThemeProvider>
    );
  }

  return (
    <SpacetimeProvider>
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </SpacetimeProvider>
  );
}
