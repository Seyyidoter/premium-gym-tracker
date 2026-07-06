import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type {
  PreviousSetMetrics,
  PreviousSetMetricsByWorkoutExercise,
  WorkoutDetails,
  WorkoutExerciseDetails,
  WorkoutSetDetails,
  WorkoutSetMetricsPayload,
} from '@/db/repositories/workoutRepository';
import {
  addExerciseToWorkout,
  addWorkoutSet,
  applyPreviousMetricsToWorkoutExercise,
  deleteWorkoutSet,
  getPreviousSetMetricsForWorkout,
  getWorkoutDetails,
  softDeleteWorkoutExercise,
  toggleSetCompleted,
  updateSetMetrics,
} from '@/db/repositories/workoutRepository';
import { getExercisesForPicker } from '@/db/repositories/exerciseRepository';
import type { Exercise, TrackType } from '@/db/types';
import { formatReadableDate } from '@/features/calendar/dateUtils';

type MetricDraft = {
  distance_km: string;
  duration_seconds: string;
  incline: string;
  reps: string;
  weight: string;
};

export default function WorkoutScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();
  const [details, setDetails] = useState<WorkoutDetails | null>(null);
  const [previousMetricsByExercise, setPreviousMetricsByExercise] =
    useState<PreviousSetMetricsByWorkoutExercise>({});
  const [metricDrafts, setMetricDrafts] = useState<Record<string, MetricDraft>>(
    {},
  );
  const [pickerExercises, setPickerExercises] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [isExercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [isLoadingExercises, setLoadingExercises] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [isMutating, setMutating] = useState(false);
  const mutationQueueRef = useRef(Promise.resolve());

  const filteredPickerExercises = useMemo(() => {
    const searchTerm = exerciseSearch.trim().toLocaleLowerCase();

    if (!searchTerm) {
      return pickerExercises;
    }

    return pickerExercises.filter((exercise) => {
      const secondaryMuscles = exercise.secondary_muscles.join(' ');
      const searchableText = [
        exercise.name,
        exercise.primary_muscle,
        secondaryMuscles,
        exercise.category,
      ]
        .join(' ')
        .toLocaleLowerCase();

      return searchableText.includes(searchTerm);
    });
  }, [exerciseSearch, pickerExercises]);

  const loadWorkout = useCallback(async (showLoading = true) => {
    if (!workoutId) {
      return;
    }

    if (showLoading) {
      setLoading(true);
    }
    try {
      const workoutDetails = await getWorkoutDetails(workoutId);
      const previousMetrics = workoutDetails
        ? await getPreviousSetMetricsForWorkout(workoutId)
        : {};
      setDetails(workoutDetails);
      setPreviousMetricsByExercise(previousMetrics);
      setMetricDrafts(buildMetricDrafts(workoutDetails));
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkout();
    }, [loadWorkout]),
  );

  const runQueuedMutation = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T> => {
      const nextMutation = mutationQueueRef.current.then(task, task);
      mutationQueueRef.current = nextMutation.then(
        () => undefined,
        () => undefined,
      );
      return nextMutation;
    },
    [],
  );

  const updateDraft = useCallback(
    (setId: string, field: keyof MetricDraft, value: string) => {
      setMetricDrafts((current) => ({
        ...current,
        [setId]: {
          ...current[setId],
          [field]: value,
        },
      }));
    },
    [],
  );

  const saveSetMetrics = useCallback(
    async (set: WorkoutSetDetails, trackType: TrackType) => {
      const draft = metricDrafts[set.id];

      if (!draft) {
        return;
      }

      await runQueuedMutation(async () => {
        setMutating(true);
        try {
          await updateSetMetrics(set.id, buildMetricsPayload(trackType, draft));
        } finally {
          setMutating(false);
        }
      });
    },
    [metricDrafts, runQueuedMutation],
  );

  const toggleCompleted = useCallback(
    async (
      set: WorkoutSetDetails,
      trackType: TrackType,
      isCompleted: boolean,
    ) => {
      try {
        await saveSetMetrics(set, trackType);
        await runQueuedMutation(async () => {
          setMutating(true);
          try {
            await toggleSetCompleted(set.id, isCompleted);
            await loadWorkout(false);
          } finally {
            setMutating(false);
          }
        });
      } catch (error: unknown) {
        Alert.alert(
          'Set not updated',
          error instanceof Error ? error.message : 'Try again.',
        );
      }
    },
    [loadWorkout, runQueuedMutation, saveSetMetrics],
  );

  const addSet = useCallback(
    async (workoutExerciseId: string) => {
      try {
        await runQueuedMutation(async () => {
          setMutating(true);
          try {
            await addWorkoutSet(workoutExerciseId);
            await loadWorkout(false);
          } finally {
            setMutating(false);
          }
        });
      } catch (error: unknown) {
        Alert.alert(
          'Set not added',
          error instanceof Error ? error.message : 'Try again.',
        );
      }
    },
    [loadWorkout, runQueuedMutation],
  );

  const loadPickerExercises = useCallback(async () => {
    setLoadingExercises(true);
    try {
      setPickerExercises(await getExercisesForPicker());
    } finally {
      setLoadingExercises(false);
    }
  }, []);

  const openExercisePicker = useCallback(async () => {
    setExerciseSearch('');
    setExercisePickerVisible(true);
    await loadPickerExercises();
  }, [loadPickerExercises]);

  const addExercise = useCallback(
    async (exerciseId: string) => {
      if (!details) {
        return;
      }

      try {
        await runQueuedMutation(async () => {
          setMutating(true);
          try {
            await addExerciseToWorkout(details.id, exerciseId);
            setExercisePickerVisible(false);
            await loadWorkout(false);
          } finally {
            setMutating(false);
          }
        });
      } catch (error: unknown) {
        Alert.alert(
          'Exercise not added',
          error instanceof Error ? error.message : 'Try again.',
        );
      }
    },
    [details, loadWorkout, runQueuedMutation],
  );

  const usePreviousValues = useCallback(
    async (workoutExerciseId: string) => {
      try {
        const result = await runQueuedMutation(async () => {
          setMutating(true);
          try {
            const applyResult =
              await applyPreviousMetricsToWorkoutExercise(workoutExerciseId);
            await loadWorkout(false);
            return applyResult;
          } finally {
            setMutating(false);
          }
        });

        if (result.applied_sets === 0) {
          Alert.alert(
            'Previous values not applied',
            result.available_previous_sets === 0
              ? 'No previous values were found for this exercise.'
              : 'Only completed sets had previous values.',
          );
        }
      } catch (error: unknown) {
        Alert.alert(
          'Previous values not applied',
          error instanceof Error ? error.message : 'Try again.',
        );
      }
    },
    [loadWorkout, runQueuedMutation],
  );

  const confirmRemoveExercise = useCallback(
    (workoutExercise: WorkoutExerciseDetails) => {
      const completedSetCount = workoutExercise.sets.filter(
        (set) => set.is_completed,
      ).length;
      const message =
        completedSetCount > 0
          ? `Remove ${workoutExercise.exercise.name}? This also archives ${completedSetCount} completed set${completedSetCount === 1 ? '' : 's'} for this exercise.`
          : `Remove ${workoutExercise.exercise.name} from this workout? Its sets will be archived.`;

      Alert.alert('Remove exercise', message, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void runQueuedMutation(async () => {
              setMutating(true);
              try {
                await softDeleteWorkoutExercise(workoutExercise.id);
                await loadWorkout(false);
              } catch (error: unknown) {
                Alert.alert(
                  'Exercise not removed',
                  error instanceof Error ? error.message : 'Try again.',
                );
              } finally {
                setMutating(false);
              }
            });
          },
        },
      ]);
    },
    [loadWorkout, runQueuedMutation],
  );

  const confirmDeleteSet = useCallback(
    (set: WorkoutSetDetails) => {
      Alert.alert('Delete set', 'Delete this unfinished set?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void runQueuedMutation(async () => {
              setMutating(true);
              try {
                await deleteWorkoutSet(set.id);
                await loadWorkout(false);
              } catch (error: unknown) {
                Alert.alert(
                  'Set not deleted',
                  error instanceof Error ? error.message : 'Try again.',
                );
              } finally {
                setMutating(false);
              }
            });
          },
        },
      ]);
    },
    [loadWorkout, runQueuedMutation],
  );

  if (isLoading) {
    return (
      <Screen title="Workout">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!details) {
    return (
      <Screen title="Workout">
        <EmptyState
          body="This workout could not be found."
          title="Workout unavailable"
        />
      </Screen>
    );
  }

  return (
    <Screen title="Workout">
      <View style={styles.headerCard}>
        <View style={styles.headerTextColumn}>
          <Text style={styles.dateText}>
            {formatReadableDate(details.scheduled_date)}
          </Text>
          <Text style={styles.metaText}>
            {details.exercises.length} exercises
          </Text>
        </View>
        <View style={styles.workoutHeaderActions}>
          <StatusPill status={details.status} />
          <Pressable
            accessibilityRole="button"
            disabled={isMutating}
            onPress={() => {
              void openExercisePicker();
            }}
            style={[
              styles.compactActionButton,
              isMutating ? styles.disabledAction : null,
            ]}
          >
            <Text style={styles.compactActionText}>Add exercise</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {details.exercises.length === 0 ? (
          <EmptyState
            body="No exercises are attached to this workout."
            title="Empty workout"
          />
        ) : (
          details.exercises.map((workoutExercise) => (
            <ExerciseCard
              draftBySetId={metricDrafts}
              isMutating={isMutating}
              key={workoutExercise.id}
              onAddSet={() => {
                void addSet(workoutExercise.id);
              }}
              onBlurSet={saveSetMetrics}
              onDeleteSet={confirmDeleteSet}
              onRemoveExercise={() => {
                confirmRemoveExercise(workoutExercise);
              }}
              onToggleSet={toggleCompleted}
              onUpdateDraft={updateDraft}
              onUsePreviousValues={() => {
                void usePreviousValues(workoutExercise.id);
              }}
              previousMetricsBySetNumber={
                previousMetricsByExercise[workoutExercise.id] ?? {}
              }
              workoutExercise={workoutExercise}
            />
          ))
        )}
      </ScrollView>

      <ExercisePickerModal
        exercises={filteredPickerExercises}
        isLoading={isLoadingExercises}
        isMutating={isMutating}
        onClose={() => {
          setExercisePickerVisible(false);
        }}
        onSelectExercise={(exerciseId) => {
          void addExercise(exerciseId);
        }}
        onSearchChange={setExerciseSearch}
        searchValue={exerciseSearch}
        visible={isExercisePickerVisible}
      />
    </Screen>
  );
}

