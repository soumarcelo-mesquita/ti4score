import type { Metadata, Viewport } from 'next';
import { Orbitron, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const display = Orbitron({ variable: '--font-display', subsets: ['latin'], weight: ['500', '700', '900'] });
const body = Source_Sans_3({ variable: '--font-body', subsets: ['latin'], weight: ['400', '600', '700'] });

export const metadata: Metadata = {
  title: 'TI4 Placar',
  description: 'Placar de Twilight Imperium IV para a TV, controlado pelo celular',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#020617',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
