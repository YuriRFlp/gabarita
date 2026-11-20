'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useActionState, useEffect, useRef, type FormEventHandler } from 'react';
import { Button, Notice, useHydrated } from '@/shared/ui';
import {
  ENHANCED_FIELD,
  INITIAL_EXAM_WEIGHTS_STATE,
  RESTORE_HREF,
  RESTORED_MESSAGE,
  WEIGHTS_SETTINGS_HREF,
  type ExamWeightsFormState,
} from '../actions/exam-weights-schema';
import type { ExamWeightsMode } from '../domain';

type RestoreAction = (
  previous: ExamWeightsFormState,
  formData: FormData,
) => Promise<ExamWeightsFormState>;

export type RestoreDefaultWeightsProps = {
  mode: ExamWeightsMode;
  /** `?confirm=restore` in the address: state in the URL, so it works without JavaScript. */
  confirming: boolean;
  /** `?restored=1` in the address: where a restore without JavaScript lands. */
  restored?: boolean;
  /** True after a save: the earlier "restored" message no longer describes the page. */
  hideResult?: boolean;
  /** A Server Action received from a Server Component, so the form also posts without JavaScript. */
  action: RestoreAction;
  onSubmit?: FormEventHandler<HTMLFormElement>;
};

const RESTORED_FROM_ADDRESS: ExamWeightsFormState = { status: 'saved', message: RESTORED_MESSAGE };

// Always mounted by the section, even in default mode, so the "restored" message survives the
// refresh that follows the action.
export function RestoreDefaultWeights({
  mode,
  confirming,
  restored = false,
  hideResult = false,
  action,
  onSubmit,
}: RestoreDefaultWeightsProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_EXAM_WEIGHTS_STATE);
  const router = useRouter();
  const hydrated = useHydrated();
  const question = useRef<HTMLDivElement>(null);
  const failure = useRef<HTMLDivElement>(null);
  const asking = mode === 'custom' && confirming;
  const result = state.status === 'idle' && restored ? RESTORED_FROM_ADDRESS : state;

  useEffect(() => {
    if (asking) question.current?.focus();
  }, [asking]);

  useEffect(() => {
    if (state.status === 'error') failure.current?.focus();
    // The confirmation lives in the address; once done, leave it so a reload does not ask again.
    if (state.status === 'saved') router.replace(WEIGHTS_SETTINGS_HREF);
  }, [state, router]);

  return (
    <>
      {result.status === 'saved' && !hideResult ? (
        <Notice kind="success" resetKey={result}>
          {result.message}
        </Notice>
      ) : null}
      {result.status === 'error' && !hideResult ? (
        <Notice kind="error" tabIndex={-1} ref={failure} resetKey={result}>
          {result.message}
        </Notice>
      ) : null}
      {asking ? (
        <form action={submit} onSubmit={onSubmit} className="gb-form" aria-busy={pending}>
          {hydrated ? <input type="hidden" name={ENHANCED_FIELD} value="1" /> : null}
          <Notice kind="info" tabIndex={-1} ref={question} dismissible={false}>
            <p>Restaurar os pesos padrão? Seus pesos personalizados serão apagados.</p>
          </Notice>
          <div className="gb-form__actions">
            <Button type="submit" disabled={pending}>
              Restaurar pesos padrão
            </Button>
            <Link className="gb-button gb-button--secondary" href={WEIGHTS_SETTINGS_HREF}>
              Cancelar
            </Link>
          </div>
        </form>
      ) : mode === 'custom' ? (
        <Link className="gb-button gb-button--text" href={RESTORE_HREF}>
          Restaurar padrão
        </Link>
      ) : null}
    </>
  );
}
