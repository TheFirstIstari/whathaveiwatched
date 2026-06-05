'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
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
    const stored = localStorage.getItem('ihw_theme');
    const dark = stored === 'dark'; // light is the default
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

  // On SSR: render ThemeProvider + children without SpacetimeProvider.
  // Pages guard themselves from calling SpacetimeDB hooks via their own
  // mounted check, so this is safe — they return a loading skeleton.
  // On client: wrap with SpacetimeProvider so hooks work.
  return (
    <ThemeProvider>
      {mounted ? (
        <SpacetimeProvider>
          {children}
        </SpacetimeProvider>
      ) : (
        children
      )}
    </ThemeProvider>
  );
}
