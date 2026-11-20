import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

export type NoticeFrameProps = {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  id?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
  /** Trailing control (the close button of DismissibleNotice). */
  action?: ReactNode;
};

const ICONS = { error: CircleAlert, success: CircleCheck, info: Info } as const;
// An info notice is part of the page from the start; announcing it as a live region would only
// interrupt the reader.
const ROLES = { error: 'alert', success: 'status', info: undefined } as const;

/** Presentation only: no state, safe in server and client trees. Use Notice in screens. */
export function NoticeFrame({ kind, children, id, tabIndex, ref, action }: NoticeFrameProps) {
  const Icon = ICONS[kind];
  return (
    <div
      ref={ref}
      id={id}
      tabIndex={tabIndex}
      role={ROLES[kind]}
      className={`gb-notice gb-notice--${kind}`}
    >
      <Icon aria-hidden="true" strokeWidth={2} />
      <div className="gb-notice__body">{children}</div>
      {action}
    </div>
  );
}
