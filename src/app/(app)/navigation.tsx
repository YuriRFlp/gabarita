import { House, MapIcon } from 'lucide-react';
import type { NavigationItem } from '@/shared/ui';

// Numbers follow the MVP module list in docs/01 (00 is the home page).
export const NAVIGATION_ITEMS: ReadonlyArray<NavigationItem> = [
  { number: '00', label: 'Início', href: '/', icon: <House aria-hidden /> },
  { number: '01', label: 'Mapa do edital', href: '/topics', icon: <MapIcon aria-hidden /> },
];
