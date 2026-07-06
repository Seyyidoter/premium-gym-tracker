import { getReadyDatabase } from '../database';
import { createLocalId, nowIso } from '../id';
import type {
  Exercise,
  ExerciseCategory,
  Routine,
  RoutineExercise,
  RoutineSet,
  TrackType,
} from '../types';

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

export type RoutineTemplateExerciseInput = {
  exercise_id: string;
  order_index: number;
  sets: Omit<CreateRoutineSetInput, 'id' | 'routine_exercise_id'>[];
};

export type CreateRoutineTemplateInput = {
  id?: string;
  name: string;
  exercises: RoutineTemplateExerciseInput[];
};

export type UpdateRoutineTemplateInput = {
  name: string;
  exercises: RoutineTemplateExerciseInput[];
};

export type RoutineExerciseWithDetails = RoutineExercise & {
  exercise: Exercise;
  sets: RoutineSet[];
};

export type RoutineDetails = Routine & {
  exercises: RoutineExerciseWithDetails[];
};

type ExerciseRoutineRow = {
  routine_exercise_id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
  routine_exercise_created_at: string;
  routine_exercise_updated_at: string;
  routine_exercise_deleted_at: string | null;
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

type RoutineListItemRow = Routine & {
  exercise_count: number;
  set_count: number;
};

export type RoutineListItem = Routine & {
  exercise_count: number;
  set_count: number;
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

export async function listRoutineSummaries(): Promise<RoutineListItem[]> {
  const database = await getReadyDatabase();

  return database.getAllAsync<RoutineListItemRow>(
    `
SELECT
  r.*,
  COUNT(DISTINCT re.id) AS exercise_count,
  COUNT(rs.id) AS set_count
FROM routines r
LEFT JOIN routine_exercises re
  ON re.routine_id = r.id
  AND re.deleted_at IS NULL
LEFT JOIN routine_sets rs
  ON rs.routine_exercise_id = re.id
  AND rs.deleted_at IS NULL
WHERE r.deleted_at IS NULL
GROUP BY r.id
ORDER BY r.created_at DESC;
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

export async function getRoutineDetails(
  routineId: string,
): Promise<RoutineDetails | null> {
  const routine = await getRoutineById(routineId);

  if (!routine) {
    return null;
  }

  const database = await getReadyDatabase();
  const rows = await database.getAllAsync<ExerciseRoutineRow>(
    `
SELECT
  re.id AS routine_exercise_id,
  re.routine_id,
  re.exercise_id,
  re.order_index,
  re.created_at AS routine_exercise_created_at,
  re.updated_at AS routine_exercise_updated_at,
  re.deleted_at AS routine_exercise_deleted_at,
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
FROM routine_exercises re
INNER JOIN exercises e ON e.id = re.exercise_id
WHERE re.routine_id = ?
  AND re.deleted_at IS NULL
  AND e.deleted_at IS NULL
ORDER BY re.order_index ASC;
`,
    routineId,
  );

  const exercises: RoutineExerciseWithDetails[] = [];

  for (const row of rows) {
    exercises.push({
      id: row.routine_exercise_id,
      routine_id: row.routine_id,
      exercise_id: row.exercise_id,
      order_index: row.order_index,
      created_at: row.routine_exercise_created_at,
      updated_at: row.routine_exercise_updated_at,
      deleted_at: row.routine_exercise_deleted_at,
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
      sets: await listRoutineSets(row.routine_exercise_id),
    });
  }

  return {
    ...routine,
    exercises,
  };
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

export async function createRoutineTemplate(
  input: CreateRoutineTemplateInput,
): Promise<RoutineDetails> {
  const database = await getReadyDatabase();
  const name = input.name.trim();

  if (!name) {
    throw new Error('Routine name is required.');
  }

  if (input.exercises.length === 0) {
    throw new Error('At least one exercise is required.');
  }

  const routineId = input.id ?? createLocalId();
  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
INSERT INTO routines (id, name, created_at, updated_at, deleted_at)
VALUES (?, ?, ?, ?, NULL);
`,
      routineId,
      name,
      timestamp,
      timestamp,
    );

    for (const exerciseInput of input.exercises) {
      const routineExerciseId = createLocalId();

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
        routineExerciseId,
        routineId,
        exerciseInput.exercise_id,
        exerciseInput.order_index,
        timestamp,
        timestamp,
      );

      for (const setInput of exerciseInput.sets) {
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
          createLocalId(),
          routineExerciseId,
          setInput.set_number,
          setInput.target_weight ?? null,
          setInput.target_reps ?? null,
          setInput.target_distance_km ?? null,
          setInput.target_incline ?? null,
          setInput.target_duration_seconds ?? null,
          timestamp,
          timestamp,
        );
      }
    }
  });

  const routineDetails = await getRoutineDetails(routineId);

  if (!routineDetails) {
    throw new Error('Routine template was not created.');
  }

  return routineDetails;
}

