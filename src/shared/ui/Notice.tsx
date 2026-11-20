import type { ReactNode, Ref } from 'react';
import { DismissibleNotice } from './DismissibleNotice';
import { NoticeFrame } from './NoticeFrame';

export type NoticeProps = {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  id?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
  /**
   * Shows the close button (default). Turn it off only when the notice is part of a flow that
   * needs it, e.g. the question above a confirmation's buttons.
   */
  dismissible?: boolean;
  /** Identity of the result shown (e.g. the action state): a new value shows a closed notice again. */
  resetKey?: unknown;
  /**
   * Called when the reader closes the notice (e.g. to remember it). Pass a Server Action: Notice
   * stays a Server Component and the close button, a Client Component, calls it.
   */
  onDismiss?: () => void | Promise<void>;
};

export function Notice({ dismissible = true, resetKey, ...rest }: NoticeProps) {
  if (!dismissible) return <NoticeFrame {...rest} />;
  return <DismissibleNotice resetKey={resetKey} {...rest} />;
}
