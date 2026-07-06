import { getReadyDatabase } from '../database';
import type {
  Exercise,
  ExerciseCategory,
  ExerciseRow,
  TrackType,
} from '../types';

type SqlValue = string | number | null;

export type ListExercisesOptions = {
  category?: ExerciseCategory;
  includeDeleted?: boolean;
  search?: string;
  trackType?: TrackType;
};

type CountRow = {
  count: number;
};

export async function listExercises(
  options: ListExercisesOptions = {},
): Promise<Exercise[]> {
  const database = await getReadyDatabase();
  const where: string[] = [];
  const params: SqlValue[] = [];

  if (!options.includeDeleted) {
    where.push('deleted_at IS NULL');
  }

  if (options.category) {
    where.push('category = ?');
    params.push(options.category);
  }

  if (options.trackType) {
    where.push('track_type = ?');
    params.push(options.trackType);
  }

  if (options.search?.trim()) {
    where.push(
      '(name LIKE ? OR primary_muscle LIKE ? OR secondary_muscles LIKE ? OR category LIKE ?)',
    );
    const searchTerm = `%${options.search.trim()}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const rows = await database.getAllAsync<ExerciseRow>(
    `
SELECT *
FROM exercises
${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
ORDER BY name COLLATE NOCASE ASC;
`,
    ...params,
  );

  return rows.map(mapExerciseRow);
}

export async function listExercisesForLibrary(): Promise<Exercise[]> {
  return listExercises();
}

export async function searchExercises(query: string): Promise<Exercise[]> {
  return listExercises({ search: query });
}

export async function getExercisesForPicker(): Promise<Exercise[]> {
  return listExercises();
}

export async function getExerciseById(id: string): Promise<Exercise | null> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<ExerciseRow>(
    `
SELECT *
FROM exercises
WHERE id = ? AND deleted_at IS NULL
LIMIT 1;
`,
    id,
  );

  return row ? mapExerciseRow(row) : null;
}

export async function getExerciseBySlug(
  slug: string,
): Promise<Exercise | null> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<ExerciseRow>(
    `
SELECT *
FROM exercises
WHERE slug = ? AND deleted_at IS NULL
LIMIT 1;
`,
    slug,
  );

  return row ? mapExerciseRow(row) : null;
}

export async function countExercises(includeDeleted = false): Promise<number> {
  const database = await getReadyDatabase();
  const row = await database.getFirstAsync<CountRow>(
    `
SELECT COUNT(*) AS count
FROM exercises
${includeDeleted ? '' : 'WHERE deleted_at IS NULL'};
`,
  );

  return row?.count ?? 0;
}

function mapExerciseRow(row: ExerciseRow): Exercise {
  return {
    ...row,
    secondary_muscles: parseSecondaryMuscles(row.secondary_muscles),
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
