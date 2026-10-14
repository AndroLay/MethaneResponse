type TestEnvironment = {
  CI?: string;
  TEST_DATABASE_URL?: string;
};

export function configuredTestDatabaseUrl(env: TestEnvironment): string | undefined {
  const databaseUrl = env.TEST_DATABASE_URL?.trim();
  const ciValue = env.CI?.trim().toLowerCase();
  const runningInCi = Boolean(ciValue && !['0', 'false', 'no'].includes(ciValue));

  if (runningInCi && !databaseUrl) {
    throw new Error('CI requires TEST_DATABASE_URL so PostgreSQL persistence integration tests cannot be skipped.');
  }

  return databaseUrl || undefined;
}
