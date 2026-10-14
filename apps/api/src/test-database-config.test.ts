import { describe, expect, test } from 'bun:test';
import { configuredTestDatabaseUrl } from './test-database-config';

describe('PostgreSQL integration test configuration', () => {
  test('allows local API tests to skip Postgres when no disposable database is configured', () => {
    expect(configuredTestDatabaseUrl({})).toBeUndefined();
  });

  test('fails closed in CI instead of silently skipping persistence tests', () => {
    expect(() => configuredTestDatabaseUrl({ CI: 'true' })).toThrow('CI requires TEST_DATABASE_URL');
    expect(() => configuredTestDatabaseUrl({ CI: 'true', TEST_DATABASE_URL: '   ' })).toThrow('CI requires TEST_DATABASE_URL');
  });

  test('trims and returns the configured disposable database URL', () => {
    expect(configuredTestDatabaseUrl({ CI: 'true', TEST_DATABASE_URL: ' postgresql://localhost/methane_test ' }))
      .toBe('postgresql://localhost/methane_test');
  });
});
