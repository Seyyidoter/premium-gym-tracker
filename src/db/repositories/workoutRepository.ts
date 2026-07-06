import { getReadyDatabase } from '../database';
import { createLocalId, nowIso } from '../id';
import type { SQLiteDatabase } from 'expo-sqlite';
import type {
  Exercise,
  ExerciseCategory,
  RoutineSet,
  SetMetrics,
  TrackType,
  Workout,
  WorkoutExercise,
  WorkoutSet,
  WorkoutSetRow,
  WorkoutStatus,
} from '../types';

export type CreateWorkoutInput = {
  id?: string;
  routine_id?: string | null;
  scheduled_date: string;
  start_time?: string | null;
  end_time?: string | null;
  status?: WorkoutStatus;
};

export type CreateWorkoutExerciseInput = {
  id?: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
};

export type WorkoutCompletionSummary = {
  total_sets: number;
  completed_sets: number;
  incomplete_sets: number;
};

export type WorkoutSummary = Workout & {
  routine_name: string | null;
  exercise_count: number;
  set_count: number;
  completed_set_count: number;
};

type RoutineExerciseTemplateRow = {
  id: string;
  exercise_id: string;
  order_index: number;
};

type WorkoutExerciseDetailRow = {
  workout_exercise_id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
  workout_exercise_created_at: string;
  workout_exercise_updated_at: string;
  workout_exercise_deleted_at: string | null;
  exercise_slug: string;
  exercise_asset_key: string;
  exercise_name: string;
  exercise_category: ExerciseCategory;
  exercise_primary_muscle: string;
  exercise_secondary_muscles: string | null;
  exercise_track_type: TrackType;
  exercise_instructions: string | null;
  exercise_created_at: string;
  exercise_updated_at: string;
  exercise_deleted_at: string | null;
};

type WorkoutSetDetailRow = WorkoutSetRow & {
  weight: number | null;
  reps: number | null;
  distance_km: number | null;
  incline: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  notes: string | null;
  metrics_created_at: string | null;
  metrics_updated_at: string | null;
  metrics_deleted_at: string | null;
};

type SetWorkoutRow = {
  set_id: string;
  workout_id: string;
  workout_exercise_id: string;
  is_completed: 0 | 1;
};

type MaxSetNumberRow = {
  max_set_number: number | null;
};

export type WorkoutSetMetricsPayload = {
  weight?: number | null;
  reps?: number | null;
  distance_km?: number | null;
  incline?: number | null;
  duration_seconds?: number | null;
};

export type WorkoutSetDetails = WorkoutSet & {
  metrics: SetMetrics | null;
};

export type WorkoutExerciseDetails = WorkoutExercise & {
  exercise: Exercise;
  sets: WorkoutSetDetails[];
};

export type WorkoutDetails = Workout & {
  exercises: WorkoutExerciseDetails[];
};

export async function createWorkout(
  input: CreateWorkoutInput,
): Promise<Workout> {
  const database = await getReadyDatabase();
  const id = input.id ?? createLocalId();
  const timestamp = nowIso();

  await database.runAsync(
    `
INSERT INTO workouts (
  id,
  routine_id,
  scheduled_date,
  start_time,
  end_time,
  status,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL);
`,
    id,
    input.routine_id ?? null,
    input.scheduled_date,
    input.start_time ?? null,
    input.end_time ?? null,
    input.status ?? 'planned',
    timestamp,
    timestamp,
  );

  const workout = await getWorkoutById(id);

  if (!workout) {
    throw new Error('Workout was not created.');
  }

  return workout;
}

