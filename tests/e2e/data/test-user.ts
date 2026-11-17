// Not a secret: this user only exists in the local Supabase and is recreated on every E2E run.
export const TEST_USER = {
  email: 'test@gabarita.local',
  password: 'local-test-password-123',
} as const;
