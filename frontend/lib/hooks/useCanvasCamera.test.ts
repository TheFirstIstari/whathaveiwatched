import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCanvasCamera } from './useCanvasCamera';

describe('useCanvasCamera', () => {
  it('initializes with default state', () => {
    const { result } = renderHook(() => useCanvasCamera());
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
    expect(result.current.scale).toBe(1.0);
  });

  it('zoomTo updates scale', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.zoomTo(1.5); });
    expect(result.current.scale).toBe(1.5);
  });

  it('zoomTo clamps scale to min 0.1', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.zoomTo(0.01); });
    expect(result.current.scale).toBe(0.1);
  });

  it('zoomTo clamps scale to max 2.0', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.zoomTo(5.0); });
    expect(result.current.scale).toBe(2.0);
  });

  it('zoomTo with focal point adjusts x/y to keep focal stationary', () => {
    const { result } = renderHook(() => useCanvasCamera());
    // Start at scale=1, x=0, y=0. Zoom to 2x around focal (100, 100).
    // New x = 100 - (100 - 0) * (2/1) = 100 - 200 = -100
    act(() => { result.current.zoomTo(2.0, { x: 100, y: 100 }); });
    expect(result.current.scale).toBe(2.0);
    expect(result.current.x).toBe(-100);
    expect(result.current.y).toBe(-100);
  });

  it('zoomTo without focal point keeps x/y unchanged', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.zoomTo(1.5); });
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
  });

  it('setCam allows direct state replacement', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.setCam({ x: 50, y: 60, scale: 0.8 }); });
    expect(result.current.x).toBe(50);
    expect(result.current.y).toBe(60);
    expect(result.current.scale).toBe(0.8);
  });

  it('fitToView does nothing for empty nodes', () => {
    const { result } = renderHook(() => useCanvasCamera());
    act(() => { result.current.fitToView([]); });
    // Should remain at defaults
    expect(result.current.x).toBe(0);
    expect(result.current.y).toBe(0);
    expect(result.current.scale).toBe(1.0);
  });

  it('fitToView computes scale and position for nodes', () => {
    // Mock window dimensions
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    const { result } = renderHook(() => useCanvasCamera());
    act(() => {
      result.current.fitToView([
        { x: 0, y: 0, width: 200, height: 200 },
        { x: 200, y: 0, width: 200, height: 200 },
      ]);
    });
    // Should have computed some scale and centered position
    expect(result.current.scale).toBeGreaterThan(0);
    expect(result.current.scale).toBeLessThanOrEqual(2.0);

    vi.unstubAllGlobals();
  });
});
