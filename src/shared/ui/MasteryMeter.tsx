import { Bubble } from './Bubble';

const BUBBLE_COUNT = 5;

export type MasteryMeterProps = {
  /** Mastery from 0 to 1; null means the topic has no answers yet. */
  value: number | null;
};

function filledBubbles(value: number | null): number {
  if (value === null) return 0;
  return Math.min(BUBBLE_COUNT, Math.max(0, Math.round(value * BUBBLE_COUNT)));
}

export function MasteryMeter({ value }: MasteryMeterProps) {
  const filled = filledBubbles(value);
  return (
    <span className="gb-mastery">
      <span className="gb-mastery__bubbles" aria-hidden="true">
        {Array.from({ length: BUBBLE_COUNT }, (_, index) => (
          <Bubble key={index} size="small" fill={index < filled ? 'filled' : 'empty'} />
        ))}
      </span>
      {value === null ? (
        <span>Sem respostas</span>
      ) : (
        <strong>{Math.round(Math.min(1, Math.max(0, value)) * 100)}%</strong>
      )}
    </span>
  );
}
