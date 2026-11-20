'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => undefined;

/** False on the server and in the first client render, true after hydration (JavaScript running). */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
