import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders its children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Go</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>Nope</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies variant + size + custom className', () => {
    render(<Button variant="danger" size="lg" className="extra">X</Button>);
    const btn = screen.getByRole('button', { name: 'X' });
    expect(btn.className).toContain('bg-[var(--danger)]');
    expect(btn.className).toContain('h-12');
    expect(btn.className).toContain('extra');
  });

  it('uses square icon sizing when icon=true', () => {
    render(<Button icon size="sm" aria-label="icon">i</Button>);
    expect(screen.getByRole('button', { name: 'icon' }).className).toContain('w-8');
  });
});