export async function createWorkoutFromRoutine(
  routineId: string,
  scheduledDate: string,
): Promise<Workout> {
  const database = await getReadyDatabase();
  const routine = await database.getFirstAsync<{ id: string }>(
    `
SELECT id
FROM routines
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    routineId,
  );

  if (!routine) {
    throw new Error('Routine was not found.');
  }

  const routineExercises = await database.getAllAsync<RoutineExerciseTemplateRow>(
    `
SELECT id, exercise_id, order_index
FROM routine_exercises
WHERE routine_id = ? AND deleted_at IS NULL
ORDER BY order_index ASC;
`,
    routineId,
  );

  if (routineExercises.length === 0) {
    throw new Error('Routine has no exercises.');
  }

  const workoutId = createLocalId();
  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
INSERT INTO workouts (
  id,
  routine_id,
  scheduled_date,
  start_time,
  end_time,
  status,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, NULL, NULL, 'planned', ?, ?, NULL);
`,
      workoutId,
      routineId,
      scheduledDate,
      timestamp,
      timestamp,
    );

    for (const routineExercise of routineExercises) {
      const workoutExerciseId = createLocalId();

      await database.runAsync(
        `
INSERT INTO workout_exercises (
  id,
  workout_id,
  exercise_id,
  order_index,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, NULL);
`,
        workoutExerciseId,
        workoutId,
        routineExercise.exercise_id,
        routineExercise.order_index,
        timestamp,
        timestamp,
      );

      const routineSets = await database.getAllAsync<RoutineSet>(
        `
SELECT *
FROM routine_sets
WHERE routine_exercise_id = ? AND deleted_at IS NULL
ORDER BY set_number ASC;
`,
        routineExercise.id,
      );

      for (const routineSet of routineSets) {
        const setId = createLocalId();

        await database.runAsync(
          `
INSERT INTO sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  is_completed,
  completed_at,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, 'normal', 0, NULL, ?, ?, NULL);
`,
          setId,
          workoutExerciseId,
          routineSet.set_number,
          timestamp,
          timestamp,
        );

        await database.runAsync(
          `
INSERT INTO set_metrics (
  set_id,
  weight,
  reps,
  distance_km,
  incline,
  duration_seconds,
  rpe,
  notes,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL);
`,
          setId,
          routineSet.target_weight,
          routineSet.target_reps,
          routineSet.target_distance_km,
          routineSet.target_incline,
          routineSet.target_duration_seconds,
          timestamp,
          timestamp,
        );
      }
    }
  });

  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    throw new Error('Workout was not created from routine.');
  }

  return workout;
}

export async function getWorkoutById(id: string): Promise<Workout | null> {
  const database = await getReadyDatabase();

  return database.getFirstAsync<Workout>(
    `
SELECT *
FROM workouts
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );
}

export async function getWorkoutDetails(
  workoutId: string,
): Promise<WorkoutDetails | null> {
  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    return null;
  }

  const database = await getReadyDatabase();
  const rows = await database.getAllAsync<WorkoutExerciseDetailRow>(
    `
SELECT
  we.id AS workout_exercise_id,
  we.workout_id,
  we.exercise_id,
  we.order_index,
  we.created_at AS workout_exercise_created_at,
  we.updated_at AS workout_exercise_updated_at,
  we.deleted_at AS workout_exercise_deleted_at,
  e.slug AS exercise_slug,
  e.asset_key AS exercise_asset_key,
  e.name AS exercise_name,
  e.category AS exercise_category,
  e.primary_muscle AS exercise_primary_muscle,
  e.secondary_muscles AS exercise_secondary_muscles,
  e.track_type AS exercise_track_type,
  e.instructions AS exercise_instructions,
  e.created_at AS exercise_created_at,
  e.updated_at AS exercise_updated_at,
  e.deleted_at AS exercise_deleted_at
FROM workout_exercises we
INNER JOIN exercises e ON e.id = we.exercise_id
WHERE we.workout_id = ?
  AND we.deleted_at IS NULL
  AND e.deleted_at IS NULL
ORDER BY we.order_index ASC;
`,
    workoutId,
  );

  const exercises: WorkoutExerciseDetails[] = [];

  for (const row of rows) {
    const sets = await listWorkoutSetDetails(row.workout_exercise_id);

    exercises.push({
      id: row.workout_exercise_id,
      workout_id: row.workout_id,
      exercise_id: row.exercise_id,
      order_index: row.order_index,
      created_at: row.workout_exercise_created_at,
      updated_at: row.workout_exercise_updated_at,
      deleted_at: row.workout_exercise_deleted_at,
      exercise: {
        id: row.exercise_id,
        slug: row.exercise_slug,
        asset_key: row.exercise_asset_key,
        name: row.exercise_name,
        category: row.exercise_category,
        primary_muscle: row.exercise_primary_muscle,
        secondary_muscles: parseSecondaryMuscles(
          row.exercise_secondary_muscles,
        ),
        track_type: row.exercise_track_type,
        instructions: row.exercise_instructions,
        created_at: row.exercise_created_at,
        updated_at: row.exercise_updated_at,
        deleted_at: row.exercise_deleted_at,
      },
      sets,
    });
  }

  return {
    ...workout,
    exercises,
  };
}

export async function updateSetMetrics(
  setId: string,
  payload: WorkoutSetMetricsPayload,
): Promise<SetMetrics> {
  const database = await getReadyDatabase();
  const timestamp = nowIso();

  await database.runAsync(
    `
INSERT INTO set_metrics (
  set_id,
  weight,
  reps,
  distance_km,
  incline,
  duration_seconds,
  rpe,
  notes,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?, NULL)
ON CONFLICT(set_id) DO UPDATE SET
  weight = excluded.weight,
  reps = excluded.reps,
  distance_km = excluded.distance_km,
  incline = excluded.incline,
  duration_seconds = excluded.duration_seconds,
  updated_at = excluded.updated_at,
  deleted_at = NULL;
`,
    setId,
    payload.weight ?? null,
    payload.reps ?? null,
    payload.distance_km ?? null,
    payload.incline ?? null,
    payload.duration_seconds ?? null,
    timestamp,
    timestamp,
  );

  const metrics = await database.getFirstAsync<SetMetrics>(
    `
SELECT *
FROM set_metrics
WHERE set_id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );

  if (!metrics) {
    throw new Error('Set metrics were not saved.');
  }

  return metrics;
}

