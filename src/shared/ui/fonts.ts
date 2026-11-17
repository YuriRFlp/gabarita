import { Atkinson_Hyperlegible, JetBrains_Mono, Schibsted_Grotesk } from 'next/font/google';

const displayFont = Schibsted_Grotesk({
  weight: ['600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-face-display',
});

const textFont = Atkinson_Hyperlegible({
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-face-text',
});

const codeFont = JetBrains_Mono({
  weight: ['400', '600'],
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
  variable: '--font-face-code',
});

// Apply on <html>: tokens.css resolves --font-* at :root from these variables.
export const fontClasses = [displayFont.variable, textFont.variable, codeFont.variable].join(' ');
