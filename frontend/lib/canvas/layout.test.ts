import { describe, it, expect } from 'vitest';
import {
  getZoomLevel, nodeDimensions, computeLayout, CHRONO_UNIT_PX, type LayoutItem,
} from './layout';

describe('getZoomLevel', () => {
  it('returns EPISODE at scale >= 0.5', () => {
    expect(getZoomLevel(0.5)).toBe('EPISODE');
    expect(getZoomLevel(1)).toBe('EPISODE');
    expect(getZoomLevel(2)).toBe('EPISODE');
  });
  it('returns SEASON between 0.25 and 0.5', () => {
    expect(getZoomLevel(0.25)).toBe('SEASON');
    expect(getZoomLevel(0.49)).toBe('SEASON');
  });
  it('returns SHOW below 0.25', () => {
    expect(getZoomLevel(0.24)).toBe('SHOW');
    expect(getZoomLevel(0.1)).toBe('SHOW');
  });
});

describe('nodeDimensions', () => {
  it('sizes SHOW and FILM largest', () => {
    expect(nodeDimensions('SHOW')).toEqual({ w: 180, h: 240 });
    expect(nodeDimensions('FILM')).toEqual({ w: 180, h: 240 });
  });
  it('sizes SEASON and ARC medium', () => {
    expect(nodeDimensions('SEASON')).toEqual({ w: 160, h: 200 });
    expect(nodeDimensions('ARC')).toEqual({ w: 160, h: 200 });
  });
  it('falls back for EPISODE/unknown', () => {
    expect(nodeDimensions('EPISODE')).toEqual({ w: 140, h: 220 });
    expect(nodeDimensions('???')).toEqual({ w: 140, h: 220 });
  });
});

describe('computeLayout', () => {
  const items: LayoutItem[] = [
    { id: 1n, mediaType: 'FILM', chronoOrder: 0, parentId: 0n, laneIndex: 0 },
    { id: 2n, mediaType: 'FILM', chronoOrder: 1, parentId: 0n, laneIndex: 0 },
    { id: 3n, mediaType: 'SHOW', chronoOrder: 2, parentId: 0n, laneIndex: 0 },
  ];

  it('at EPISODE level keeps FILM, drops SHOW', () => {
    const out = computeLayout(items, 1);
    const ids = out.map(n => n.id);
    expect(ids).toContain(1n);
    expect(ids).toContain(2n);
    expect(ids).not.toContain(3n);
  });

  it('at SHOW level keeps SHOW + FILM', () => {
    const out = computeLayout(items, 0.1);
    expect(out.map(n => n.id).sort()).toEqual([1n, 2n, 3n].sort());
  });

  it('positions x by chronoOrder * CHRONO_UNIT_PX', () => {
    const out = computeLayout(items, 1);
    const n2 = out.find(n => n.id === 2n)!;
    expect(n2.x).toBe(1 * CHRONO_UNIT_PX);
  });

  it('returns empty for no items', () => {
    expect(computeLayout([], 1)).toEqual([]);
  });
});