export async function toggleSetCompleted(
  setId: string,
  isCompleted: boolean,
): Promise<WorkoutStatus> {
  const database = await getReadyDatabase();
  const setContext = await getSetWorkoutContext(setId);

  await database.runAsync(
    `
UPDATE sets
SET is_completed = ?, completed_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
    isCompleted ? 1 : 0,
    isCompleted ? nowIso() : null,
    nowIso(),
    setId,
  );

  return recomputeWorkoutStatus(setContext.workout_id);
}

export async function addWorkoutSet(
  workoutExerciseId: string,
): Promise<WorkoutSetDetails> {
  const database = await getReadyDatabase();
  const workoutExercise = await database.getFirstAsync<{
    id: string;
    workout_id: string;
  }>(
    `
SELECT id, workout_id
FROM workout_exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    workoutExerciseId,
  );

  if (!workoutExercise) {
    throw new Error('Workout exercise was not found.');
  }

  const row = await database.getFirstAsync<MaxSetNumberRow>(
    `
SELECT MAX(set_number) AS max_set_number
FROM sets
WHERE workout_exercise_id = ? AND deleted_at IS NULL;
`,
    workoutExerciseId,
  );
  const setId = createLocalId();
  const timestamp = nowIso();
  const nextSetNumber = (row?.max_set_number ?? 0) + 1;

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
INSERT INTO sets (
  id,
  workout_exercise_id,
  set_number,
  set_type,
  is_completed,
  completed_at,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, 'normal', 0, NULL, ?, ?, NULL);
`,
      setId,
      workoutExerciseId,
      nextSetNumber,
      timestamp,
      timestamp,
    );

    await database.runAsync(
      `
INSERT INTO set_metrics (
  set_id,
  weight,
  reps,
  distance_km,
  incline,
  duration_seconds,
  rpe,
  notes,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, NULL);
`,
      setId,
      timestamp,
      timestamp,
    );
  });

  await recomputeWorkoutStatus(workoutExercise.workout_id);

  const setDetails = await getWorkoutSetDetailsById(setId);

  if (!setDetails) {
    throw new Error('Workout set was not created.');
  }

  return setDetails;
}

export async function deleteWorkoutSet(setId: string): Promise<WorkoutStatus> {
  const database = await getReadyDatabase();
  const setContext = await getSetWorkoutContext(setId);

  if (setContext.is_completed === 1) {
    throw new Error('Completed sets cannot be deleted.');
  }

  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
UPDATE set_metrics
SET deleted_at = ?, updated_at = ?
WHERE set_id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      setId,
    );

    await database.runAsync(
      `
UPDATE sets
SET deleted_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      setId,
    );

    await renumberWorkoutSets(database, setContext.workout_exercise_id);
  });

  return recomputeWorkoutStatus(setContext.workout_id);
}

