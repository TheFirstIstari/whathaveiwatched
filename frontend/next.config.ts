import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trim production JS: drop console.* (keep error/warn) in prod builds.
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async headers() {
    return [
      // The board view is client-rendered and gets all data over the
      // SpacetimeDB WebSocket; the HTML shell carries no per-user data, so
      // we let the browser cache the shell briefly instead of no-store.
      {
        source: '/board/:path*',
        headers: [
          { key: 'Cache-Control', value: 'private, max-age=0, must-revalidate' },
        ],
      },
      // Static-ish pages (no SpacetimeDB useTable hooks) — cache the HTML shell
      // for 5 min at CDN, 60s in browser. Data arrives client-side.
      {
        source: '/signin',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/boards/new',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400' },
        ],
      },
    ];
  },
};

export default nextConfig;
