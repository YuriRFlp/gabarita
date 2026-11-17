import { House } from 'lucide-react';
import type { NavigationItem } from '@/shared/ui';

export const NAVIGATION_ITEMS: ReadonlyArray<NavigationItem> = [
  { label: 'Início', href: '/', icon: <House aria-hidden /> },
];
