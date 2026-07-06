export const CREATE_TABLE_STATEMENTS = [
  `
CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  asset_key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('machine', 'free_weight', 'bodyweight', 'cardio', 'mobility')),
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT,
  track_type TEXT NOT NULL CHECK (track_type IN ('weight_reps', 'distance_duration_incline', 'duration_only')),
  instructions TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS routine_exercises (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(id),
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS routine_sets (
  id TEXT PRIMARY KEY,
  routine_exercise_id TEXT NOT NULL REFERENCES routine_exercises(id),
  set_number INTEGER NOT NULL,
  target_weight REAL,
  target_reps INTEGER,
  target_distance_km REAL,
  target_incline REAL,
  target_duration_seconds INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS workouts (
  id TEXT PRIMARY KEY,
  routine_id TEXT REFERENCES routines(id),
  scheduled_date TEXT NOT NULL,
  start_time TEXT,
  end_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS workout_exercises (
  id TEXT PRIMARY KEY,
  workout_id TEXT NOT NULL REFERENCES workouts(id),
  exercise_id TEXT NOT NULL REFERENCES exercises(id),
  order_index INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS sets (
  id TEXT PRIMARY KEY,
  workout_exercise_id TEXT NOT NULL REFERENCES workout_exercises(id),
  set_number INTEGER NOT NULL,
  set_type TEXT NOT NULL CHECK (set_type IN ('warmup', 'normal', 'drop', 'failure')),
  is_completed INTEGER NOT NULL CHECK (is_completed IN (0, 1)),
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
  `
CREATE TABLE IF NOT EXISTS set_metrics (
  set_id TEXT PRIMARY KEY REFERENCES sets(id),
  weight REAL,
  reps INTEGER,
  distance_km REAL,
  incline REAL,
  duration_seconds INTEGER,
  rpe REAL,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
`,
] as const;

export const CREATE_INDEX_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_workouts_scheduled_date ON workouts(scheduled_date);',
  'CREATE INDEX IF NOT EXISTS idx_workout_exercises_workout_id ON workout_exercises(workout_id);',
  'CREATE INDEX IF NOT EXISTS idx_sets_workout_exercise_id ON sets(workout_exercise_id);',
  'CREATE INDEX IF NOT EXISTS idx_set_metrics_set_id ON set_metrics(set_id);',
  'CREATE INDEX IF NOT EXISTS idx_routine_exercises_routine_id ON routine_exercises(routine_id);',
  'CREATE INDEX IF NOT EXISTS idx_routine_sets_routine_exercise_id ON routine_sets(routine_exercise_id);',
] as const;

export const INITIAL_SCHEMA_SQL = [
  ...CREATE_TABLE_STATEMENTS,
  ...CREATE_INDEX_STATEMENTS,
].join('\n');
