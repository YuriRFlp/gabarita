import type { DbClient } from '@/shared/supabase';
import {
  INCIDENCE_VALUES,
  type Exam,
  type Incidence,
  type IncidenceValue,
  type Topic,
  type TopicMapSource,
  type TopicPerformance,
} from '../domain';

export type LoadResult<T> = { ok: true; value: T } | { ok: false; error: 'load_failed' };

const LOAD_FAILED = { ok: false, error: 'load_failed' } as const;

function toIncidenceValue(value: number): IncidenceValue | null {
  return INCIDENCE_VALUES.find((allowed) => allowed === value) ?? null;
}

/**
 * Reads everything the topic map needs in four parallel queries. Any failure, or a value outside
 * the domain contract, yields `load_failed` without technical detail; the detail goes to the log.
 */
export async function readTopicMapSource(
  client: DbClient,
  userId: string,
): Promise<LoadResult<TopicMapSource>> {
  try {
    const [topics, exams, incidences, performance] = await Promise.all([
      client
        .from('topics')
        .select('id, name, category, profile, phase, sort_order, subtopics(id, name, sort_order)'),
      client.from('exams').select('id, court, year, target_weight, active, exam_boards(name)'),
      client.from('incidences').select('exam_id, topic_id, value'),
      client.from('v_topic_performance').select('topic_id, answered, firm_correct').eq('user_id', userId),
    ]);

    const failure = topics.error ?? exams.error ?? incidences.error ?? performance.error;
    if (failure || !topics.data || !exams.data || !incidences.data || !performance.data) {
      console.error('readTopicMapSource: read failed', failure);
      return LOAD_FAILED;
    }

    const mappedIncidences: Incidence[] = [];
    for (const row of incidences.data) {
      const value = toIncidenceValue(row.value);
      if (value === null) {
        console.error('readTopicMapSource: unexpected incidence value', row);
        return LOAD_FAILED;
      }
      mappedIncidences.push({ examId: row.exam_id, topicId: row.topic_id, value });
    }

    const mappedTopics: Topic[] = topics.data.map((row) => ({
      id: row.id,
      name: row.name,
      category: row.category,
      profile: row.profile,
      phase: row.phase,
      sortOrder: row.sort_order,
      subtopics: row.subtopics.map((subtopic) => ({
        id: subtopic.id,
        name: subtopic.name,
        sortOrder: subtopic.sort_order,
      })),
    }));

    const mappedExams: Exam[] = [];
    for (const row of exams.data) {
      if (!row.exam_boards) {
        console.error('readTopicMapSource: exam without exam board', row.id);
        return LOAD_FAILED;
      }
      mappedExams.push({
        id: row.id,
        court: row.court,
        year: row.year,
        examBoardName: row.exam_boards.name,
        targetWeight: row.target_weight,
        active: row.active,
      });
    }

    const mappedPerformance: TopicPerformance[] = [];
    for (const row of performance.data) {
      // The view columns are typed as nullable by the generator; a null topic is not a row to use.
      if (row.topic_id === null || row.answered === null || row.firm_correct === null) continue;
      mappedPerformance.push({
        topicId: row.topic_id,
        answered: row.answered,
        firmCorrect: row.firm_correct,
      });
    }

    return {
      ok: true,
      value: {
        topics: mappedTopics,
        exams: mappedExams,
        incidences: mappedIncidences,
        performance: mappedPerformance,
      },
    };
  } catch (error) {
    console.error('readTopicMapSource: unexpected failure', error);
    return LOAD_FAILED;
  }
}
