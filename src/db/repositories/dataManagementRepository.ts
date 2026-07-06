import { getReadyDatabase } from '../database';
import { getDatabaseUserVersion } from '../migrations';

const EXPORT_TABLES = [
  'exercises',
  'routines',
  'routine_exercises',
  'routine_sets',
  'workouts',
  'workout_exercises',
  'sets',
  'set_metrics',
] as const;

type ExportTableName = (typeof EXPORT_TABLES)[number];

type SqlExportValue = string | number | null;
type ExportTableRow = Record<string, SqlExportValue>;

type CountRow = {
  count: number | null;
};

type LastWorkoutDateRow = {
  last_workout_date: string | null;
};

export type DatabaseSummary = {
  completed_sets: number;
  completed_workouts: number;
  database_user_version: number;
  last_workout_date: string | null;
  total_exercises: number;
  total_routines: number;
  total_sets: number;
  total_workouts: number;
};

export type ExportDatabaseJson = {
  metadata: {
    app_name: 'Premium Gym Tracker';
    database_user_version: number;
    export_version: 1;
    exported_at: string;
  };
  tables: Record<ExportTableName, ExportTableRow[]>;
};

export type ResetUserDataResult = {
  reset_at: string;
};

export async function getDatabaseVersion(): Promise<number> {
  const database = await getReadyDatabase();
  return getDatabaseUserVersion(database);
}

export async function getDatabaseSummary(): Promise<DatabaseSummary> {
  const database = await getReadyDatabase();

  const totalExercises = await countRows(
    'SELECT COUNT(*) AS count FROM exercises WHERE deleted_at IS NULL;',
  );
  const totalRoutines = await countRows(
    'SELECT COUNT(*) AS count FROM routines WHERE deleted_at IS NULL;',
  );
  const totalWorkouts = await countRows(
    'SELECT COUNT(*) AS count FROM workouts WHERE deleted_at IS NULL;',
  );
  const completedWorkouts = await countRows(
    `
SELECT COUNT(*) AS count
FROM workouts
WHERE status = 'completed'
  AND deleted_at IS NULL;
`,
  );
  const totalSets = await countRows(
    `
SELECT COUNT(s.id) AS count
FROM sets s
INNER JOIN workout_exercises we
  ON we.id = s.workout_exercise_id
  AND we.deleted_at IS NULL
INNER JOIN workouts w
  ON w.id = we.workout_id
  AND w.deleted_at IS NULL
WHERE s.deleted_at IS NULL;
`,
  );
  const completedSets = await countRows(
    `
SELECT COUNT(s.id) AS count
FROM sets s
INNER JOIN workout_exercises we
  ON we.id = s.workout_exercise_id
  AND we.deleted_at IS NULL
INNER JOIN workouts w
  ON w.id = we.workout_id
  AND w.deleted_at IS NULL
WHERE s.is_completed = 1
  AND s.deleted_at IS NULL;
`,
  );
  const lastWorkoutDate = await database.getFirstAsync<LastWorkoutDateRow>(
    `
SELECT MAX(scheduled_date) AS last_workout_date
FROM workouts
WHERE deleted_at IS NULL;
`,
  );
  const databaseUserVersion = await getDatabaseUserVersion(database);

  return {
    completed_sets: completedSets,
    completed_workouts: completedWorkouts,
    database_user_version: databaseUserVersion,
    last_workout_date: lastWorkoutDate?.last_workout_date ?? null,
    total_exercises: totalExercises,
    total_routines: totalRoutines,
    total_sets: totalSets,
    total_workouts: totalWorkouts,
  };
}

export async function exportDatabaseJson(): Promise<ExportDatabaseJson> {
  const database = await getReadyDatabase();
  const databaseUserVersion = await getDatabaseUserVersion(database);
  const tables = {} as Record<ExportTableName, ExportTableRow[]>;

  tables.exercises = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM exercises ORDER BY name COLLATE NOCASE ASC;',
  );
  tables.routines = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM routines ORDER BY created_at ASC;',
  );
  tables.routine_exercises = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM routine_exercises ORDER BY created_at ASC;',
  );
  tables.routine_sets = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM routine_sets ORDER BY created_at ASC;',
  );
  tables.workouts = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM workouts ORDER BY scheduled_date ASC, created_at ASC;',
  );
  tables.workout_exercises = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM workout_exercises ORDER BY created_at ASC;',
  );
  tables.sets = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM sets ORDER BY created_at ASC;',
  );
  tables.set_metrics = await database.getAllAsync<ExportTableRow>(
    'SELECT * FROM set_metrics ORDER BY created_at ASC;',
  );

  return {
    metadata: {
      app_name: 'Premium Gym Tracker',
      database_user_version: databaseUserVersion,
      export_version: 1,
      exported_at: new Date().toISOString(),
    },
    tables,
  };
}

export async function resetUserData(): Promise<ResetUserDataResult> {
  const database = await getReadyDatabase();
  const resetAt = new Date().toISOString();

  await database.withTransactionAsync(async () => {
    await database.runAsync('DELETE FROM set_metrics;');
    await database.runAsync('DELETE FROM sets;');
    await database.runAsync('DELETE FROM workout_exercises;');
    await database.runAsync('DELETE FROM workouts;');
    await database.runAsync('DELETE FROM routine_sets;');
    await database.runAsync('DELETE FROM routine_exercises;');
    await database.runAsync('DELETE FROM routines;');
  });

  return {
    reset_at: resetAt,
  };
}

async function countRows(sql: string): Promise<number> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<CountRow>(sql);

  return row?.count ?? 0;
}
