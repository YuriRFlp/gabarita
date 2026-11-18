import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parsePublicTables, readPublicTables } from './public-tables';

describe('parsePublicTables', () => {
  it('lists only the tables, not views, sorted', () => {
    const text = `"public": {
          Tables: {
            "b_table": {
              Row: {}
            },"a_table": {
              Row: {}
            }
          }
          Views: {
            "v_view": {
              Row: {}
            }
          }`;
    expect(parsePublicTables(text)).toEqual(['a_table', 'b_table']);
  });

  it('accepts digits in table names', () => {
    const text = `"public": {
          Tables: {
            "t2_table": {
              Row: {}
            }
          }
          Views: {`;
    expect(parsePublicTables(text)).toEqual(['t2_table']);
  });

  it('fails when the public schema is missing', () => {
    expect(() => parsePublicTables('export type X = {}')).toThrow();
  });
});

describe('readPublicTables', () => {
  it('finds the 21 tables of public', () => {
    expect(readPublicTables()).toHaveLength(21);
  });

  it('matches the tables covered by supabase/tests/rls.test.sql', () => {
    const sql = readFileSync(new URL('../supabase/tests/rls.test.sql', import.meta.url), 'utf8');
    const lists = [
      ...sql.matchAll(/insert into (?:personal|child|reference)_tables values([^;]*);/g),
    ];
    const covered = lists
      .flatMap((match) => [...match[1]!.matchAll(/\('([a-z_]+)'\)/g)])
      .map((match) => match[1]!)
      .sort();

    expect(readPublicTables()).toEqual(covered);
  });
});
