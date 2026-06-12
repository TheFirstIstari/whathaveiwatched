import { describe, it, expect } from 'vitest';
import { episodeLabel } from './episodeLabel';

describe('episodeLabel', () => {
  it('parses S##E## with zero-padding', () => {
    expect(episodeLabel('S01E03 - The One')).toBe('S01E03');
  });

  it('zero-pads single-digit season/episode', () => {
    expect(episodeLabel('s1e3 whatever')).toBe('S01E03');
  });

  it('parses episode-only "Ep. N"', () => {
    expect(episodeLabel('Ep. 7: Title')).toBe('E07');
  });

  it('parses bare "E##"', () => {
    expect(episodeLabel('E12')).toBe('E12');
  });

  it('returns null for plain titles', () => {
    expect(episodeLabel('Some Movie')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(episodeLabel('')).toBeNull();
  });

  it('only matches at start of string', () => {
    expect(episodeLabel('The S01E01 reunion')).toBeNull();
  });
});
