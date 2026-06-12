import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Input } from './Input';

describe('Input', () => {
  it('associates label with input via generated id', () => {
    render(<Input label="Your name" />);
    const input = screen.getByLabelText('Your name');
    expect(input).toBeInTheDocument();
    expect(input.id).toBe('your-name');
  });

  it('shows error text and applies danger border', () => {
    render(<Input label="Email" error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
    expect(screen.getByLabelText('Email').className).toContain('border-[var(--danger)]');
  });

  it('shows hint only when there is no error', () => {
    const { rerender } = render(<Input label="N" hint="A helpful hint" />);
    expect(screen.getByText('A helpful hint')).toBeInTheDocument();
    rerender(<Input label="N" hint="A helpful hint" error="Bad" />);
    expect(screen.queryByText('A helpful hint')).not.toBeInTheDocument();
    expect(screen.getByText('Bad')).toBeInTheDocument();
  });

  it('accepts typed input as a controlled field', async () => {
    function Wrapper() {
      const [v, setV] = useState('');
      return <Input label="Name" value={v} onChange={e => setV(e.target.value)} />;
    }
    render(<Wrapper />);
    const input = screen.getByLabelText('Name') as HTMLInputElement;
    await userEvent.type(input, 'Alice');
    expect(input.value).toBe('Alice');
  });
});
