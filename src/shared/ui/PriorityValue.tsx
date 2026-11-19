import { formatShare } from '@/shared/utils/format';

export type PriorityValueProps = {
  /** Priority from 0 to 1 (docs/04 § Prioridade). */
  value: number;
};

export function PriorityValue({ value }: PriorityValueProps) {
  const share = Math.min(1, Math.max(0, value));
  return (
    <span className="gb-priority">
      <span>{formatShare(value)}</span>
      <span className="gb-priority__bar" aria-hidden="true">
        <span className="gb-priority__fill" style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  );
}
