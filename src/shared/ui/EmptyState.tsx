import type { ReactNode } from 'react';
import { Bubble } from './Bubble';

export type EmptyStateProps = {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
};

export function EmptyState({ title, children, action }: EmptyStateProps) {
  return (
    <div className="gb-empty-state">
      <Bubble fill="empty" />
      <div className="gb-empty-state__body">
        <p className="gb-empty-state__title">{title}</p>
        {children}
        {action}
      </div>
    </div>
  );
}
