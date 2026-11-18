import { readFileSync } from 'node:fs';

const TYPES_PATH = new URL('../src/shared/supabase/database.types.ts', import.meta.url);

/** Reads the generated types (whose indentation is irregular, so tables are found by their `Row` block), so a new table is covered automatically after `db:types`. */
export function parsePublicTables(typesText: string): string[] {
  const start = typesText.indexOf('"public": {');
  const tablesStart = typesText.indexOf('Tables: {', start);
  const viewsStart = typesText.indexOf('Views: {', tablesStart);
  if (start === -1 || tablesStart === -1 || viewsStart === -1) {
    throw new Error('Could not find public.Tables in database.types.ts.');
  }
  const block = typesText.slice(tablesStart, viewsStart);
  return [...block.matchAll(/"([a-z0-9_]+)": \{\s+Row: \{/g)].map((match) => match[1]!).sort();
}

export function readPublicTables(): string[] {
  return parsePublicTables(readFileSync(TYPES_PATH, 'utf8'));
}
