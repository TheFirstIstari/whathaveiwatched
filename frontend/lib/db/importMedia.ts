/**
 * importMedia — fetches TMDB data via our API route, then calls the appropriate
 * SpacetimeDB reducer to persist it.
 *
 * Usage (once module_bindings are generated):
 *   import { importMedia } from '@/lib/db/importMedia';
 *   await importMedia(conn, boardId, tmdbId, 'MOVIE');
 */

// These types mirror the generated SpacetimeType structs (camelCase)
export interface EpisodePayload {
  episodeNumber: number;
  title: string;
  overview: string;
  airDate: string;
}

export interface SeasonPayload {
  seasonNumber: number;
  title: string;
  overview: string;
  posterPath: string;
  airDate: string;
  episodes: EpisodePayload[];
}

export async function fetchTmdbData(
  tmdbId: number,
  type: 'MOVIE' | 'TV_SHOW'
): Promise<{ type: 'MOVIE'; data: MovieData } | { type: 'TV_SHOW'; data: TvShowData }> {
  const res = await fetch(`/api/tmdb/fetch?id=${tmdbId}&type=${type}`);
  if (!res.ok) throw new Error(`TMDB fetch failed: ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error);
  if (type === 'MOVIE') return { type: 'MOVIE', data: json as MovieData };
  return { type: 'TV_SHOW', data: json as TvShowData };
}

export interface MovieData {
  tmdbId: number;
  title: string;
  overview: string;
  posterPath: string;
  releaseDate: string;
}

export interface TvShowData {
  tmdbId: number;
  showTitle: string;
  showOverview: string;
  showPosterPath: string;
  firstAirDate: string;
  seasons: Array<{
    seasonNumber: number;
    title: string;
    overview: string;
    posterPath: string;
    airDate: string;
    episodes: Array<{
      episodeNumber: number;
      title: string;
      overview: string;
      airDate: string;
    }>;
  }>;
}

/**
 * Call this after module_bindings are generated.
 * Signature matches the generated reducer types.
 *
 * @param conn    — DbConnection from module_bindings
 * @param boardId — BigInt board id
 * @param tmdbId  — numeric TMDB id
 * @param type    — 'MOVIE' | 'TV_SHOW'
 */
export async function importMedia(
  conn: any,
  boardId: bigint,
  tmdbId: number,
  type: 'MOVIE' | 'TV_SHOW'
): Promise<void> {
  const result = await fetchTmdbData(tmdbId, type);

  if (result.type === 'MOVIE') {
    const d = result.data;
    await conn.reducers.insertMovie({
      boardId,
      tmdbId: BigInt(d.tmdbId),
      title: d.title,
      overview: d.overview,
      posterPath: d.posterPath,
      releaseDate: d.releaseDate,
    });
  } else {
    const d = result.data;
    const seasons: SeasonPayload[] = d.seasons.map(s => ({
      seasonNumber: s.seasonNumber,
      title: s.title,
      overview: s.overview,
      posterPath: s.posterPath,
      airDate: s.airDate,
      episodes: s.episodes.map(e => ({
        episodeNumber: e.episodeNumber,
        title: e.title,
        overview: e.overview,
        airDate: e.airDate,
      })),
    }));

    await conn.reducers.insertTvShow({
      boardId,
      tmdbId: BigInt(d.tmdbId),
      showTitle: d.showTitle,
      showOverview: d.showOverview,
      showPosterPath: d.showPosterPath,
      firstAirDate: d.firstAirDate,
      seasons,
    });
  }
}
