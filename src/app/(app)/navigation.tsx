import { House, MapIcon, Settings } from 'lucide-react';
import type { NavigationItem, SecondaryNavigationItem } from '@/shared/ui';

export const NAVIGATION_ITEMS: ReadonlyArray<NavigationItem> = [
  { label: 'Início', href: '/', icon: <House aria-hidden="true" strokeWidth={2} /> },
  {
    label: 'Mapa do edital',
    href: '/topics',
    icon: <MapIcon aria-hidden="true" strokeWidth={2} />,
  },
];

export const SECONDARY_NAVIGATION_ITEMS: ReadonlyArray<SecondaryNavigationItem> = [
  {
    label: 'Configurações',
    href: '/settings',
    icon: <Settings aria-hidden="true" strokeWidth={2} />,
  },
];
