import type { IncidenceValue, TopicProfile } from '../domain';

const PERCENT = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 0 });

/** Mastery as a whole percentage ("70%"). */
export function formatPercent(value: number): string {
  return PERCENT.format(Math.min(1, Math.max(0, value)));
}

/** "TRF-4 (RS/SC/PR)" becomes "TRF-4". */
export function shortCourt(court: string): string {
  const index = court.indexOf(' (');
  return index === -1 ? court : court.slice(0, index);
}

export const PROFILE_LABELS: Record<TopicProfile, string> = {
  systems: 'Sistemas',
  infra: 'Infra',
  common: 'Comum',
};

// Labels from meta.incidence_scale of the taxonomy JSON (ADR-004); they are not in the database.
export const INCIDENCE_LONG_LABELS: Record<IncidenceValue, string> = {
  1: 'cobrado com profundidade',
  0.5: 'parcial ou em nível de noções',
  0: 'ausente',
};

export const INCIDENCE_SHORT_LABELS: Record<IncidenceValue, string> = {
  1: 'Profundidade',
  0.5: 'Noções',
  0: 'Ausente',
};

export function bubbleFillFor(value: IncidenceValue): 'empty' | 'half' | 'filled' {
  if (value === 1) return 'filled';
  if (value === 0.5) return 'half';
  return 'empty';
}

const WEIGHT_NUMBER = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Thousandths as the number typed in a weight field, without "%" ("177" becomes "17,7"). */
export function formatWeightUnits(units: number): string {
  return WEIGHT_NUMBER.format(units / 10);
}

/** A gap in percentage points, from thousandths: "3 pontos", "0,5 ponto", "1 ponto". */
export function formatPoints(units: number): string {
  const points = Math.abs(units) / 10;
  return `${WEIGHT_NUMBER.format(points)} ${points <= 1 ? 'ponto' : 'pontos'}`;
}
