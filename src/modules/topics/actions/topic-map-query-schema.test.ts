import { describe, expect, it } from 'vitest';
import { parseTopicMapQuery, topicIdSchema, topicMapQuerySchema } from './topic-map-query-schema';

const DEFAULTS = { view: 'list', category: 'all', profile: 'all', sort: 'urgency' };

describe('CA-12 — parseTopicMapQuery', () => {
  it('uses the defaults when there are no parameters', () => {
    expect(parseTopicMapQuery({})).toEqual(DEFAULTS);
  });

  it('ignores unknown parameters', () => {
    expect(parseTopicMapQuery({ foo: 'bar', page: '2' })).toEqual(DEFAULTS);
  });

  it('keeps every valid value', () => {
    expect(
      parseTopicMapQuery({ view: 'matrix', category: 'general', profile: 'infra', sort: 'name' }),
    ).toEqual({ view: 'matrix', category: 'general', profile: 'infra', sort: 'name' });
  });

  it.each([
    ['view', 'grid', 'list'],
    ['category', 'other', 'all'],
    ['profile', 'ops', 'all'],
    ['sort', 'random', 'urgency'],
  ])('falls back to the default when %s is "%s"', (name, value, fallback) => {
    expect(parseTopicMapQuery({ [name]: value })).toMatchObject({ [name]: fallback });
  });

  it.each([['MATRIX'], [''], [' matrix']])(
    'is case and space sensitive: "%s" is invalid',
    (value) => {
      expect(parseTopicMapQuery({ view: value }).view).toBe('list');
    },
  );

  it('falls back to the default for a repeated parameter, even if every value is valid', () => {
    expect(parseTopicMapQuery({ sort: ['priority', 'name'] }).sort).toBe('urgency');
    expect(parseTopicMapQuery({ sort: ['a', 'b'] }).sort).toBe('urgency');
  });

  it('falls back only the invalid parameter and keeps the valid ones', () => {
    expect(parseTopicMapQuery({ view: 'matrix', sort: 'a' })).toEqual({
      ...DEFAULTS,
      view: 'matrix',
    });
  });

  it('never throws, even for undefined values', () => {
    expect(() => topicMapQuerySchema.parse({})).not.toThrow();
    expect(parseTopicMapQuery({ view: undefined })).toEqual(DEFAULTS);
  });
});

describe('CA-12 — topicIdSchema', () => {
  it.each([['pdpj_stack'], ['a'], ['topic_01'], ['a'.repeat(64)]])('accepts "%s"', (id) => {
    expect(topicIdSchema.safeParse(id).success).toBe(true);
  });

  it.each([
    ['empty', ''],
    ['65 characters', 'a'.repeat(65)],
    ['uppercase', 'Pdpj'],
    ['hyphen', 'pdpj-stack'],
    ['space', 'pdpj stack'],
    ['accent', 'seguranca_é'],
    ['slash', 'a/b'],
    ['dot dot', '..'],
    ['trailing newline', 'pdpj\n'],
  ])('rejects %s', (_label, id) => {
    expect(topicIdSchema.safeParse(id).success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(topicIdSchema.safeParse(undefined).success).toBe(false);
    expect(topicIdSchema.safeParse(['a']).success).toBe(false);
  });
});
