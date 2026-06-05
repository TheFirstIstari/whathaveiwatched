/**
 * /api/health — tiny liveness endpoint.
 *
 * Used as Render's health check and as a cheap keep-warm ping target to
 * mitigate free-tier cold starts. Does no I/O and is never cached.
 */
export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json(
    { status: 'ok', ts: Date.now() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
