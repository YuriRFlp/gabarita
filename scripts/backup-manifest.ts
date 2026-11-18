import { z } from 'zod';
import { MIGRATION_NAME } from './push-migrations.ts';

export const BACKUP_FILES = ['roles.sql', 'schema.sql', 'data.sql'] as const;
export type BackupFile = (typeof BACKUP_FILES)[number];

/** 'public.answers' -> 120, 'auth.users' -> 1 */
export type TableCounts = Record<string, number>;

export const manifestSchema = z.object({
  createdAt: z.iso.datetime(),
  gitCommit: z.string().regex(/^[0-9a-f]{40}$/),
  latestMigration: z.string().regex(MIGRATION_NAME),
  supabaseCliVersion: z.string().min(1),
  files: z.record(
    z.enum(BACKUP_FILES),
    z.object({
      bytes: z.number().int().positive(),
      sha256: z.string().regex(/^[0-9a-f]{64}$/),
    }),
  ),
  rowCounts: z.record(z.string(), z.number().int().nonnegative()),
});

export type BackupManifest = z.infer<typeof manifestSchema>;
