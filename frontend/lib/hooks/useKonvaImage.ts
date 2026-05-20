'use client';
import { useEffect, useState } from 'react';

type ImageState =
  | { status: 'loading'; image: null }
  | { status: 'loaded';  image: HTMLImageElement }
  | { status: 'error';   image: null };

const cache = new Map<string, HTMLImageElement>();

export function useKonvaImage(src: string | null | undefined): ImageState {
  const [state, setState] = useState<ImageState>({ status: 'loading', image: null });

  useEffect(() => {
    if (!src) { setState({ status: 'error', image: null }); return; }
    if (cache.has(src)) {
      setState({ status: 'loaded', image: cache.get(src)! });
      return;
    }
    setState({ status: 'loading', image: null });
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload  = () => { cache.set(src, img); setState({ status: 'loaded', image: img }); };
    img.onerror = () => setState({ status: 'error', image: null });
    img.src = src;
    return () => { img.onload = null; img.onerror = null; };
  }, [src]);

  return state;
}