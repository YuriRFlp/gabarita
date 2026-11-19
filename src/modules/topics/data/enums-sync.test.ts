import { describe, expect, expectTypeOf, it } from 'vitest';
import { Constants, type Database } from '@/shared/supabase/database.types';
import {
  STUDY_PHASES,
  TOPIC_CATEGORIES,
  TOPIC_PROFILES,
  type StudyPhase,
  type TopicCategory,
  type TopicProfile,
} from '../domain';

type DbEnums = Database['public']['Enums'];

describe('CA-11 — domain enums match the generated database enums', () => {
  it('has the same topic_category values, in the same order', () => {
    expect([...TOPIC_CATEGORIES]).toEqual([...Constants.public.Enums.topic_category]);
  });

  it('has the same topic_profile values, in the same order', () => {
    expect([...TOPIC_PROFILES]).toEqual([...Constants.public.Enums.topic_profile]);
  });

  it('has the same study_phase values, in the same order', () => {
    expect([...STUDY_PHASES]).toEqual([...Constants.public.Enums.study_phase]);
  });

  it('has the same types as the database enums', () => {
    expectTypeOf<TopicCategory>().toEqualTypeOf<DbEnums['topic_category']>();
    expectTypeOf<TopicProfile>().toEqualTypeOf<DbEnums['topic_profile']>();
    expectTypeOf<StudyPhase>().toEqualTypeOf<DbEnums['study_phase']>();
  });
});
