import * as SQLite from 'expo-sqlite';

import { migrateDatabase } from './migrations';
import { seedDatabase } from './seed';

const DATABASE_NAME = 'premium_gym_tracker.db';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;
let initializationPromise: Promise<void> | null = null;

export function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initializeDatabase(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = initializeDatabaseOnce().catch((error: unknown) => {
      initializationPromise = null;
      throw error;
    });
  }

  return initializationPromise;
}

export async function getReadyDatabase(): Promise<SQLite.SQLiteDatabase> {
  await initializeDatabase();
  return getDatabase();
}

async function initializeDatabaseOnce(): Promise<void> {
  const database = await getDatabase();

  await database.execAsync('PRAGMA foreign_keys = ON;');
  await migrateDatabase(database);
  await seedDatabase(database);
  await database.execAsync('PRAGMA foreign_keys = ON;');
}
