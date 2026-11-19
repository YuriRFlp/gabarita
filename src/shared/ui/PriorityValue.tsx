const PRIORITY_FORMAT = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export type PriorityValueProps = {
  /** Priority from 0 to 1 (docs/04 § Prioridade). */
  value: number;
};

function formatPriority(value: number): string {
  return PRIORITY_FORMAT.format(value);
}

export function PriorityValue({ value }: PriorityValueProps) {
  const share = Math.min(1, Math.max(0, value));
  return (
    <span className="gb-priority">
      <span>{formatPriority(value)}</span>
      <span className="gb-priority__bar" aria-hidden="true">
        <span className="gb-priority__fill" style={{ width: `${share * 100}%` }} />
      </span>
    </span>
  );
}
