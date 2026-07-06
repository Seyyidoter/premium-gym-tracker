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

export type WorkoutHistoryStatusFilter = WorkoutStatus | 'all';

export type WorkoutHistoryFilter = {
  status?: WorkoutHistoryStatusFilter;
};

export type WorkoutHistoryItem = WorkoutSummary & {
  total_strength_volume: number;
  total_cardio_distance_km: number;
  total_cardio_duration_seconds: number;
};

export type WorkoutHistorySummary = {
  total_workouts: number;
  completed_workouts: number;
  workouts_this_week: number;
  completed_sets: number;
  total_strength_volume: number;
  total_cardio_distance_km: number;
  total_cardio_duration_seconds: number;
  last_completed_workout_date: string | null;
};

export type WeeklyWorkoutSummary = {
  total_workouts: number;
  completed_workouts: number;
  completed_sets: number;
  total_strength_volume: number;
  total_cardio_distance_km: number;
  total_cardio_duration_seconds: number;
};

export type ExerciseRecentHistoryItem = {
  workout_id: string;
  scheduled_date: string;
  status: WorkoutStatus;
  track_type: TrackType;
  set_count: number;
  completed_set_count: number;
  best_weight: number | null;
  best_reps: number | null;
  total_strength_volume: number;
  total_cardio_distance_km: number;
  max_incline: number | null;
  total_duration_seconds: number;
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

type MaxOrderIndexRow = {
  max_order_index: number | null;
};

type ExerciseTrackTypeRow = {
  id: string;
  track_type: TrackType;
};

type PreviousWorkoutReferenceRow = {
  workout_id: string;
  scheduled_date: string;
  created_at: string;
};

type PreviousSetMetricRow = SetMetrics & {
  set_number: number;
};

type WorkoutExerciseContextRow = {
  id: string;
  workout_id: string;
  exercise_id: string;
};

type WorkoutHistorySummaryRow = {
  total_workouts: number | null;
  completed_workouts: number | null;
  workouts_this_week: number | null;
  completed_sets: number | null;
  total_strength_volume: number | null;
  total_cardio_distance_km: number | null;
  total_cardio_duration_seconds: number | null;
  last_completed_workout_date: string | null;
};

type WeeklyWorkoutSummaryRow = {
  total_workouts: number | null;
  completed_workouts: number | null;
  completed_sets: number | null;
  total_strength_volume: number | null;
  total_cardio_distance_km: number | null;
  total_cardio_duration_seconds: number | null;
};

type ExerciseRecentHistoryMetricRow = {
  workout_id: string;
  scheduled_date: string;
  status: WorkoutStatus;
  track_type: TrackType;
  set_number: number;
  is_completed: 0 | 1;
  weight: number | null;
  reps: number | null;
  distance_km: number | null;
  incline: number | null;
  duration_seconds: number | null;
};

type ExerciseRecentHistoryAccumulator = ExerciseRecentHistoryItem & {
  best_set_volume: number;
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

export type PreviousSetMetrics = {
  set_number: number;
  previous_workout_id: string;
  previous_scheduled_date: string;
  previous_created_at: string;
  metrics: SetMetrics;
};

export type PreviousSetMetricsBySetNumber = Record<number, PreviousSetMetrics>;

export type PreviousSetMetricsByWorkoutExercise = Record<
  string,
  PreviousSetMetricsBySetNumber
>;

export type ApplyPreviousMetricsResult = {
  applied_sets: number;
  skipped_completed_sets: number;
  available_previous_sets: number;
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

export async function softDeleteWorkout(workoutId: string): Promise<void> {
  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    throw new Error('Workout was not found.');
  }

  const database = await getReadyDatabase();
  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
UPDATE set_metrics
SET deleted_at = ?, updated_at = ?
WHERE deleted_at IS NULL
  AND set_id IN (
    SELECT s.id
    FROM sets s
    INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
    WHERE we.workout_id = ?
  );
`,
      timestamp,
      timestamp,
      workoutId,
    );

    await database.runAsync(
      `
UPDATE sets
SET deleted_at = ?, updated_at = ?
WHERE deleted_at IS NULL
  AND workout_exercise_id IN (
    SELECT id
    FROM workout_exercises
    WHERE workout_id = ?
  );
`,
      timestamp,
      timestamp,
      workoutId,
    );

    await database.runAsync(
      `
UPDATE workout_exercises
SET deleted_at = ?, updated_at = ?
WHERE workout_id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      workoutId,
    );

    await database.runAsync(
      `
UPDATE workouts
SET deleted_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      workoutId,
    );
  });
}

export async function addExerciseToWorkout(
  workoutId: string,
  exerciseId: string,
): Promise<WorkoutExercise> {
  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    throw new Error('Workout was not found.');
  }

  const database = await getReadyDatabase();
  const exercise = await database.getFirstAsync<ExerciseTrackTypeRow>(
    `
SELECT id, track_type
FROM exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    exerciseId,
  );

  if (!exercise) {
    throw new Error('Exercise was not found.');
  }

  const row = await database.getFirstAsync<MaxOrderIndexRow>(
    `
SELECT MAX(order_index) AS max_order_index
FROM workout_exercises
WHERE workout_id = ? AND deleted_at IS NULL;
`,
    workoutId,
  );
  const timestamp = nowIso();
  const workoutExerciseId = createLocalId();
  const orderIndex = (row?.max_order_index ?? -1) + 1;
  const defaultSetCount = getDefaultSetCount(exercise.track_type);

  await database.withTransactionAsync(async () => {
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
      exerciseId,
      orderIndex,
      timestamp,
      timestamp,
    );

    for (let setNumber = 1; setNumber <= defaultSetCount; setNumber += 1) {
      await insertEmptyWorkoutSet(
        database,
        workoutExerciseId,
        setNumber,
        timestamp,
      );
    }
  });

  await recomputeWorkoutStatus(workoutId);

  const workoutExercise = await database.getFirstAsync<WorkoutExercise>(
    `
SELECT *
FROM workout_exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    workoutExerciseId,
  );

  if (!workoutExercise) {
    throw new Error('Workout exercise was not created.');
  }

  return workoutExercise;
}

export async function softDeleteWorkoutExercise(
  workoutExerciseId: string,
): Promise<WorkoutStatus> {
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

  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
UPDATE set_metrics
SET deleted_at = ?, updated_at = ?
WHERE deleted_at IS NULL
  AND set_id IN (
    SELECT id
    FROM sets
    WHERE workout_exercise_id = ?
  );
`,
      timestamp,
      timestamp,
      workoutExerciseId,
    );

    await database.runAsync(
      `
UPDATE sets
SET deleted_at = ?, updated_at = ?
WHERE workout_exercise_id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      workoutExerciseId,
    );

    await database.runAsync(
      `
UPDATE workout_exercises
SET deleted_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      workoutExerciseId,
    );
  });

  return recomputeWorkoutStatus(workoutExercise.workout_id);
}

