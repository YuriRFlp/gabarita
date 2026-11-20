'use client';

import { CircleAlert, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, type FormEventHandler } from 'react';
import { ActionHint, Button, Field, Notice } from '@/shared/ui';
import { formatShare } from '@/shared/utils/format';
import {
  INITIAL_EXAM_WEIGHTS_STATE,
  WEIGHT_FIELD_PREFIX,
  sumWeightInputs,
  type ExamWeightsFormState,
} from '../actions/exam-weights-schema';
import { TOTAL_WEIGHT_UNITS, type ExamWeightRow } from '../domain';
import { formatPoints, formatWeightUnits, shortCourt } from './format';

type SaveAction = (
  previous: ExamWeightsFormState,
  formData: FormData,
) => Promise<ExamWeightsFormState>;

export type ExamWeightsFormProps = {
  rows: ReadonlyArray<ExamWeightRow>;
  /** False while the restore confirmation takes the place of the buttons. */
  showActions?: boolean;
  /** True after a restore: the earlier save result no longer describes the page. */
  hideResult?: boolean;
  /** A Server Action received from a Server Component, so the form also posts without JavaScript. */
  action: SaveAction;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

type Total = { text: string; label: string; ok: boolean };

const BLOCKED_HINT = 'A soma dos pesos deve ser 100%.';

function describeTotal(units: number | null): Total {
  if (units === null) return { text: '—', label: 'Há valores inválidos', ok: false };
  const text = formatShare(units / TOTAL_WEIGHT_UNITS);
  if (units === TOTAL_WEIGHT_UNITS) return { text, label: 'Soma correta', ok: true };
  const gap = formatPoints(units - TOTAL_WEIGHT_UNITS);
  const label =
    units > TOTAL_WEIGHT_UNITS
      ? `${gap} acima de 100%`
      : `${units === TOTAL_WEIGHT_UNITS - 10 ? 'Falta' : 'Faltam'} ${gap}`;
  return { text, label, ok: false };
}

function savedValues(rows: ReadonlyArray<ExamWeightRow>): Record<string, string> {
  return Object.fromEntries(
    rows.map(({ exam, weight }) => [
      exam.id,
      weight === null ? '' : formatWeightUnits(Math.round(weight * TOTAL_WEIGHT_UNITS)),
    ]),
  );
}

export function ExamWeightsForm({
  rows,
  showActions = true,
  hideResult = false,
  action,
  onSubmit,
}: ExamWeightsFormProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_EXAM_WEIGHTS_STATE);
  const summary = useRef<HTMLDivElement>(null);

  const stored = savedValues(rows);
  const storedKey = JSON.stringify(stored);
  // After a save the server sends the new weights (e.g. the rebalanced ones); on a failed submit the
  // typed values stay, and without JavaScript they come back in the action state.
  const [values, setValues] = useState<Record<string, string>>(() =>
    state.status === 'error' ? { ...stored, ...state.values } : stored,
  );
  const [seenKey, setSeenKey] = useState(storedKey);
  if (seenKey !== storedKey) {
    setSeenKey(storedKey);
    setValues(stored);
  }

  useEffect(() => {
    if (state.status === 'error') summary.current?.focus();
  }, [state]);

  const total = describeTotal(sumWeightInputs(values));
  const fieldErrors = state.status === 'error' && !hideResult ? state.fieldErrors : {};
  const StatusIcon = total.ok ? CircleCheck : CircleAlert;
  // The server still validates; this only keeps a known-bad sum from being sent.
  const saveBlocked = !total.ok;

  return (
    <form action={submit} onSubmit={onSubmit} className="gb-form" aria-busy={pending}>
      {state.status === 'error' && !hideResult ? (
        <Notice kind="error" tabIndex={-1} ref={summary} resetKey={state}>
          <p>{state.message}</p>
        </Notice>
      ) : null}
      {state.status === 'saved' && !hideResult ? (
        <Notice kind="success" resetKey={state}>
          <p>
            {state.message} <Link href="/topics">Ver o mapa do edital</Link>
          </p>
        </Notice>
      ) : null}

      <table className="gb-weight-table">
        <caption>Pesos dos concursos</caption>
        <thead>
          <tr>
            <th scope="col">Concurso</th>
            <th scope="col">Padrão</th>
            <th scope="col">Peso</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ exam, defaultWeight }) => {
            const id = `weight-${exam.id}`;
            const error = fieldErrors[exam.id];
            return (
              <tr key={exam.id}>
                <th scope="row">
                  <span className="gb-weight-table__exam">
                    {shortCourt(exam.court)}
                    <small>
                      {exam.examBoardName} {exam.year}
                    </small>
                  </span>
                </th>
                <td className="gb-weight-table__default">{formatShare(defaultWeight)}</td>
                <td>
                  <div className="gb-weight-table__input">
                    <Field
                      id={id}
                      name={`${WEIGHT_FIELD_PREFIX}${exam.id}`}
                      label={`Peso do ${exam.court}, em porcentagem`}
                      hideLabel
                      suffix="%"
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      error={error}
                      value={values[exam.id] ?? ''}
                      onChange={(event) => {
                        const next = event.target.value;
                        setValues((current) => ({ ...current, [exam.id]: next }));
                      }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={2}>
              Total
            </th>
            <td>
              <div className="gb-weight-table__total">
                <span className="gb-weight-table__total-number">
                  {total.text.replace(/%$/, '')}
                </span>
                {total.text.endsWith('%') ? (
                  <span className="gb-weight-table__total-suffix" aria-hidden="true">
                    %
                  </span>
                ) : null}
              </div>
            </td>
          </tr>
        </tfoot>
      </table>

      <div className="gb-weight-table__live" aria-live="polite" aria-atomic="true">
        <span
          className={`gb-weight-table__status gb-weight-table__status--${total.ok ? 'ok' : 'off'}`}
        >
          <StatusIcon aria-hidden="true" strokeWidth={2} />
          {/* The number sits in the table; the live region repeats it so the update is heard whole. */}
          {total.text === '—' ? null : (
            <span className="gb-visually-hidden">{`${total.text}: `}</span>
          )}
          {total.label}
        </span>
      </div>

      {showActions ? (
        <div className="gb-form__actions">
          <ActionHint hint={BLOCKED_HINT} active={saveBlocked}>
            {(describedBy) => (
              <Button
                type="submit"
                name="intent"
                value="save"
                disabled={pending}
                aria-disabled={saveBlocked ? 'true' : undefined}
                aria-describedby={describedBy['aria-describedby']}
                onClick={(event) => {
                  if (saveBlocked) event.preventDefault();
                }}
              >
                Salvar
              </Button>
            )}
          </ActionHint>
          <Button
            type="submit"
            name="intent"
            value="rebalance"
            variant="secondary"
            disabled={pending}
          >
            Ajustar os demais e salvar
          </Button>
        </div>
      ) : null}
      {showActions && saveBlocked ? <p className="gb-form__help">{BLOCKED_HINT}</p> : null}
    </form>
  );
}
