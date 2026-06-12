import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';

// Suppress Radix Dialog aria-describedby warning in test output
const originalWarn = console.warn;
beforeEach(() => {
  console.warn = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Missing `Description`')) return;
    originalWarn(...args);
  };
});
afterEach(() => {
  console.warn = originalWarn;
});

describe('Modal', () => {
  it('renders nothing when open is false', () => {
    const { container } = render(
      <Modal open={false} onOpenChange={() => {}} title="Test">
        <p>Content</p>
      </Modal>,
    );
    expect(screen.queryByText('Test')).not.toBeInTheDocument();
  });

  it('renders title and children when open is true', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="Confirm delete">
        <p>Are you sure?</p>
      </Modal>,
    );
    expect(screen.getByText('Confirm delete')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="T" description="A description">
        <p>X</p>
      </Modal>,
    );
    expect(screen.getByText('A description')).toBeInTheDocument();
  });

  it('does not render description when not provided', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="T">
        <p>X</p>
      </Modal>,
    );
    expect(screen.queryByText('A description')).not.toBeInTheDocument();
  });

  it('renders a close button', () => {
    render(
      <Modal open={true} onOpenChange={() => {}} title="T">
        <p>X</p>
      </Modal>,
    );
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', async () => {
    const onOpenChange = vi.fn();
    render(
      <Modal open={true} onOpenChange={onOpenChange} title="T">
        <p>X</p>
      </Modal>,
    );
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    await userEvent.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
