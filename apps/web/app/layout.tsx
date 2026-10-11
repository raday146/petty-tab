import type { Metadata } from 'next';
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
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="en" className={rubik.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
