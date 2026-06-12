import { describe, it, expect } from 'vitest';
import { posterUrl } from './tmdb';

describe('posterUrl', () => {
  it('builds a URL with default size w185', () => {
    expect(posterUrl('/abc.jpg')).toBe('https://image.tmdb.org/t/p/w185/abc.jpg');
  });

  it('builds a URL with explicit size', () => {
    expect(posterUrl('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
    expect(posterUrl('/abc.jpg', 'w500')).toBe('https://image.tmdb.org/t/p/w500/abc.jpg');
  });

  it('returns null for null path', () => {
    expect(posterUrl(null)).toBeNull();
  });

  it('returns null for undefined path', () => {
    expect(posterUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(posterUrl('')).toBeNull();
  });
});
