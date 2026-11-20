'use client';

import { useState } from 'react';
import type { ExamWeightsFormState } from '../actions/exam-weights-schema';
import type { ExamWeightRow, ExamWeightsMode } from '../domain';
import { ExamWeightsForm } from './ExamWeightsForm';
import { RestoreDefaultWeights } from './RestoreDefaultWeights';

type Action = (previous: ExamWeightsFormState, formData: FormData) => Promise<ExamWeightsFormState>;

export type ExamWeightsEditorProps = {
  rows: ReadonlyArray<ExamWeightRow>;
  mode: ExamWeightsMode;
  confirmRestore: boolean;
  /** `?restored=1` in the address (a restore without JavaScript). */
  restored?: boolean;
  showActions: boolean;
  // Server Actions from a Server Component, handed to useActionState untouched: wrapping them in a
  // client function would drop the progressive enhancement and break the forms without JavaScript.
  saveAction: Action;
  restoreAction: Action;
};

// The save form and the restore form keep separate action states; this keeps only the latest
// result on screen so "saved" and "restored" never show together. The submit event marks which
// one ran without touching the actions themselves.
export function ExamWeightsEditor({
  rows,
  mode,
  confirmRestore,
  restored = false,
  showActions,
  saveAction,
  restoreAction,
}: ExamWeightsEditorProps) {
  const [last, setLast] = useState<'save' | 'restore' | null>(null);

  return (
    <>
      <ExamWeightsForm
        rows={rows}
        showActions={showActions}
        hideResult={last === 'restore'}
        action={saveAction}
        onSubmit={() => setLast('save')}
      />
      <RestoreDefaultWeights
        mode={mode}
        confirming={confirmRestore}
        restored={restored}
        hideResult={last === 'save'}
        action={restoreAction}
        onSubmit={() => setLast('restore')}
      />
    </>
  );
}
