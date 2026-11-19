'use client';

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react';

export type HeaderHintProps = {
  /** The visible title, usually a column head. */
  children: ReactNode;
  /** Plain-language explanation shown on hover and keyboard focus. */
  hint: string;
  /** Open the tip to the left of the title's right edge, for titles near the end of a row. */
  alignEnd?: boolean;
  /** Media query under which the title stops being a tab stop (e.g. the head is visually hidden). */
  unfocusableWhen?: string;
};

function useMediaQuery(query: string | undefined): boolean {
  const supported = typeof window !== 'undefined' && typeof window.matchMedia === 'function';
  const active = query !== undefined && supported;
  return useSyncExternalStore(
    (notify) => {
      if (!active) return () => undefined;
      const list = window.matchMedia(query);
      list.addEventListener('change', notify);
      return () => list.removeEventListener('change', notify);
    },
    () => (active ? window.matchMedia(query).matches : false),
    () => false,
  );
}

export function HeaderHint({ children, hint, alignEnd = false, unfocusableWhen }: HeaderHintProps) {
  const tipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const skipFocus = useMediaQuery(unfocusableWhen);
  const reopen = () => setDismissed(false);

  return (
    <span
      className={alignEnd ? 'gb-header-hint gb-header-hint--end' : 'gb-header-hint'}
      data-dismissed={dismissed}
      onMouseLeave={reopen}
      onBlur={reopen}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setDismissed(true);
      }}
    >
      <button
        type="button"
        className="gb-header-hint__trigger"
        aria-describedby={tipId}
        tabIndex={skipFocus ? -1 : 0}
      >
        {children}
      </button>
      <span role="tooltip" id={tipId} className="gb-header-hint__tip">
        {hint}
      </span>
    </span>
  );
}
