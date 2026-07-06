export const EXERCISE_CATEGORIES = [
  'machine',
  'free_weight',
  'bodyweight',
  'cardio',
  'mobility',
] as const;

export type ExerciseCategory = (typeof EXERCISE_CATEGORIES)[number];

export const TRACK_TYPES = [
  'weight_reps',
  'distance_duration_incline',
  'duration_only',
] as const;

export type TrackType = (typeof TRACK_TYPES)[number];

export const WORKOUT_STATUSES = [
  'planned',
  'in_progress',
  'completed',
] as const;

export type WorkoutStatus = (typeof WORKOUT_STATUSES)[number];

export const WORKOUT_SET_TYPES = [
  'warmup',
  'normal',
  'drop',
  'failure',
] as const;

export type WorkoutSetType = (typeof WORKOUT_SET_TYPES)[number];

export type IsoTimestamp = string;
export type IsoDate = string;

export interface TimestampColumns {
  created_at: IsoTimestamp;
  updated_at: IsoTimestamp;
  deleted_at: IsoTimestamp | null;
}

export interface Exercise extends TimestampColumns {
  id: string;
  slug: string;
  asset_key: string;
  name: string;
  category: ExerciseCategory;
  primary_muscle: string;
  secondary_muscles: string[];
  track_type: TrackType;
  instructions: string | null;
}

export interface ExerciseRow extends TimestampColumns {
  id: string;
  slug: string;
  asset_key: string;
  name: string;
  category: ExerciseCategory;
  primary_muscle: string;
  secondary_muscles: string | null;
  track_type: TrackType;
  instructions: string | null;
}

export interface Routine extends TimestampColumns {
  id: string;
  name: string;
}

export interface RoutineExercise extends TimestampColumns {
  id: string;
  routine_id: string;
  exercise_id: string;
  order_index: number;
}

export interface RoutineSet extends TimestampColumns {
  id: string;
  routine_exercise_id: string;
  set_number: number;
  target_weight: number | null;
  target_reps: number | null;
  target_distance_km: number | null;
  target_incline: number | null;
  target_duration_seconds: number | null;
}

export interface Workout extends TimestampColumns {
  id: string;
  routine_id: string | null;
  scheduled_date: IsoDate;
  start_time: IsoTimestamp | null;
  end_time: IsoTimestamp | null;
  status: WorkoutStatus;
}

export interface WorkoutExercise extends TimestampColumns {
  id: string;
  workout_id: string;
  exercise_id: string;
  order_index: number;
}

export interface WorkoutSet extends TimestampColumns {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: WorkoutSetType;
  is_completed: boolean;
  completed_at: IsoTimestamp | null;
}

export interface WorkoutSetRow extends TimestampColumns {
  id: string;
  workout_exercise_id: string;
  set_number: number;
  set_type: WorkoutSetType;
  is_completed: 0 | 1;
  completed_at: IsoTimestamp | null;
}

export interface SetMetrics extends TimestampColumns {
  set_id: string;
  weight: number | null;
  reps: number | null;
  distance_km: number | null;
  incline: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  notes: string | null;
}