export async function recomputeWorkoutStatus(
  workoutId: string,
): Promise<WorkoutStatus> {
  const database = await getReadyDatabase();
  const summary = await getWorkoutCompletionSummary(workoutId);
  const nextStatus = getStatusFromCompletionSummary(summary);

  await database.runAsync(
    `
UPDATE workouts
SET status = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
    nextStatus,
    nowIso(),
    workoutId,
  );

  return nextStatus;
}

export async function listWorkoutSummariesByDate(
  scheduledDate: string,
): Promise<WorkoutSummary[]> {
  return listWorkoutSummariesBetween(scheduledDate, scheduledDate);
}

export async function listWorkoutSummariesBetween(
  startDate: string,
  endDate: string,
): Promise<WorkoutSummary[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<WorkoutSummary>(
    `
SELECT
  w.*,
  r.name AS routine_name,
  COUNT(DISTINCT we.id) AS exercise_count,
  COUNT(s.id) AS set_count,
  COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_set_count
FROM workouts w
LEFT JOIN routines r
  ON r.id = w.routine_id
  AND r.deleted_at IS NULL
LEFT JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
LEFT JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
WHERE w.scheduled_date BETWEEN ? AND ?
  AND w.deleted_at IS NULL
GROUP BY w.id
ORDER BY w.scheduled_date ASC, w.created_at ASC;
`,
    startDate,
    endDate,
  );
}

export async function listWorkoutsByDate(
  scheduledDate: string,
): Promise<Workout[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<Workout>(
    `
SELECT *
FROM workouts
WHERE scheduled_date = ? AND deleted_at IS NULL
ORDER BY created_at ASC;
`,
    scheduledDate,
  );
}

export async function updateWorkoutStatus(
  workoutId: string,
  status: WorkoutStatus,
): Promise<Workout> {
  const database = await getReadyDatabase();

  if (status === 'completed') {
    await assertWorkoutCanBeCompleted(workoutId);
  }

  await database.runAsync(
    `
UPDATE workouts
SET status = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
    status,
    nowIso(),
    workoutId,
  );

  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    throw new Error('Workout was not found after status update.');
  }

  return workout;
}