export async function getPreviousSetMetricsForWorkout(
  workoutId: string,
): Promise<PreviousSetMetricsByWorkoutExercise> {
  const workout = await getWorkoutById(workoutId);

  if (!workout) {
    return {};
  }

  const database = await getReadyDatabase();
  const workoutExercises = await database.getAllAsync<WorkoutExercise>(
    `
SELECT *
FROM workout_exercises
WHERE workout_id = ? AND deleted_at IS NULL
ORDER BY order_index ASC;
`,
    workoutId,
  );

  const previousByWorkoutExercise: PreviousSetMetricsByWorkoutExercise = {};

  for (const workoutExercise of workoutExercises) {
    const previousMetrics = await getPreviousSetMetricsForExercise(
      workoutExercise.exercise_id,
      workout.id,
    );
    previousByWorkoutExercise[workoutExercise.id] =
      mapPreviousMetricsBySetNumber(previousMetrics);
  }

  return previousByWorkoutExercise;
}

export async function getPreviousSetMetricsForExercise(
  exerciseId: string,
  beforeWorkoutId: string,
): Promise<PreviousSetMetrics[]> {
  const currentWorkout = await getWorkoutById(beforeWorkoutId);

  if (!currentWorkout) {
    throw new Error('Workout was not found.');
  }

  const database = await getReadyDatabase();
  const previousWorkout =
    await database.getFirstAsync<PreviousWorkoutReferenceRow>(
      `
SELECT DISTINCT
  w.id AS workout_id,
  w.scheduled_date,
  w.created_at
FROM workouts w
INNER JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
INNER JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
INNER JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE we.exercise_id = ?
  AND w.id != ?
  AND w.deleted_at IS NULL
  AND w.status IN ('completed', 'in_progress')
  AND (
    w.scheduled_date < ?
    OR (
      w.scheduled_date = ?
      AND w.created_at < ?
    )
  )
  AND (
    sm.weight IS NOT NULL
    OR sm.reps IS NOT NULL
    OR sm.distance_km IS NOT NULL
    OR sm.incline IS NOT NULL
    OR sm.duration_seconds IS NOT NULL
  )
ORDER BY w.scheduled_date DESC, w.created_at DESC
LIMIT 1;
`,
      exerciseId,
      beforeWorkoutId,
      currentWorkout.scheduled_date,
      currentWorkout.scheduled_date,
      currentWorkout.created_at,
    );

  if (!previousWorkout) {
    return [];
  }

  const rows = await database.getAllAsync<PreviousSetMetricRow>(
    `
SELECT
  s.set_number,
  sm.*
FROM workout_exercises we
INNER JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
INNER JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE we.workout_id = ?
  AND we.exercise_id = ?
  AND we.deleted_at IS NULL
  AND (
    sm.weight IS NOT NULL
    OR sm.reps IS NOT NULL
    OR sm.distance_km IS NOT NULL
    OR sm.incline IS NOT NULL
    OR sm.duration_seconds IS NOT NULL
  )
ORDER BY we.order_index ASC, s.set_number ASC;
`,
    previousWorkout.workout_id,
    exerciseId,
  );

  const previousMetrics: PreviousSetMetrics[] = [];
  const usedSetNumbers = new Set<number>();

  for (const row of rows) {
    if (usedSetNumbers.has(row.set_number)) {
      continue;
    }

    usedSetNumbers.add(row.set_number);
    previousMetrics.push(mapPreviousSetMetricRow(row, previousWorkout));
  }

  return previousMetrics;
}

