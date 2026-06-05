import type { Metadata } from 'next';
import { JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Toaster } from 'sonner';
import { Providers } from './providers';

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500', '700'] });

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
          `(function(){try{var s=localStorage.getItem('ihw_theme');if(s==='dark')document.documentElement.classList.add('dark')}catch(e){}})();`
        }} />
      </head>
      <body className={jetbrainsMono.className}>
        <Providers>{children}</Providers>
        <Toaster position="bottom-right" richColors theme="system" toastOptions={{ style: { borderRadius: 10 } }} />
      </body>
    </html>
  );
}