type ExercisePickerModalProps = {
  exercises: Exercise[];
  isLoading: boolean;
  isMutating: boolean;
  onClose: () => void;
  onSearchChange: (value: string) => void;
  onSelectExercise: (exerciseId: string) => void;
  searchValue: string;
  visible: boolean;
};

function ExercisePickerModal({
  exercises,
  isLoading,
  isMutating,
  onClose,
  onSearchChange,
  onSelectExercise,
  searchValue,
  visible,
}: ExercisePickerModalProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Add exercise</Text>
          <TextInput
            onChangeText={onSearchChange}
            placeholder="Search exercises"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchValue}
          />
          {isLoading ? (
            <View style={styles.centeredPicker}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <ScrollView contentContainerStyle={styles.exercisePickerList}>
              {exercises.length === 0 ? (
                <EmptyState
                  body="Try a different exercise name or muscle."
                  title="No exercises found"
                />
              ) : (
                exercises.map((exercise) => (
                  <Pressable
                    disabled={isMutating}
                    key={exercise.id}
                    onPress={() => onSelectExercise(exercise.id)}
                    style={({ pressed }) => [
                      styles.exercisePickerRow,
                      pressed ? styles.pressedRow : null,
                      isMutating ? styles.disabledAction : null,
                    ]}
                  >
                    <Text style={styles.exercisePickerName}>{exercise.name}</Text>
                    <Text style={styles.exercisePickerMeta}>
                      {exercise.primary_muscle} / {exercise.category}
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
          )}
          <AppButton disabled={isMutating} onPress={onClose} variant="secondary">
            Close
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

type ExerciseCardProps = {
  draftBySetId: Record<string, MetricDraft>;
  isMutating: boolean;
  onAddSet: () => void;
  onBlurSet: (set: WorkoutSetDetails, trackType: TrackType) => Promise<void>;
  onDeleteSet: (set: WorkoutSetDetails) => void;
  onRemoveExercise: () => void;
  onToggleSet: (
    set: WorkoutSetDetails,
    trackType: TrackType,
    isCompleted: boolean,
  ) => Promise<void>;
  onUpdateDraft: (
    setId: string,
    field: keyof MetricDraft,
    value: string,
  ) => void;
  onUsePreviousValues: () => void;
  previousMetricsBySetNumber: Record<number, PreviousSetMetrics>;
  workoutExercise: WorkoutExerciseDetails;
};

function ExerciseCard({
  draftBySetId,
  isMutating,
  onAddSet,
  onBlurSet,
  onDeleteSet,
  onRemoveExercise,
  onToggleSet,
  onUpdateDraft,
  onUsePreviousValues,
  previousMetricsBySetNumber,
  workoutExercise,
}: ExerciseCardProps) {
  const canUsePreviousValues = workoutExercise.sets.some(
    (set) => !set.is_completed && previousMetricsBySetNumber[set.set_number],
  );

  return (
    <View style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <View style={styles.headerTextColumn}>
          <Text style={styles.exerciseName}>{workoutExercise.exercise.name}</Text>
          <Text style={styles.metaText}>{workoutExercise.exercise.track_type}</Text>
        </View>
        <View style={styles.exerciseHeaderActions}>
          <Text style={styles.metaText}>{workoutExercise.sets.length} sets</Text>
          <Pressable
            accessibilityRole="button"
            disabled={isMutating || !canUsePreviousValues}
            onPress={onUsePreviousValues}
            style={[
              styles.usePreviousButton,
              isMutating || !canUsePreviousValues
                ? styles.usePreviousButtonDisabled
                : null,
            ]}
          >
            <Text style={styles.usePreviousText}>Use previous values</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={isMutating}
            onPress={onRemoveExercise}
            style={isMutating ? styles.disabledAction : null}
          >
            <Text style={styles.removeExerciseText}>Remove exercise</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.setList}>
        {workoutExercise.sets.map((set) => (
          <SetRow
            draft={draftBySetId[set.id] ?? createMetricDraft(set)}
            isMutating={isMutating}
            key={set.id}
            onBlur={() => onBlurSet(set, workoutExercise.exercise.track_type)}
            onDelete={() => onDeleteSet(set)}
            onToggle={() =>
              onToggleSet(
                set,
                workoutExercise.exercise.track_type,
                !set.is_completed,
              )
            }
            onUpdateDraft={(field, value) =>
              onUpdateDraft(set.id, field, value)
            }
            previousMetrics={previousMetricsBySetNumber[set.set_number]}
            set={set}
            trackType={workoutExercise.exercise.track_type}
          />
        ))}
      </View>

      <AppButton disabled={isMutating} onPress={onAddSet} variant="secondary">
        Add set
      </AppButton>
    </View>
  );
}

type SetRowProps = {
  draft: MetricDraft;
  isMutating: boolean;
  onBlur: () => Promise<void>;
  onDelete: () => void;
  onToggle: () => Promise<void>;
  onUpdateDraft: (field: keyof MetricDraft, value: string) => void;
  previousMetrics?: PreviousSetMetrics;
  set: WorkoutSetDetails;
  trackType: TrackType;
};

function SetRow({
  draft,
  isMutating,
  onBlur,
  onDelete,
  onToggle,
  onUpdateDraft,
  previousMetrics,
  set,
  trackType,
}: SetRowProps) {
  return (
    <View style={[styles.setRow, set.is_completed ? styles.completedSet : null]}>
      <View style={styles.setTopRow}>
        <View style={styles.setTitleColumn}>
          <Text style={styles.setTitle}>Set {set.set_number}</Text>
          <Text style={styles.previousText}>
            {formatPreviousMetrics(previousMetrics, trackType)}
          </Text>
        </View>
        <View style={styles.setActions}>
          <Pressable
            disabled={isMutating}
            onPress={() => {
              void onToggle();
            }}
            style={[
              styles.completeButton,
              set.is_completed ? styles.completeButtonActive : null,
            ]}
          >
            <Text
              style={[
                styles.completeButtonText,
                set.is_completed ? styles.completeButtonTextActive : null,
              ]}
            >
              {set.is_completed ? 'Done' : 'Mark done'}
            </Text>
          </Pressable>
          {!set.is_completed ? (
            <Pressable disabled={isMutating} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          ) : (
            <Text style={styles.lockedText}>Locked</Text>
          )}
        </View>
      </View>
      <MetricInputs
        draft={draft}
        onBlur={onBlur}
        onUpdateDraft={onUpdateDraft}
        trackType={trackType}
      />
    </View>
  );
}

type MetricInputsProps = {
  draft: MetricDraft;
  onBlur: () => Promise<void>;
  onUpdateDraft: (field: keyof MetricDraft, value: string) => void;
  trackType: TrackType;
};

function MetricInputs({
  draft,
  onBlur,
  onUpdateDraft,
  trackType,
}: MetricInputsProps) {
  if (trackType === 'weight_reps') {
    return (
      <View style={styles.inputGrid}>
        <MetricInput
          label="Weight"
          onBlur={onBlur}
          onChangeText={(value) => onUpdateDraft('weight', value)}
          value={draft.weight}
        />
        <MetricInput
          keyboardType="number-pad"
          label="Reps"
          onBlur={onBlur}
          onChangeText={(value) => onUpdateDraft('reps', value)}
          value={draft.reps}
        />
      </View>
    );
  }

  if (trackType === 'distance_duration_incline') {
    return (
      <View style={styles.inputGrid}>
        <MetricInput
          label="Distance km"
          onBlur={onBlur}
          onChangeText={(value) => onUpdateDraft('distance_km', value)}
          value={draft.distance_km}
        />
        <MetricInput
          label="Incline"
          onBlur={onBlur}
          onChangeText={(value) => onUpdateDraft('incline', value)}
          value={draft.incline}
        />
        <MetricInput
          keyboardType="number-pad"
          label="Seconds"
          onBlur={onBlur}
          onChangeText={(value) => onUpdateDraft('duration_seconds', value)}
          value={draft.duration_seconds}
        />
      </View>
    );
  }

  return (
    <View style={styles.inputGrid}>
      <MetricInput
        keyboardType="number-pad"
        label="Seconds"
        onBlur={onBlur}
        onChangeText={(value) => onUpdateDraft('duration_seconds', value)}
        value={draft.duration_seconds}
      />
    </View>
  );
}

type MetricInputProps = {
  keyboardType?: 'decimal-pad' | 'number-pad';
  label: string;
  onBlur: () => Promise<void>;
  onChangeText: (value: string) => void;
  value: string;
};

function MetricInput({
  keyboardType = 'decimal-pad',
  label,
  onBlur,
  onChangeText,
  value,
}: MetricInputProps) {
  return (
    <View style={styles.metricInputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onBlur={() => {
          void onBlur().catch((error: unknown) => {
            Alert.alert(
              'Set not saved',
              error instanceof Error ? error.message : 'Try again.',
            );
          });
        }}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function buildMetricDrafts(
  details: WorkoutDetails | null,
): Record<string, MetricDraft> {
  const drafts: Record<string, MetricDraft> = {};

  if (!details) {
    return drafts;
  }

  for (const exercise of details.exercises) {
    for (const set of exercise.sets) {
      drafts[set.id] = createMetricDraft(set);
    }
  }

  return drafts;
}

function createMetricDraft(set: WorkoutSetDetails): MetricDraft {
  return {
    distance_km: formatOptionalNumber(set.metrics?.distance_km ?? null),
    duration_seconds: formatOptionalNumber(
      set.metrics?.duration_seconds ?? null,
    ),
    incline: formatOptionalNumber(set.metrics?.incline ?? null),
    reps: formatOptionalNumber(set.metrics?.reps ?? null),
    weight: formatOptionalNumber(set.metrics?.weight ?? null),
  };
}

function buildMetricsPayload(
  trackType: TrackType,
  draft: MetricDraft,
): WorkoutSetMetricsPayload {
  if (trackType === 'weight_reps') {
    return {
      weight: parseOptionalNumber(draft.weight),
      reps: parseOptionalInteger(draft.reps),
      distance_km: null,
      incline: null,
      duration_seconds: null,
    };
  }

  if (trackType === 'distance_duration_incline') {
    return {
      weight: null,
      reps: null,
      distance_km: parseOptionalNumber(draft.distance_km),
      incline: parseOptionalNumber(draft.incline),
      duration_seconds: parseOptionalInteger(draft.duration_seconds),
    };
  }

  return {
    weight: null,
    reps: null,
    distance_km: null,
    incline: null,
    duration_seconds: parseOptionalInteger(draft.duration_seconds),
  };
}

function parseOptionalNumber(value: string): number | null {
  const normalizedValue = value.replace(',', '.').trim();

  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);

  if (Number.isNaN(parsed)) {
    throw new Error('Enter a valid number.');
  }

  return parsed;
}

function parseOptionalInteger(value: string): number | null {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  const parsed = Number(normalizedValue);

  if (!Number.isInteger(parsed)) {
    throw new Error('Enter a whole number.');
  }

  return parsed;
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

function formatPreviousMetrics(
  previousMetrics: PreviousSetMetrics | undefined,
  trackType: TrackType,
): string {
  if (!previousMetrics) {
    return 'Previous: No previous';
  }

  const { metrics } = previousMetrics;

  if (trackType === 'weight_reps') {
    return `Previous: ${formatPreviousValue(metrics.weight)} x ${formatPreviousValue(metrics.reps)}`;
  }

  if (trackType === 'distance_duration_incline') {
    return `Previous: ${formatPreviousValue(metrics.distance_km, ' km')} / ${formatPreviousValue(metrics.incline, ' incline')} / ${formatPreviousValue(metrics.duration_seconds, 's')}`;
  }

  return `Previous: ${formatPreviousValue(metrics.duration_seconds, 's')}`;
}

function formatPreviousValue(value: number | null, suffix = ''): string {
  return value === null ? '-' : `${value}${suffix}`;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  headerCard: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  headerTextColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  workoutHeaderActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  compactActionButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  compactActionText: {
    ...typography.caption,
    color: colors.accent,
  },
  disabledAction: {
    opacity: 0.45,
  },
  dateText: {
    ...typography.heading,
    color: colors.text,
  },
  metaText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  exerciseHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  exerciseHeaderActions: {
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  exerciseName: {
    ...typography.heading,
    color: colors.text,
  },
  usePreviousButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  usePreviousButtonDisabled: {
    opacity: 0.45,
  },
  usePreviousText: {
    ...typography.caption,
    color: colors.accent,
    textAlign: 'center',
  },
  removeExerciseText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'right',
  },
  setList: {
    gap: spacing.sm,
  },
  setRow: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  completedSet: {
    borderColor: colors.accent,
  },
  setTopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  setTitleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  setTitle: {
    ...typography.body,
    color: colors.text,
  },
  previousText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  setActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  completeButton: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completeButtonActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  completeButtonText: {
    ...typography.caption,
    color: colors.text,
  },
  completeButtonTextActive: {
    color: colors.background,
  },
  deleteText: {
    ...typography.caption,
    color: colors.danger,
  },
  lockedText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  inputGrid: {
    gap: spacing.sm,
  },
  metricInputWrap: {
    gap: spacing.xs,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    maxHeight: '78%',
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
  },
  searchInput: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    color: colors.text,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  centeredPicker: {
    alignItems: 'center',
    minHeight: 120,
    justifyContent: 'center',
  },
  exercisePickerList: {
    gap: spacing.sm,
  },
  exercisePickerRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  pressedRow: {
    opacity: 0.72,
  },
  exercisePickerName: {
    ...typography.body,
    color: colors.text,
  },
  exercisePickerMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