export async function addWorkoutExercise(
  input: CreateWorkoutExerciseInput,
): Promise<WorkoutExercise> {
  const database = await getReadyDatabase();
  const id = input.id ?? createLocalId();
  const timestamp = nowIso();

  await database.runAsync(
    `
INSERT INTO workout_exercises (
  id,
  workout_id,
  exercise_id,
  order_index,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, NULL);
`,
    id,
    input.workout_id,
    input.exercise_id,
    input.order_index,
    timestamp,
    timestamp,
  );

  const workoutExercise = await database.getFirstAsync<WorkoutExercise>(
    `
SELECT *
FROM workout_exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );

  if (!workoutExercise) {
    throw new Error('Workout exercise was not created.');
  }

  return workoutExercise;
}

export async function listWorkoutExercises(
  workoutId: string,
): Promise<WorkoutExercise[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<WorkoutExercise>(
    `
SELECT *
FROM workout_exercises
WHERE workout_id = ? AND deleted_at IS NULL
ORDER BY order_index ASC;
`,
    workoutId,
  );
}

export async function getWorkoutCompletionSummary(
  workoutId: string,
): Promise<WorkoutCompletionSummary> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<WorkoutCompletionSummary>(
    `
SELECT
  COUNT(s.id) AS total_sets,
  COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
  COALESCE(SUM(CASE WHEN s.is_completed = 0 THEN 1 ELSE 0 END), 0) AS incomplete_sets
FROM workout_exercises we
LEFT JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
WHERE we.workout_id = ?
  AND we.deleted_at IS NULL;
`,
    workoutId,
  );

  return row ?? { total_sets: 0, completed_sets: 0, incomplete_sets: 0 };
}

async function assertWorkoutCanBeCompleted(workoutId: string): Promise<void> {
  const summary = await getWorkoutCompletionSummary(workoutId);

  if (summary.total_sets === 0 || summary.incomplete_sets > 0) {
    throw new Error('Workout cannot be completed until all sets are completed.');
  }
}

async function listWorkoutSetDetails(
  workoutExerciseId: string,
): Promise<WorkoutSetDetails[]> {
  const database = await getReadyDatabase();
  const rows = await database.getAllAsync<WorkoutSetDetailRow>(
    `
SELECT
  s.*,
  sm.weight,
  sm.reps,
  sm.distance_km,
  sm.incline,
  sm.duration_seconds,
  sm.rpe,
  sm.notes,
  sm.created_at AS metrics_created_at,
  sm.updated_at AS metrics_updated_at,
  sm.deleted_at AS metrics_deleted_at
FROM sets s
LEFT JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE s.workout_exercise_id = ?
  AND s.deleted_at IS NULL
ORDER BY s.set_number ASC;
`,
    workoutExerciseId,
  );

  return rows.map(mapWorkoutSetDetailRow);
}

async function getWorkoutSetDetailsById(
  setId: string,
): Promise<WorkoutSetDetails | null> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<WorkoutSetDetailRow>(
    `
SELECT
  s.*,
  sm.weight,
  sm.reps,
  sm.distance_km,
  sm.incline,
  sm.duration_seconds,
  sm.rpe,
  sm.notes,
  sm.created_at AS metrics_created_at,
  sm.updated_at AS metrics_updated_at,
  sm.deleted_at AS metrics_deleted_at
FROM sets s
LEFT JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE s.id = ?
  AND s.deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );

  return row ? mapWorkoutSetDetailRow(row) : null;
}

async function getSetWorkoutContext(setId: string): Promise<SetWorkoutRow> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<SetWorkoutRow>(
    `
SELECT
  s.id AS set_id,
  we.workout_id,
  s.workout_exercise_id,
  s.is_completed
FROM sets s
INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
WHERE s.id = ?
  AND s.deleted_at IS NULL
  AND we.deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );

  if (!row) {
    throw new Error('Workout set was not found.');
  }

  return row;
}

async function renumberWorkoutSets(
  database: SQLiteDatabase,
  workoutExerciseId: string,
): Promise<void> {
  const rows = await database.getAllAsync<{ id: string }>(
    `
SELECT id
FROM sets
WHERE workout_exercise_id = ? AND deleted_at IS NULL
ORDER BY set_number ASC, created_at ASC;
`,
    workoutExerciseId,
  );

  for (let index = 0; index < rows.length; index += 1) {
    await database.runAsync(
      `
UPDATE sets
SET set_number = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
      index + 1,
      nowIso(),
      rows[index].id,
    );
  }
}

function getStatusFromCompletionSummary(
  summary: WorkoutCompletionSummary,
): WorkoutStatus {
  if (summary.total_sets === 0 || summary.completed_sets === 0) {
    return 'planned';
  }

  if (summary.incomplete_sets === 0) {
    return 'completed';
  }

  return 'in_progress';
}

function mapWorkoutSetDetailRow(row: WorkoutSetDetailRow): WorkoutSetDetails {
  const metrics =
    row.metrics_created_at && row.metrics_updated_at
      ? {
          set_id: row.id,
          weight: row.weight,
          reps: row.reps,
          distance_km: row.distance_km,
          incline: row.incline,
          duration_seconds: row.duration_seconds,
          rpe: row.rpe,
          notes: row.notes,
          created_at: row.metrics_created_at,
          updated_at: row.metrics_updated_at,
          deleted_at: row.metrics_deleted_at,
        }
      : null;

  return {
    id: row.id,
    workout_exercise_id: row.workout_exercise_id,
    set_number: row.set_number,
    set_type: row.set_type,
    is_completed: row.is_completed === 1,
    completed_at: row.completed_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
    metrics,
  };
}

function parseSecondaryMuscles(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
