import type { SQLiteDatabase } from 'expo-sqlite';

import { INITIAL_SCHEMA_SQL } from './schema';

export const DATABASE_VERSION = 1;

type Migration = {
  version: number;
  name: string;
  up: (database: SQLiteDatabase) => Promise<void>;
};

type UserVersionRow = {
  user_version: number;
};

const migrations: Record<number, Migration> = {
  1: {
    version: 1,
    name: 'initial_schema',
    up: async (database) => {
      await database.execAsync(INITIAL_SCHEMA_SQL);
    },
  },
};

export async function getDatabaseUserVersion(
  database: SQLiteDatabase,
): Promise<number> {
  const row = await database.getFirstAsync<UserVersionRow>(
    'PRAGMA user_version;',
  );

  return row?.user_version ?? 0;
}

export async function migrateDatabase(database: SQLiteDatabase): Promise<void> {
  const currentVersion = await getDatabaseUserVersion(database);

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(
      `Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}.`,
    );
  }

  for (
    let nextVersion = currentVersion + 1;
    nextVersion <= DATABASE_VERSION;
    nextVersion += 1
  ) {
    const migration = migrations[nextVersion];

    if (!migration) {
      throw new Error(`Missing database migration for version ${nextVersion}.`);
    }

    await database.withTransactionAsync(async () => {
      await migration.up(database);
      await database.execAsync(`PRAGMA user_version = ${migration.version};`);
    });
  }
}
