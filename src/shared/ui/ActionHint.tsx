'use client';

import { useId, useState, type ReactNode } from 'react';

export type ActionHintProps = {
  /** Explanation shown on hover and keyboard focus; the tip exists only while `active`. */
  hint: string;
  /** True while the action is blocked and the hint applies. */
  active: boolean;
  /** Receives the `aria-describedby` to put on the blocked control (undefined when inactive). */
  children: (props: { 'aria-describedby': string | undefined }) => ReactNode;
};

/** Wraps a blocked-but-focusable control (aria-disabled) with the same tooltip as HeaderHint. */
export function ActionHint({ hint, active, children }: ActionHintProps) {
  const tipId = useId();
  const [dismissed, setDismissed] = useState(false);
  const reopen = () => setDismissed(false);

  return (
    <span
      className="gb-header-hint gb-action-hint"
      data-dismissed={dismissed}
      onMouseLeave={reopen}
      onBlur={reopen}
      onKeyDown={(event) => {
        if (event.key === 'Escape') setDismissed(true);
      }}
    >
      {children({ 'aria-describedby': active ? tipId : undefined })}
      {active ? (
        <span role="tooltip" id={tipId} className="gb-header-hint__tip">
          {hint}
        </span>
      ) : null}
    </span>
  );
}
