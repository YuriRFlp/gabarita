import type { DbClient } from '@/shared/supabase';
import type { Exam } from '../domain';

const EXAM_COLUMNS = 'id, court, year, target_weight, active, exam_boards(name)';

/** Every exam with its board; `count` lets the caller detect a result cut by the row limit. */
export function selectExams(client: DbClient) {
  return client.from('exams').select(EXAM_COLUMNS, { count: 'exact' });
}

type ExamRow = NonNullable<Awaited<ReturnType<typeof selectExams>>['data']>[number];

/** Null when the exam has no board: the row breaks the contract and the caller fails the load. */
export function toExam(row: ExamRow): Exam | null {
  if (!row.exam_boards) return null;
  return {
    id: row.id,
    court: row.court,
    year: row.year,
    examBoardName: row.exam_boards.name,
    targetWeight: row.target_weight,
    active: row.active,
  };
}
