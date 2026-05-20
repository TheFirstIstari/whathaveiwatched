import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'IHaveWatched',
  description: 'Collaborative media tracking for watchparties',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script: apply dark class before first paint to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html:
          `(function(){try{if(localStorage.getItem('ihw_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`
        }} />
      </head>
      <body className={`${inter.className} bg-gray-50 dark:bg-[#0f0f17]`}>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
