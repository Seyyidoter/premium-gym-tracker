import type { ImageSourcePropType } from 'react-native';

export const ExerciseGifs = {
  assisted_pull_up: require('./gifs/assisted_pull_up.gif'),
  barbell_squat: require('./gifs/barbell_squat.gif'),
  biceps_curl_machine: require('./gifs/biceps_curl_machine.gif'),
  cable_curl: require('./gifs/cable_curl.gif'),
  calf_raise: require('./gifs/calf_raise.gif'),
  chest_press: require('./gifs/chest_press.gif'),
  crunch: require('./gifs/crunch.gif'),
  dumbbell_bench_press: require('./gifs/dumbbell_bench_press.gif'),
  dumbbell_curl: require('./gifs/dumbbell_curl.gif'),
  dumbbell_lateral_raise: require('./gifs/dumbbell_lateral_raise.gif'),
  dumbbell_row: require('./gifs/dumbbell_row.gif'),
  dumbbell_shoulder_press: require('./gifs/dumbbell_shoulder_press.gif'),
  elliptical: require('./gifs/elliptical.gif'),
  hammer_curl: require('./gifs/hammer_curl.gif'),
  hanging_knee_raise: require('./gifs/hanging_knee_raise.gif'),
  hip_abduction: require('./gifs/hip_abduction.gif'),
  hip_adduction: require('./gifs/hip_adduction.gif'),
  incline_chest_press: require('./gifs/incline_chest_press.gif'),
  interval_run: require('./gifs/interval_run.gif'),
  lat_pulldown: require('./gifs/lat_pulldown.gif'),
  lateral_raise: require('./gifs/lateral_raise.gif'),
  leg_extension: require('./gifs/leg_extension.gif'),
  leg_press: require('./gifs/leg_press.gif'),
  lying_leg_curl: require('./gifs/lying_leg_curl.gif'),
  overhead_triceps_extension: require('./gifs/overhead_triceps_extension.gif'),
  pec_deck: require('./gifs/pec_deck.gif'),
  plank: require('./gifs/plank.gif'),
  rear_delt_fly: require('./gifs/rear_delt_fly.gif'),
  romanian_deadlift: require('./gifs/romanian_deadlift.gif'),
  rowing_machine: require('./gifs/rowing_machine.gif'),
  seated_leg_curl: require('./gifs/seated_leg_curl.gif'),
  seated_row: require('./gifs/seated_row.gif'),
  shoulder_press: require('./gifs/shoulder_press.gif'),
  stair_climber: require('./gifs/stair_climber.gif'),
  stationary_bike: require('./gifs/stationary_bike.gif'),
  treadmill: require('./gifs/treadmill.gif'),
  triceps_pushdown: require('./gifs/triceps_pushdown.gif'),
} as const satisfies Record<string, ImageSourcePropType>;

export type ExerciseGifKey = keyof typeof ExerciseGifs;

export function getExerciseGif(
  assetKey: string,
): ImageSourcePropType | undefined {
  if (assetKey in ExerciseGifs) {
    return ExerciseGifs[assetKey as ExerciseGifKey];
  }

  return undefined;
}
