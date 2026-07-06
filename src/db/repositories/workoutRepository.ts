import { getReadyDatabase } from '../database';
import { createLocalId, nowIso } from '../id';
import type { RoutineSet, Workout, WorkoutExercise, WorkoutStatus } from '../types';

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
