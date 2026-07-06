import { getReadyDatabase } from '../database';
import { createLocalId, nowIso } from '../id';
import type {
  SetMetrics,
  TrackType,
  WorkoutSet,
  WorkoutSetRow,
  WorkoutSetType,
} from '../types';

type SqlValue = string | number | null;

export type CreateWorkoutSetInput = {
  id?: string;
  workout_exercise_id: string;
  set_number: number;
  set_type?: WorkoutSetType;
  is_completed?: boolean;
  completed_at?: string | null;
};

export type UpsertSetMetricsInput = {
  set_id: string;
  weight?: number | null;
  reps?: number | null;
  distance_km?: number | null;
  incline?: number | null;
  duration_seconds?: number | null;
  rpe?: number | null;
  notes?: string | null;
};

type TrackTypeRow = {
  track_type: TrackType;
};

export async function createWorkoutSet(
  input: CreateWorkoutSetInput,
): Promise<WorkoutSet> {
  const database = await getReadyDatabase();
  const id = input.id ?? createLocalId();
  const timestamp = nowIso();

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
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL);
`,
    id,
    input.workout_exercise_id,
    input.set_number,
    input.set_type ?? 'normal',
    input.is_completed ? 1 : 0,
    input.completed_at ?? null,
    timestamp,
    timestamp,
  );

  const workoutSet = await getWorkoutSetById(id);

  if (!workoutSet) {
    throw new Error('Workout set was not created.');
  }

  return workoutSet;
}

export async function getWorkoutSetById(
  setId: string,
): Promise<WorkoutSet | null> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<WorkoutSetRow>(
    `
SELECT *
FROM sets
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );

  return row ? mapWorkoutSetRow(row) : null;
}

export async function listSetsForWorkoutExercise(
  workoutExerciseId: string,
): Promise<WorkoutSet[]> {
  const database = await getReadyDatabase();
  const rows = await database.getAllAsync<WorkoutSetRow>(
    `
SELECT *
FROM sets
WHERE workout_exercise_id = ? AND deleted_at IS NULL
ORDER BY set_number ASC;
`,
    workoutExerciseId,
  );

  return rows.map(mapWorkoutSetRow);
}

export async function markSetCompletion(
  setId: string,
  isCompleted: boolean,
): Promise<WorkoutSet> {
  const database = await getReadyDatabase();
  const timestamp = nowIso();

  await database.runAsync(
    `
UPDATE sets
SET is_completed = ?, completed_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
    isCompleted ? 1 : 0,
    isCompleted ? timestamp : null,
    timestamp,
    setId,
  );

  const workoutSet = await getWorkoutSetById(setId);

  if (!workoutSet) {
    throw new Error('Workout set was not found after completion update.');
  }

  return workoutSet;
}

export async function upsertSetMetrics(
  input: UpsertSetMetricsInput,
): Promise<SetMetrics> {
  const database = await getReadyDatabase();
  const trackType = await getTrackTypeForSet(input.set_id);

  assertMetricsMatchTrackType(trackType, input);

  const timestamp = nowIso();
  const params: SqlValue[] = [
    input.set_id,
    input.weight ?? null,
    input.reps ?? null,
    input.distance_km ?? null,
    input.incline ?? null,
    input.duration_seconds ?? null,
    input.rpe ?? null,
    input.notes ?? null,
    timestamp,
    timestamp,
  ];

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
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
ON CONFLICT(set_id) DO UPDATE SET
  weight = excluded.weight,
  reps = excluded.reps,
  distance_km = excluded.distance_km,
  incline = excluded.incline,
  duration_seconds = excluded.duration_seconds,
  rpe = excluded.rpe,
  notes = excluded.notes,
  updated_at = excluded.updated_at,
  deleted_at = NULL;
`,
    ...params,
  );

  const metrics = await getSetMetrics(input.set_id);

  if (!metrics) {
    throw new Error('Set metrics were not saved.');
  }

  return metrics;
}

export async function getSetMetrics(
  setId: string,
): Promise<SetMetrics | null> {
  const database = await getReadyDatabase();

  return database.getFirstAsync<SetMetrics>(
    `
SELECT *
FROM set_metrics
WHERE set_id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );
}

export function assertMetricsMatchTrackType(
  trackType: TrackType,
  metrics: UpsertSetMetricsInput,
): void {
  if (trackType === 'weight_reps') {
    assertPresent(metrics.weight, 'weight');
    assertPresent(metrics.reps, 'reps');
    return;
  }

  if (trackType === 'distance_duration_incline') {
    assertPresent(metrics.distance_km, 'distance_km');
    assertPresent(metrics.incline, 'incline');
    assertPresent(metrics.duration_seconds, 'duration_seconds');
    return;
  }

  assertPresent(metrics.duration_seconds, 'duration_seconds');
}

async function getTrackTypeForSet(setId: string): Promise<TrackType> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<TrackTypeRow>(
    `
SELECT e.track_type
FROM sets s
INNER JOIN workout_exercises we ON we.id = s.workout_exercise_id
INNER JOIN exercises e ON e.id = we.exercise_id
WHERE s.id = ?
  AND s.deleted_at IS NULL
  AND we.deleted_at IS NULL
  AND e.deleted_at IS NULL
LIMIT 1;
`,
    setId,
  );

  if (!row) {
    throw new Error('Unable to resolve track type for set.');
  }

  return row.track_type;
}

function assertPresent(value: number | null | undefined, field: string): void {
  if (value === null || value === undefined) {
    throw new Error(`Metric field "${field}" is required for this track type.`);
  }
}

function mapWorkoutSetRow(row: WorkoutSetRow): WorkoutSet {
  return {
    ...row,
    is_completed: row.is_completed === 1,
  };
}
