import { describe, expect, it } from 'vitest';
import {
  WEIGHT_FIELD_MESSAGE,
  examWeightsFormSchema,
  lockedExceedsTotalMessage,
  readExamWeightsForm,
  readWeightInputs,
  sumNotTotalMessage,
  sumWeightInputs,
  weightFieldErrors,
  weightPercentSchema,
} from './exam-weights-schema';

function form(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(entries)) formData.set(name, value);
  return formData;
}

describe('CA-9 — weight text to thousandths', () => {
  it.each([
    ['40', 400],
    ['2,5', 25],
    ['2.5', 25],
    [' 17,7 ', 177],
    ['0', 0],
    ['100', 1000],
    ['100,0', 1000],
    ['007', 70],
  ])('reads "%s" as %d thousandths', (text, units) => {
    expect(weightPercentSchema.parse(text)).toBe(units);
  });

  it.each(['', '-1', '100,1', '2,55', 'abc', '1e2', '٣', '1000', '2,', ',5', '1 0', '101'])(
    'rejects "%s" with the field message',
    (text) => {
      const result = weightPercentSchema.safeParse(text);

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(WEIGHT_FIELD_MESSAGE);
    },
  );
});

describe('CA-9 — form schema', () => {
  it('reads the intent and the weights by exam id from the FormData', () => {
    const parsed = readExamWeightsForm(
      form({ intent: 'rebalance', 'weight.trt2': '40', 'weight.trt3': '17,7', other: 'x' }),
    );

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ intent: 'rebalance', weights: { trt2: 400, trt3: 177 } });
  });

  it.each(['', 'delete', 'SAVE', 'undefined'])('rejects intent "%s"', (intent) => {
    expect(readExamWeightsForm(form({ intent, 'weight.trt2': '40' })).success).toBe(false);
  });

  it('rejects a missing intent', () => {
    expect(readExamWeightsForm(form({ 'weight.trt2': '40' })).success).toBe(false);
  });

  it.each(['TRT2', 'trt-2', '', 'a'.repeat(65), 'trt 2', "x'; drop table exams;--"])(
    'rejects the exam id "%s"',
    (examId) => {
      expect(
        readExamWeightsForm(form({ intent: 'save', [`weight.${examId}`]: '40' })).success,
      ).toBe(false);
    },
  );

  it('accepts the longest valid exam id and digits and underscores', () => {
    const examId = `a_1${'b'.repeat(61)}`;

    const parsed = examWeightsFormSchema.safeParse({ intent: 'save', weights: { [examId]: '1' } });

    expect(examId).toHaveLength(64);
    expect(parsed.success).toBe(true);
  });

  it('rejects a file where a text is expected', () => {
    const formData = form({ intent: 'save' });
    formData.set('weight.trt2', new File(['40'], 'weight.txt'));

    expect(readExamWeightsForm(formData).success).toBe(false);
  });

  it('keeps what the user typed, as submitted, including invalid values', () => {
    const formData = form({ intent: 'save', 'weight.trt2': ' 4o ', 'weight.trt3': '17,7' });
    formData.set('weight.file', new File(['x'], 'x.txt'));

    expect(readWeightInputs(formData)).toEqual({ trt2: ' 4o ', trt3: '17,7', file: '' });
  });

  it('maps the invalid fields to messages by exam id', () => {
    const parsed = readExamWeightsForm(
      form({ intent: 'save', 'weight.trt2': 'abc', 'weight.trt3': '17,7', 'weight.tjmg': '100,1' }),
    );

    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    expect(weightFieldErrors(parsed.error)).toEqual({
      trt2: WEIGHT_FIELD_MESSAGE,
      tjmg: WEIGHT_FIELD_MESSAGE,
    });
  });
});

describe('sumWeightInputs — live total', () => {
  it('sums the thousandths of every field', () => {
    expect(sumWeightInputs({ trt2: '40', trt3: '17,7', trf6: '11.4' })).toBe(691);
  });

  it('is exactly 1000 for a set that adds up to 100%', () => {
    expect(sumWeightInputs({ a: '99,9', b: '0,1' })).toBe(1000);
  });

  it('is null when any field is invalid, including an empty one', () => {
    expect(sumWeightInputs({ trt2: '40', trt3: 'abc' })).toBeNull();
    expect(sumWeightInputs({ trt2: '40', trt3: '' })).toBeNull();
  });

  it('is 0 without fields', () => {
    expect(sumWeightInputs({})).toBe(0);
  });
});

describe('CA-22, CA-25 — messages', () => {
  it.each([
    [1350, 'A soma dos pesos precisa ser 100%. Agora está em 135%.'],
    [720, 'A soma dos pesos precisa ser 100%. Agora está em 72%.'],
    [995, 'A soma dos pesos precisa ser 100%. Agora está em 99,5%.'],
  ])('sum %d', (total, message) => {
    expect(sumNotTotalMessage(total)).toBe(message);
  });

  it('locked total above 100%', () => {
    expect(lockedExceedsTotalMessage(1350)).toBe(
      'Os pesos alterados já somam 135%, mais que 100%. Reduza algum deles.',
    );
  });
});
