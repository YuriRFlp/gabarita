'use client';

import { useActionState, useState } from 'react';
import { Button, CheckboxField, Notice, SelectField, useHydrated } from '@/shared/ui';
import {
  INITIAL_STUDY_TARGET_STATE,
  type StudyTargetFormState,
} from '../actions/study-target-schema';
import type { StudyTarget } from '../domain';

type SaveAction = (
  previous: StudyTargetFormState,
  formData: FormData,
) => Promise<StudyTargetFormState>;

export type StudyTargetFormProps = {
  target: StudyTarget;
  examOptions: ReadonlyArray<{ id: string; label: string }>;
  /** A Server Action received from a Server Component, so the form also posts without JavaScript. */
  action: SaveAction;
};

export function StudyTargetForm({ target, examOptions, action }: StudyTargetFormProps) {
  const [state, submit, pending] = useActionState(action, INITIAL_STUDY_TARGET_STATE);
  // A saved target that is no longer active has no option in the list: start from "Nenhum".
  const savedIsOffered = examOptions.some((option) => option.id === target.targetExamId);
  const [examId, setExamId] = useState(savedIsOffered ? (target.targetExamId ?? '') : '');
  const [published, setPublished] = useState(savedIsOffered && target.targetNoticePublished);
  // Without JavaScript the box stays enabled, so the server can answer with the validation message.
  const hydrated = useHydrated();
  const noTarget = examId === '';

  return (
    <div className="gb-page-section__body">
      <h3 className="gb-page-section__block-title">Concurso-alvo</h3>
      <form action={submit} className="gb-form" aria-busy={pending}>
        {state.status === 'saved' ? (
          <Notice kind="success" resetKey={state}>
            {state.message}
          </Notice>
        ) : null}
        {state.status === 'error' ? (
          <Notice kind="error" resetKey={state}>
            {state.message}
          </Notice>
        ) : null}
        <SelectField
          id="target-exam"
          name="targetExamId"
          label="Concurso-alvo"
          value={examId}
          onChange={(event) => setExamId(event.target.value)}
        >
          <option value="">Nenhum</option>
          {examOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectField>
        <CheckboxField
          id="target-notice-published"
          name="targetNoticePublished"
          label="O edital do concurso-alvo foi publicado"
          hint="O plano do dia só inclui assuntos pós-edital depois que o edital do concurso-alvo for publicado."
          checked={published && !(hydrated && noTarget)}
          disabled={hydrated && noTarget}
          onChange={(event) => setPublished(event.target.checked)}
        />
        <div className="gb-form__actions">
          <Button type="submit" disabled={pending}>
            Salvar concurso-alvo
          </Button>
        </div>
      </form>
    </div>
  );
}
