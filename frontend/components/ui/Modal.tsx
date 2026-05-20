'use client';
import * as Dialog from '@radix-ui/react-dialog';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onOpenChange, title, children }: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-40 animate-in fade-in" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
                                    w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-2xl
                                    p-6 z-50 focus:outline-none animate-in zoom-in-95">
          <Dialog.Title className="text-lg font-bold mb-4 text-gray-900 dark:text-gray-100">{title}</Dialog.Title>
          {children}
          <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}