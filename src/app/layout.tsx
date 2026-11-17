import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { fontClasses } from '@/shared/ui/fonts';
import { themeAttribute, readThemePreference } from '@/modules/settings';
import '@/shared/ui/styles/global.css';

export const metadata: Metadata = {
  title: { default: 'Gabarita', template: '%s · Gabarita' },
  description: 'Plataforma de estudos para concursos de TI em tribunais.',
  icons: { icon: '/brand/gabarita-symbol.svg', apple: '/brand/gabarita-app-icon-512.png' },
};

export const viewport: Viewport = { width: 'device-width', initialScale: 1 };

export default async function RootLayout({ children }: { children: ReactNode }) {
  const theme = themeAttribute(await readThemePreference());
  return (
    <html lang="pt-BR" data-theme={theme} className={fontClasses}>
      <body className="gb-root">{children}</body>
    </html>
  );
}
