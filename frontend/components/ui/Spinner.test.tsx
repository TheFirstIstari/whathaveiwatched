import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('renders an SVG element', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('has animate-spin in the class attribute', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg')!;
    // In jsdom, SVG className is SVGAnimatedString; use getAttribute
    expect(svg.getAttribute('class')).toContain('animate-spin');
  });

  it('applies default size class', () => {
    const { container } = render(<Spinner />);
    const svg = container.querySelector('svg')!;
    const cls = svg.getAttribute('class')!;
    expect(cls).toContain('w-5');
    expect(cls).toContain('h-5');
  });

  it('accepts a custom className', () => {
    const { container } = render(<Spinner className="w-8 h-8" />);
    const svg = container.querySelector('svg')!;
    const cls = svg.getAttribute('class')!;
    expect(cls).toContain('w-8');
    expect(cls).toContain('h-8');
  });

  it('renders circle and path elements', () => {
    const { container } = render(<Spinner />);
    expect(container.querySelector('circle')).toBeInTheDocument();
    expect(container.querySelector('path')).toBeInTheDocument();
  });
});
