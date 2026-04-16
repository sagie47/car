import type { Metadata } from 'next';
import { IBM_Plex_Mono, Space_Grotesk } from 'next/font/google';
import type { PropsWithChildren } from 'react';
import { AppShell } from '../components/app-shell';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin']
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-ibm-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500']
});

export const metadata: Metadata = {
  title: 'LotPilot Dealer Console',
  description: 'Dealer-facing beta app for LotPilot inventory reliability workflows.'
};

export default function RootLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
