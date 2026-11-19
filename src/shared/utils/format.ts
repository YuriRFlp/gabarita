const SHARE = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/**
 * Priority, urgency, exam weights and contributions as a pt-BR percentage ("98%", "2,5%"): at most
 * one decimal, no trailing zeros. Display only; the domain keeps 0..1 and sorts on the exact value.
 */
export function formatShare(value: number): string {
  return SHARE.format(value);
}
