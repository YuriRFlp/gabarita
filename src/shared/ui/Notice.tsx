import { CircleAlert, CircleCheck } from 'lucide-react';
import type { ReactNode, Ref } from 'react';

export type NoticeProps = {
  kind: 'error' | 'success';
  children: ReactNode;
  id?: string;
  tabIndex?: number;
  ref?: Ref<HTMLDivElement>;
};

export function Notice({ kind, children, id, tabIndex, ref }: NoticeProps) {
  const Icon = kind === 'error' ? CircleAlert : CircleCheck;
  return (
    <div
      ref={ref}
      id={id}
      tabIndex={tabIndex}
      role={kind === 'error' ? 'alert' : 'status'}
      className={`gb-notice gb-notice--${kind}`}
    >
      <Icon aria-hidden="true" strokeWidth={2} />
      <div>{children}</div>
    </div>
  );
}
