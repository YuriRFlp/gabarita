import type { ReactNode } from 'react';

export type TagProps = {
  variant?: 'default' | 'new' | 'overdue' | 'phase';
  children: ReactNode;
};

export function Tag({ variant = 'default', children }: TagProps) {
  const classes = variant === 'default' ? 'gb-tag' : `gb-tag gb-tag--${variant}`;
  return <span className={classes}>{children}</span>;
}
