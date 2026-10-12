import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Rubik } from 'next/font/google';
import '@petty-tab/art/art.css';
import './globals.css';

const rubik = Rubik({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-rubik',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Petty Tab',
  description: 'Keep score of the little things. Settle up on Sunday.',
  // iPhone: Home Screen icon and standalone launch (spec §12: push only works from the Home Screen there).
  icons: { apple: '/icons/180' },
  appleWebApp: { capable: true, title: 'Petty Tab', statusBarStyle: 'default' },
};

// --linen; the browser chrome around the app.
export const viewport: Viewport = { themeColor: '#f3ead9' };

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={rubik.variable}>
      <body className="font-sans">
        {/* Ink texture for the GUILTY / APPEALED stamps (design.md §5), referenced as url(#grunge). */}
        <svg width="0" height="0" className="absolute" aria-hidden="true">
          <filter id="grunge" x="-5%" y="-10%" width="110%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.09 0.13" numOctaves={2} seed={5} result="n" />
            <feColorMatrix
              in="n"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -5 4.2"
              result="h"
            />
            <feComposite in="SourceGraphic" in2="h" operator="in" />
          </filter>
        </svg>
        {children}
      </body>
    </html>
  );
}