export async function updateRoutineTemplate(
  routineId: string,
  input: UpdateRoutineTemplateInput,
): Promise<RoutineDetails> {
  const database = await getReadyDatabase();
  const name = input.name.trim();

  if (!name) {
    throw new Error('Routine name is required.');
  }

  if (input.exercises.length === 0) {
    throw new Error('At least one exercise is required.');
  }

  const existingRoutine = await getRoutineById(routineId);

  if (!existingRoutine) {
    throw new Error('Routine was not found.');
  }

  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
UPDATE routine_sets
SET deleted_at = ?, updated_at = ?
WHERE deleted_at IS NULL
  AND routine_exercise_id IN (
    SELECT id
    FROM routine_exercises
    WHERE routine_id = ?
  );
`,
      timestamp,
      timestamp,
      routineId,
    );

    await database.runAsync(
      `
UPDATE routine_exercises
SET deleted_at = ?, updated_at = ?
WHERE routine_id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      routineId,
    );

    await database.runAsync(
      `
UPDATE routines
SET name = ?, updated_at = ?, deleted_at = NULL
WHERE id = ? AND deleted_at IS NULL;
`,
      name,
      timestamp,
      routineId,
    );

    for (const exerciseInput of input.exercises) {
      const routineExerciseId = createLocalId();

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
        routineExerciseId,
        routineId,
        exerciseInput.exercise_id,
        exerciseInput.order_index,
        timestamp,
        timestamp,
      );

      for (const setInput of exerciseInput.sets) {
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
          createLocalId(),
          routineExerciseId,
          setInput.set_number,
          setInput.target_weight ?? null,
          setInput.target_reps ?? null,
          setInput.target_distance_km ?? null,
          setInput.target_incline ?? null,
          setInput.target_duration_seconds ?? null,
          timestamp,
          timestamp,
        );
      }
    }
  });

  const routineDetails = await getRoutineDetails(routineId);

  if (!routineDetails) {
    throw new Error('Routine template was not updated.');
  }

  return routineDetails;
}

export async function softDeleteRoutine(routineId: string): Promise<void> {
  const database = await getReadyDatabase();
  const timestamp = nowIso();

  await database.withTransactionAsync(async () => {
    await database.runAsync(
      `
UPDATE routine_sets
SET deleted_at = ?, updated_at = ?
WHERE deleted_at IS NULL
  AND routine_exercise_id IN (
    SELECT id
    FROM routine_exercises
    WHERE routine_id = ?
  );
`,
      timestamp,
      timestamp,
      routineId,
    );

    await database.runAsync(
      `
UPDATE routine_exercises
SET deleted_at = ?, updated_at = ?
WHERE routine_id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      routineId,
    );

    await database.runAsync(
      `
UPDATE routines
SET deleted_at = ?, updated_at = ?
WHERE id = ? AND deleted_at IS NULL;
`,
      timestamp,
      timestamp,
      routineId,
    );
  });
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