export async function applyPreviousMetricsToWorkoutExercise(
  workoutExerciseId: string,
): Promise<ApplyPreviousMetricsResult> {
  const database = await getReadyDatabase();
  const workoutExercise = await database.getFirstAsync<WorkoutExerciseContextRow>(
    `
SELECT id, workout_id, exercise_id
FROM workout_exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    workoutExerciseId,
  );

  if (!workoutExercise) {
    throw new Error('Workout exercise was not found.');
  }

  const previousMetrics = await getPreviousSetMetricsForExercise(
    workoutExercise.exercise_id,
    workoutExercise.workout_id,
  );
  const previousBySetNumber = mapPreviousMetricsBySetNumber(previousMetrics);
  const currentSets = await database.getAllAsync<WorkoutSetRow>(
    `
SELECT *
FROM sets
WHERE workout_exercise_id = ? AND deleted_at IS NULL
ORDER BY set_number ASC, created_at ASC;
`,
    workoutExerciseId,
  );
  const timestamp = nowIso();
  let appliedSets = 0;
  let skippedCompletedSets = 0;

  await database.withTransactionAsync(async () => {
    for (const set of currentSets) {
      const previous = previousBySetNumber[set.set_number];

      if (!previous) {
        continue;
      }

      if (set.is_completed === 1) {
        skippedCompletedSets += 1;
        continue;
      }

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
        set.id,
        previous.metrics.weight,
        previous.metrics.reps,
        previous.metrics.distance_km,
        previous.metrics.incline,
        previous.metrics.duration_seconds,
        timestamp,
        timestamp,
      );

      appliedSets += 1;
    }
  });

  return {
    applied_sets: appliedSets,
    skipped_completed_sets: skippedCompletedSets,
    available_previous_sets: previousMetrics.length,
  };
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

export async function listWorkoutHistory(
  filter: WorkoutHistoryFilter = {},
): Promise<WorkoutHistoryItem[]> {
  const database = await getReadyDatabase();
  const where = ['w.deleted_at IS NULL'];
  const params: string[] = [];

  if (filter.status && filter.status !== 'all') {
    where.push('w.status = ?');
    params.push(filter.status);
  }

  return database.getAllAsync<WorkoutHistoryItem>(
    `
SELECT
  w.*,
  r.name AS routine_name,
  COUNT(DISTINCT we.id) AS exercise_count,
  COUNT(s.id) AS set_count,
  COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_set_count,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'weight_reps'
          AND sm.weight IS NOT NULL
          AND sm.reps IS NOT NULL
        THEN sm.weight * sm.reps
        ELSE 0
      END
    ),
    0
  ) AS total_strength_volume,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'distance_duration_incline'
        THEN COALESCE(sm.distance_km, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_distance_km,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type IN ('distance_duration_incline', 'duration_only')
        THEN COALESCE(sm.duration_seconds, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_duration_seconds
FROM workouts w
LEFT JOIN routines r
  ON r.id = w.routine_id
  AND r.deleted_at IS NULL
LEFT JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
LEFT JOIN exercises e
  ON e.id = we.exercise_id
  AND e.deleted_at IS NULL
LEFT JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
LEFT JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE ${where.join(' AND ')}
GROUP BY w.id
ORDER BY w.scheduled_date DESC, w.created_at DESC;
`,
    ...params,
  );
}

export async function getWorkoutHistorySummary(): Promise<WorkoutHistorySummary> {
  const database = await getReadyDatabase();
  const weekRange = getCurrentWeekRange();
  const row = await database.getFirstAsync<WorkoutHistorySummaryRow>(
    `
SELECT
  COUNT(DISTINCT w.id) AS total_workouts,
  COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id ELSE NULL END) AS completed_workouts,
  COUNT(DISTINCT CASE WHEN w.scheduled_date BETWEEN ? AND ? THEN w.id ELSE NULL END) AS workouts_this_week,
  COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'weight_reps'
          AND sm.weight IS NOT NULL
          AND sm.reps IS NOT NULL
        THEN sm.weight * sm.reps
        ELSE 0
      END
    ),
    0
  ) AS total_strength_volume,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'distance_duration_incline'
        THEN COALESCE(sm.distance_km, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_distance_km,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type IN ('distance_duration_incline', 'duration_only')
        THEN COALESCE(sm.duration_seconds, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_duration_seconds,
  MAX(CASE WHEN w.status = 'completed' THEN w.scheduled_date ELSE NULL END) AS last_completed_workout_date
FROM workouts w
LEFT JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
LEFT JOIN exercises e
  ON e.id = we.exercise_id
  AND e.deleted_at IS NULL
LEFT JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
LEFT JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE w.deleted_at IS NULL;
`,
    weekRange.start,
    weekRange.end,
  );

  return {
    total_workouts: row?.total_workouts ?? 0,
    completed_workouts: row?.completed_workouts ?? 0,
    workouts_this_week: row?.workouts_this_week ?? 0,
    completed_sets: row?.completed_sets ?? 0,
    total_strength_volume: row?.total_strength_volume ?? 0,
    total_cardio_distance_km: row?.total_cardio_distance_km ?? 0,
    total_cardio_duration_seconds: row?.total_cardio_duration_seconds ?? 0,
    last_completed_workout_date: row?.last_completed_workout_date ?? null,
  };
}

export async function getWeeklyWorkoutSummary(): Promise<WeeklyWorkoutSummary> {
  const database = await getReadyDatabase();
  const weekRange = getCurrentWeekRange();
  const row = await database.getFirstAsync<WeeklyWorkoutSummaryRow>(
    `
SELECT
  COUNT(DISTINCT w.id) AS total_workouts,
  COUNT(DISTINCT CASE WHEN w.status = 'completed' THEN w.id ELSE NULL END) AS completed_workouts,
  COALESCE(SUM(CASE WHEN s.is_completed = 1 THEN 1 ELSE 0 END), 0) AS completed_sets,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'weight_reps'
          AND sm.weight IS NOT NULL
          AND sm.reps IS NOT NULL
        THEN sm.weight * sm.reps
        ELSE 0
      END
    ),
    0
  ) AS total_strength_volume,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type = 'distance_duration_incline'
        THEN COALESCE(sm.distance_km, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_distance_km,
  COALESCE(
    SUM(
      CASE
        WHEN e.track_type IN ('distance_duration_incline', 'duration_only')
        THEN COALESCE(sm.duration_seconds, 0)
        ELSE 0
      END
    ),
    0
  ) AS total_cardio_duration_seconds
FROM workouts w
LEFT JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
LEFT JOIN exercises e
  ON e.id = we.exercise_id
  AND e.deleted_at IS NULL
LEFT JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
LEFT JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE w.deleted_at IS NULL
  AND w.scheduled_date BETWEEN ? AND ?;
`,
    weekRange.start,
    weekRange.end,
  );

  return {
    completed_sets: row?.completed_sets ?? 0,
    completed_workouts: row?.completed_workouts ?? 0,
    total_cardio_distance_km: row?.total_cardio_distance_km ?? 0,
    total_cardio_duration_seconds: row?.total_cardio_duration_seconds ?? 0,
    total_strength_volume: row?.total_strength_volume ?? 0,
    total_workouts: row?.total_workouts ?? 0,
  };
}

export async function getExerciseRecentHistory(
  exerciseId: string,
  limit = 5,
): Promise<ExerciseRecentHistoryItem[]> {
  const database = await getReadyDatabase();
  const rows = await database.getAllAsync<ExerciseRecentHistoryMetricRow>(
    `
SELECT
  w.id AS workout_id,
  w.scheduled_date,
  w.status,
  e.track_type,
  s.set_number,
  s.is_completed,
  sm.weight,
  sm.reps,
  sm.distance_km,
  sm.incline,
  sm.duration_seconds
FROM workouts w
INNER JOIN workout_exercises we
  ON we.workout_id = w.id
  AND we.deleted_at IS NULL
INNER JOIN exercises e
  ON e.id = we.exercise_id
  AND e.deleted_at IS NULL
INNER JOIN sets s
  ON s.workout_exercise_id = we.id
  AND s.deleted_at IS NULL
INNER JOIN set_metrics sm
  ON sm.set_id = s.id
  AND sm.deleted_at IS NULL
WHERE w.deleted_at IS NULL
  AND w.status IN ('completed', 'in_progress')
  AND we.exercise_id = ?
  AND (
    sm.weight IS NOT NULL
    OR sm.reps IS NOT NULL
    OR sm.distance_km IS NOT NULL
    OR sm.incline IS NOT NULL
    OR sm.duration_seconds IS NOT NULL
  )
ORDER BY w.scheduled_date DESC, w.created_at DESC, we.order_index ASC, s.set_number ASC;
`,
    exerciseId,
  );

  return mapExerciseRecentHistoryRows(rows, limit);
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

async function insertEmptyWorkoutSet(
  database: SQLiteDatabase,
  workoutExerciseId: string,
  setNumber: number,
  timestamp: string,
): Promise<void> {
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
    setNumber,
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
}

function getDefaultSetCount(trackType: TrackType): number {
  return trackType === 'weight_reps' ? 3 : 1;
}

function mapExerciseRecentHistoryRows(
  rows: ExerciseRecentHistoryMetricRow[],
  limit: number,
): ExerciseRecentHistoryItem[] {
  const history: ExerciseRecentHistoryAccumulator[] = [];
  const byWorkoutId = new Map<string, ExerciseRecentHistoryAccumulator>();

  for (const row of rows) {
    let item = byWorkoutId.get(row.workout_id);

    if (!item) {
      if (history.length >= limit) {
        break;
      }

      item = {
        workout_id: row.workout_id,
        scheduled_date: row.scheduled_date,
        status: row.status,
        track_type: row.track_type,
        set_count: 0,
        completed_set_count: 0,
        best_weight: null,
        best_reps: null,
        total_strength_volume: 0,
        total_cardio_distance_km: 0,
        max_incline: null,
        total_duration_seconds: 0,
        best_set_volume: 0,
      };
      byWorkoutId.set(row.workout_id, item);
      history.push(item);
    }

    item.set_count += 1;

    if (row.is_completed === 1) {
      item.completed_set_count += 1;
    }

    if (row.weight !== null && row.reps !== null) {
      const setVolume = row.weight * row.reps;
      item.total_strength_volume += setVolume;

      if (setVolume > item.best_set_volume) {
        item.best_set_volume = setVolume;
        item.best_weight = row.weight;
        item.best_reps = row.reps;
      }
    }

    if (row.distance_km !== null) {
      item.total_cardio_distance_km += row.distance_km;
    }

    if (row.incline !== null) {
      item.max_incline =
        item.max_incline === null
          ? row.incline
          : Math.max(item.max_incline, row.incline);
    }

    if (row.duration_seconds !== null) {
      item.total_duration_seconds += row.duration_seconds;
    }
  }

  return history.map(({ best_set_volume: _bestSetVolume, ...item }) => item);
}

function getCurrentWeekRange(): { end: string; start: string } {
  const today = new Date();
  const start = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + mondayOffset);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  return {
    end: formatDateKey(end),
    start: formatDateKey(start),
  };
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function mapPreviousMetricsBySetNumber(
  previousMetrics: PreviousSetMetrics[],
): PreviousSetMetricsBySetNumber {
  const previousBySetNumber: PreviousSetMetricsBySetNumber = {};

  for (const previous of previousMetrics) {
    previousBySetNumber[previous.set_number] = previous;
  }

  return previousBySetNumber;
}

function mapPreviousSetMetricRow(
  row: PreviousSetMetricRow,
  previousWorkout: PreviousWorkoutReferenceRow,
): PreviousSetMetrics {
  return {
    set_number: row.set_number,
    previous_workout_id: previousWorkout.workout_id,
    previous_scheduled_date: previousWorkout.scheduled_date,
    previous_created_at: previousWorkout.created_at,
    metrics: {
      set_id: row.set_id,
      weight: row.weight,
      reps: row.reps,
      distance_km: row.distance_km,
      incline: row.incline,
      duration_seconds: row.duration_seconds,
      rpe: row.rpe,
      notes: row.notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
      deleted_at: row.deleted_at,
    },
  };
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
