import { EmptyState, Notice, Tag } from '@/shared/ui';
import { formatShare } from '@/shared/utils/format';
import { restoreDefaultWeights } from '../actions/restore-default-weights';
import { saveExamWeights } from '../actions/save-exam-weights';
import { TOTAL_WEIGHT_UNITS, type ExamWeightsSettings } from '../domain';
import { ExamWeightsEditor } from './ExamWeightsEditor';

export type ExamWeightsSectionProps = {
  settings: ExamWeightsSettings;
  /** `?confirm=restore` was in the address. */
  confirmRestore?: boolean;
  /** `?restored=1` was in the address: a restore without JavaScript just finished. */
  restored?: boolean;
};

/**
 * The "Pesos dos concursos" block of the Concursos e pesos section (the page owns the h2). A Server
 * Component, so the Server Actions reach the forms as references that also post without JavaScript.
 */
export function ExamWeightsSection({
  settings,
  confirmRestore = false,
  restored = false,
}: ExamWeightsSectionProps) {
  const { active, inactive, summary } = settings;

  if (active.length === 0 && inactive.length === 0) {
    return (
      <div className="gb-page-section__body">
        <h3 className="gb-page-section__block-title">Pesos dos concursos</h3>
        <EmptyState title="Nenhum concurso carregado." />
      </div>
    );
  }

  const unweighted = active.filter((row) => row.weight === null);
  const offTotal = summary.activeTotal !== TOTAL_WEIGHT_UNITS;

  return (
    <div className="gb-page-section__body">
      <h3 className="gb-page-section__block-title">Pesos dos concursos</h3>
      <p>
        <Tag>{summary.mode === 'custom' ? 'Pesos personalizados' : 'Pesos padrão'}</Tag>
      </p>

      {unweighted.map(({ exam }) => (
        <Notice key={exam.id} kind="info">
          <p>{exam.court} ainda não tem peso definido e conta como 0%.</p>
        </Notice>
      ))}
      {offTotal ? (
        <Notice kind="info">
          <p>
            Os pesos dos concursos ativos somam{' '}
            {formatShare(summary.activeTotal / TOTAL_WEIGHT_UNITS)}. Ajuste e salve para voltar a
            100%.
          </p>
        </Notice>
      ) : null}

      <ExamWeightsEditor
        rows={active}
        mode={summary.mode}
        confirmRestore={confirmRestore}
        restored={restored && summary.mode === 'default'}
        showActions={!(confirmRestore && summary.mode === 'custom')}
        saveAction={saveExamWeights}
        restoreAction={restoreDefaultWeights}
      />

      {inactive.length > 0 ? (
        <div className="gb-page-section__body">
          <h4 className="gb-page-section__block-title">Inativos (não contam na prioridade)</h4>
          <ul>
            {inactive.map((exam) => (
              <li key={exam.id}>
                {exam.court} · {exam.examBoardName} {exam.year} <Tag>Inativo</Tag>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
