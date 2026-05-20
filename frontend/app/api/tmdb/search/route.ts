import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const q    = req.nextUrl.searchParams.get('q') ?? '';
  const type = req.nextUrl.searchParams.get('type') ?? 'all';
  if (q.length < 2) return NextResponse.json({ results: [] });

  const endpoint = type === 'show'  ? 'search/tv'
                 : type === 'movie' ? 'search/movie'
                 : 'search/multi';

  const url = `https://api.themoviedb.org/3/${endpoint}?query=${encodeURIComponent(q)}&include_adult=false`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${process.env.TMDB_READ_ACCESS_TOKEN}` },
      next: { revalidate: 60 },
    });
    const data = await res.json();
    const results = (data.results ?? [])
      .filter((r: any) => r.media_type !== 'person')
      .slice(0, 8)
      .map((r: any) => ({
        id:         r.id,
        title:      r.title ?? r.name ?? '',
        year:       (r.release_date ?? r.first_air_date ?? '').slice(0, 4),
        posterPath: r.poster_path ?? null,
        media_type: r.media_type ?? (type === 'show' ? 'tv' : type === 'movie' ? 'movie' : 'movie'),
      }));
    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [], error: 'Search failed' }, { status: 500 });
  }
}