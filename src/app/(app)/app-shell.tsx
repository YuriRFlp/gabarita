'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Shell } from '@/shared/ui';
import { NAVIGATION_ITEMS, SECONDARY_NAVIGATION_ITEMS } from './navigation';

type AppShellProps = { logo: ReactNode; actions: ReactNode; children: ReactNode };

export function AppShell({ logo, actions, children }: AppShellProps) {
  return (
    <Shell
      logo={logo}
      navigation={NAVIGATION_ITEMS}
      secondaryNavigation={SECONDARY_NAVIGATION_ITEMS}
      currentPath={usePathname()}
      actions={actions}
    >
      {children}
    </Shell>
  );
}
