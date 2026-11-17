import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof envSchema>;

/** Throws an error naming only the invalid variables, never their values. */
export function validateEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;
  const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
  throw new Error(`Missing or invalid environment variables: ${names.join(', ')}.`);
}

// Next only inlines NEXT_PUBLIC_* into the bundle when each variable is read by its literal name.
export function readEnv(): PublicEnv {
  return validateEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
