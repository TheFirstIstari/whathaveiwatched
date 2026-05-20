'use client';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, title, description, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 bg-black/40 backdrop-blur-[3px] z-40
                     data-[state=open]:animate-in data-[state=open]:fade-in
                     data-[state=closed]:animate-out data-[state=closed]:fade-out" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                     w-[calc(100vw-2rem)] max-w-md ui-card p-6 z-50 focus:outline-none
                     shadow-[var(--shadow-xl)]
                     data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in
                     data-[state=closed]:animate-out data-[state=closed]:zoom-out-95">
          <div className="mb-4 pr-8">
            <Dialog.Title className="text-base font-semibold text-[var(--text)] tracking-tight">{title}</Dialog.Title>
            {description && (
              <Dialog.Description className="text-xs text-[var(--text-soft)] mt-1 leading-relaxed">{description}</Dialog.Description>
            )}
          </div>
          {children}
          <Dialog.Close
            aria-label="Close"
            className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-[var(--radius-sm)]
                       text-[var(--text-dim)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
