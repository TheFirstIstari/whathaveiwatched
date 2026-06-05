/**
 * /api/tmdb/fetch — fetches full TMDB metadata for a title.
 *
 * The SpacetimeDB module cannot make HTTP calls (reducers are sync).
 * This route fetches the data server-side; the client then passes the
 * structured payload to insert_movie / insert_tv_show reducers.
 *
 * GET /api/tmdb/fetch?id=<tmdb_id>&type=MOVIE|TV_SHOW
 */
import { NextRequest } from 'next/server';

const BASE = 'https://api.themoviedb.org/3';

async function tmdbGet(path: string) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const id   = req.nextUrl.searchParams.get('id');
  const type = req.nextUrl.searchParams.get('type'); // MOVIE | TV_SHOW

  if (!id || !type) {
    return Response.json({ error: 'Missing id or type' }, { status: 400 });
  }

  // Title metadata barely changes — cache aggressively at CDN + browser.
  const CACHE = 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800';

  try {
    if (type === 'MOVIE') {
      const data = await tmdbGet(`/movie/${id}`);
      return Response.json({
        tmdbId:       data.id,
        title:        data.title ?? '',
        overview:     data.overview ?? '',
        posterPath:   data.poster_path ?? '',
        releaseDate:  data.release_date ?? '',
      }, { headers: { 'Cache-Control': CACHE } });
    }

    if (type === 'TV_SHOW') {
      const show = await tmdbGet(`/tv/${id}`);
      const nSeasons: number = show.number_of_seasons ?? 0;

      const seasons = await Promise.all(
        Array.from({ length: nSeasons }, (_, i) => i + 1).map(async (n) => {
          const s = await tmdbGet(`/tv/${id}/season/${n}`);
          return {
            seasonNumber: n,
            title:        `Season ${n}`,
            overview:     s.overview ?? '',
            posterPath:   s.poster_path ?? '',
            airDate:      s.air_date ?? '',
            episodes: ((s.episodes as any[]) ?? []).map((ep) => ({
              episodeNumber: ep.episode_number,
              title:         ep.name ?? '',
              overview:      ep.overview ?? '',
              airDate:       ep.air_date ?? '',
            })),
          };
        })
      );

      return Response.json({
        tmdbId:        show.id,
        showTitle:     show.name ?? '',
        showOverview:  show.overview ?? '',
        showPosterPath: show.poster_path ?? '',
        firstAirDate:  show.first_air_date ?? '',
        seasons,
      }, { headers: { 'Cache-Control': CACHE } });
    }

    return Response.json({ error: `Unknown type: ${type}` }, { status: 400 });
  } catch (err: any) {
    return Response.json({ error: err.message ?? 'TMDB fetch failed' }, { status: 502 });
  }
}
