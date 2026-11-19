import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

export type NoticeProps = {
  kind: 'error' | 'success' | 'info';
  children: ReactNode;
  id?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
};

const ICONS = { error: CircleAlert, success: CircleCheck, info: Info } as const;
// An info notice is part of the page from the start; announcing it as a live region would only
// interrupt the reader.
const ROLES = { error: 'alert', success: 'status', info: undefined } as const;

export function Notice({ kind, children, id, tabIndex, ref }: NoticeProps) {
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
      <div>{children}</div>
    </div>
  );
}
