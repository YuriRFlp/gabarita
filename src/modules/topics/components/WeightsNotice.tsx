import Link from 'next/link';
import { Notice } from '@/shared/ui';
import { formatShare } from '@/shared/utils/format';
import { WEIGHTS_SETTINGS_HREF } from '../actions/exam-weights-schema';
import { dismissWeightsNotice } from '../actions/dismiss-weights-notice';
import { TOTAL_WEIGHT_UNITS, type ExamWeightsSummary } from '../domain';

/**
 * Tells the reader that priority is not computed from the seed weights. A total away from 100%
 * wins over "custom" because it also explains why priorities leave the 0 to 100% scale.
 * Closing it is remembered per browser by the weight set's fingerprint (SPEC-005 CA-35): it stays
 * closed until the weights change. Default weights have no fingerprint, so there a total away from
 * 100% (a seed change) shows the notice every time, as the user did not choose anything to dismiss.
 */
export function WeightsNotice({
  weights,
  dismissedFingerprint = null,
  className,
}: {
  weights: ExamWeightsSummary;
  /** Fingerprint of the weight set whose notice this browser already closed. */
  dismissedFingerprint?: string | null;
  className?: string;
}) {
  const offScale = weights.activeTotal !== TOTAL_WEIGHT_UNITS;
  if (!offScale && weights.mode === 'default') return null;

  const { fingerprint } = weights;
  if (fingerprint !== null && fingerprint === dismissedFingerprint) return null;

  const notice = (
    <Notice
      kind="info"
      onDismiss={fingerprint === null ? undefined : dismissWeightsNotice.bind(null, fingerprint)}
    >
      <p>
        {offScale
          ? `Os pesos dos concursos ativos somam ${formatShare(weights.activeTotal / TOTAL_WEIGHT_UNITS)}; as prioridades ficam fora da escala de 0 a 100%.`
          : 'Pesos personalizados em uso.'}{' '}
        <Link href={WEIGHTS_SETTINGS_HREF}>Configurações</Link>
      </p>
    </Notice>
  );
  return className === undefined ? notice : <div className={className}>{notice}</div>;
}
