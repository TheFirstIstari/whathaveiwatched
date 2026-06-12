import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchTmdbData } from './importMedia';

// Mock global fetch for unit tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
});

describe('fetchTmdbData', () => {
  it('returns movie data on successful MOVIE fetch', async () => {
    const movieData = {
      tmdbId: 550,
      title: 'Fight Club',
      overview: 'A ticking-time-bomb insomniac...',
      posterPath: '/pB8BM7pdSp6B6Ih7QI4S2t0POoD.jpg',
      releaseDate: '1999-10-15',
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => movieData,
    });

    const result = await fetchTmdbData(550, 'MOVIE');
    expect(result).toEqual({ type: 'MOVIE', data: movieData });
    expect(mockFetch).toHaveBeenCalledWith('/api/tmdb/fetch?id=550&type=MOVIE');
  });

  it('returns TV_SHOW data on successful TV_SHOW fetch', async () => {
    const tvData = {
      tmdbId: 1399,
      showTitle: 'Game of Thrones',
      showOverview: 'Seven noble families fight...',
      showPosterPath: '/1XS1oqL89opfnbLl8WnZY1O1uJb.jpg',
      firstAirDate: '2011-04-17',
      seasons: [],
    };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => tvData,
    });

    const result = await fetchTmdbData(1399, 'TV_SHOW');
    expect(result).toEqual({ type: 'TV_SHOW', data: tvData });
    expect(mockFetch).toHaveBeenCalledWith('/api/tmdb/fetch?id=1399&type=TV_SHOW');
  });

  it('throws on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    await expect(fetchTmdbData(99999, 'MOVIE')).rejects.toThrow('TMDB fetch failed: 404');
  });

  it('throws on error JSON response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: 'Invalid API key' }),
    });

    await expect(fetchTmdbData(1, 'MOVIE')).rejects.toThrow('Invalid API key');
  });

  it('throws on 500 server error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(fetchTmdbData(1, 'MOVIE')).rejects.toThrow('TMDB fetch failed: 500');
  });
});
