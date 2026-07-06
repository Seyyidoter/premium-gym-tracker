import { getReadyDatabase } from '../database';
import { createLocalId, nowIso } from '../id';
import type { Routine, RoutineExercise, RoutineSet } from '../types';

type SqlValue = string | number | null;

export type CreateRoutineInput = {
  id?: string;
  name: string;
};

export type CreateRoutineExerciseInput = {
  id?: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
};

export type CreateRoutineSetInput = {
  id?: string;
  routine_exercise_id: string;
  set_number: number;
  target_weight?: number | null;
  target_reps?: number | null;
  target_distance_km?: number | null;
  target_incline?: number | null;
  target_duration_seconds?: number | null;
};

export async function listRoutines(
  includeDeleted = false,
): Promise<Routine[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<Routine>(
    `
SELECT *
FROM routines
${includeDeleted ? '' : 'WHERE deleted_at IS NULL'}
ORDER BY created_at DESC;
`,
  );
}

export async function getRoutineById(id: string): Promise<Routine | null> {
  const database = await getReadyDatabase();

  return database.getFirstAsync<Routine>(
    `
SELECT *
FROM routines
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );
}

export async function createRoutine(
  input: CreateRoutineInput,
): Promise<Routine> {
  const database = await getReadyDatabase();
  const name = input.name.trim();

  if (!name) {
    throw new Error('Routine name is required.');
  }

  const id = input.id ?? createLocalId();
  const timestamp = nowIso();

  await database.runAsync(
    `
INSERT INTO routines (id, name, created_at, updated_at, deleted_at)
VALUES (?, ?, ?, ?, NULL);
`,
    id,
    name,
    timestamp,
    timestamp,
  );

  const routine = await getRoutineById(id);

  if (!routine) {
    throw new Error('Routine was not created.');
  }

  return routine;
}

export async function addExerciseToRoutine(
  input: CreateRoutineExerciseInput,
): Promise<RoutineExercise> {
  const database = await getReadyDatabase();
  const id = input.id ?? createLocalId();
  const timestamp = nowIso();

  await database.runAsync(
    `
INSERT INTO routine_exercises (
  id,
  routine_id,
  exercise_id,
  order_index,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, NULL);
`,
    id,
    input.routine_id,
    input.exercise_id,
    input.order_index,
    timestamp,
    timestamp,
  );

  const routineExercise = await database.getFirstAsync<RoutineExercise>(
    `
SELECT *
FROM routine_exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );

  if (!routineExercise) {
    throw new Error('Routine exercise was not created.');
  }

  return routineExercise;
}

export async function listRoutineExercises(
  routineId: string,
): Promise<RoutineExercise[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<RoutineExercise>(
    `
SELECT *
FROM routine_exercises
WHERE routine_id = ? AND deleted_at IS NULL
ORDER BY order_index ASC;
`,
    routineId,
  );
}

export async function addRoutineSet(
  input: CreateRoutineSetInput,
): Promise<RoutineSet> {
  const database = await getReadyDatabase();
  const id = input.id ?? createLocalId();
  const timestamp = nowIso();
  const params: SqlValue[] = [
    id,
    input.routine_exercise_id,
    input.set_number,
    input.target_weight ?? null,
    input.target_reps ?? null,
    input.target_distance_km ?? null,
    input.target_incline ?? null,
    input.target_duration_seconds ?? null,
    timestamp,
    timestamp,
  ];

  await database.runAsync(
    `
INSERT INTO routine_sets (
  id,
  routine_exercise_id,
  set_number,
  target_weight,
  target_reps,
  target_distance_km,
  target_incline,
  target_duration_seconds,
  created_at,
  updated_at,
  deleted_at
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL);
`,
    ...params,
  );

  const routineSet = await database.getFirstAsync<RoutineSet>(
    `
SELECT *
FROM routine_sets
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );

  if (!routineSet) {
    throw new Error('Routine set was not created.');
  }

  return routineSet;
}

export async function listRoutineSets(
  routineExerciseId: string,
): Promise<RoutineSet[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<RoutineSet>(
    `
SELECT *
FROM routine_sets
WHERE routine_exercise_id = ? AND deleted_at IS NULL
ORDER BY set_number ASC;
`,
    routineExerciseId,
  );
}
