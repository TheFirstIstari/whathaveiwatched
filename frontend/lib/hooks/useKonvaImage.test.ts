import { describe, it, expect } from 'vitest';
import { useKonvaImage } from './useKonvaImage';
import { renderHook, act } from '@testing-library/react';

// We can't fully test image loading in jsdom (no real images),
// but we can test the state machine for null/undefined src and
// the initial loading state.

describe('useKonvaImage', () => {
  it('returns loading state initially for a valid src', () => {
    const { result } = renderHook(() => useKonvaImage('https://example.com/poster.jpg'));
    expect(result.current.status).toBe('loading');
    expect(result.current.image).toBeNull();
  });

  it('returns error state for null src', () => {
    const { result } = renderHook(() => useKonvaImage(null));
    expect(result.current.status).toBe('error');
    expect(result.current.image).toBeNull();
  });

  it('returns error state for undefined src', () => {
    const { result } = renderHook(() => useKonvaImage(undefined));
    expect(result.current.status).toBe('error');
    expect(result.current.image).toBeNull();
  });

  it('returns error state for empty string', () => {
    const { result } = renderHook(() => useKonvaImage(''));
    expect(result.current.status).toBe('error');
    expect(result.current.image).toBeNull();
  });

  it('updates when src changes', () => {
    const { result, rerender } = renderHook(
      ({ src }) => useKonvaImage(src),
      { initialProps: { src: 'https://example.com/a.jpg' } },
    );
    expect(result.current.status).toBe('loading');

    // Change src — should go back to loading
    rerender({ src: 'https://example.com/b.jpg' });
    expect(result.current.status).toBe('loading');
  });

  it('transitions to error when src becomes null', () => {
    const { result, rerender } = renderHook(
      ({ src }: { src: string | null | undefined }) => useKonvaImage(src),
      { initialProps: { src: 'https://example.com/a.jpg' } as { src: string | null | undefined } },
    );
    expect(result.current.status).toBe('loading');

    rerender({ src: null });
    expect(result.current.status).toBe('error');
  });
});
