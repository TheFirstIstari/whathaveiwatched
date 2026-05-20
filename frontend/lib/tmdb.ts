export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export function posterUrl(path: string | null | undefined, size: 'w185' | 'w342' | 'w500' = 'w185'): string | null {
  return path ? `${TMDB_IMAGE_BASE}/${size}${path}` : null;
}