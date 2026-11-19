/** docs/04 § Escolha do assunto da vez: priority × (1 − mastery). */
export function computeUrgency(priority: number, mastery: number): number {
  return priority * (1 - mastery);
}
