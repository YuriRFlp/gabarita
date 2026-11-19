import { describe, expect, it } from 'vitest';
import { computeUrgency } from './urgency';

describe('computeUrgency — CA-8: priority × (1 − mastery)', () => {
  it('equals the priority when mastery is 0 (topic without answers)', () => {
    expect(computeUrgency(0.89, 0)).toBe(0.89);
  });

  it('is 0 when mastery is 1', () => {
    expect(computeUrgency(0.89, 1)).toBe(0);
  });

  it('is 0.6675 for priority 0.89 and mastery 0.25', () => {
    expect(computeUrgency(0.89, 0.25)).toBeCloseTo(0.6675, 12);
  });

  it('is 0 when the priority is 0, whatever the mastery', () => {
    expect(computeUrgency(0, 0.3)).toBe(0);
  });
});
