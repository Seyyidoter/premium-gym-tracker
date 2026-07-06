import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
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
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import { listExercises } from '@/db/repositories/exerciseRepository';
import type {
  RoutineDetails,
  RoutineListItem,
  RoutineTemplateExerciseInput,
} from '@/db/repositories/routineRepository';
import {
  createRoutineTemplate,
  getRoutineDetails,
  listRoutineSummaries,
  softDeleteRoutine,
  updateRoutineTemplate,
} from '@/db/repositories/routineRepository';
import type {
  Exercise,
  RoutineSet,
  TrackType,
} from '@/db/types';

type DraftSet = {
  localId: string;
  targetDistanceKm: string;
  targetDurationSeconds: string;
  targetIncline: string;
  targetReps: string;
  targetWeight: string;
};

type DraftRoutineExercise = {
  exercise: Exercise;
  isExpanded: boolean;
  localId: string;
  sets: DraftSet[];
};

export default function RoutinesScreen() {
  const [routineName, setRoutineName] = useState('');
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [draftExercises, setDraftExercises] = useState<DraftRoutineExercise[]>(
    [],
  );
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [routines, setRoutines] = useState<RoutineListItem[]>([]);
  const [isExercisePickerVisible, setExercisePickerVisible] = useState(false);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [isSaving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const exerciseList = await listExercises();
    const routineList = await listRoutineSummaries();

    setExercises(exerciseList);
    setRoutines(routineList);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData]),
  );

  const filteredExercises = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();

    return exercises.filter((exercise) => {
      return (
        !query ||
        exercise.name.toLowerCase().includes(query) ||
        exercise.primary_muscle.toLowerCase().includes(query) ||
        exercise.category.toLowerCase().includes(query)
      );
    });
  }, [exerciseSearch, exercises]);

  const resetBuilder = useCallback(() => {
    setEditingRoutineId(null);
    setRoutineName('');
    setDraftExercises([]);
  }, []);

  const addExerciseToDraft = useCallback((exercise: Exercise) => {
    setDraftExercises((current) => [
      ...current.map((item) => ({ ...item, isExpanded: false })),
      {
        exercise,
        isExpanded: true,
        localId: `${exercise.id}-${Date.now()}`,
        sets: getDefaultDraftSets(exercise.track_type),
      },
    ]);
    setExercisePickerVisible(false);
    setExerciseSearch('');
  }, []);

  const loadRoutineForEdit = useCallback(async (routineId: string) => {
    const routine = await getRoutineDetails(routineId);

    if (!routine) {
      Alert.alert('Routine not found', 'This routine is no longer available.');
      await loadData();
      return;
    }

    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setDraftExercises(mapRoutineDetailsToDraft(routine));
  }, [loadData]);

  const confirmDeleteRoutine = useCallback(
    (routine: RoutineListItem) => {
      Alert.alert(
        'Delete routine',
        `Delete "${routine.name}" from saved templates?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              void deleteRoutine(routine.id);
            },
          },
        ],
      );
    },
    [],
  );

  const deleteRoutine = useCallback(
    async (routineId: string) => {
      await softDeleteRoutine(routineId);

      if (editingRoutineId === routineId) {
        resetBuilder();
      }

      await loadData();
    },
    [editingRoutineId, loadData, resetBuilder],
  );

  const saveRoutine = useCallback(async () => {
    if (!routineName.trim()) {
      Alert.alert('Routine name missing', 'Enter a routine name first.');
      return;
    }

    if (draftExercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to the routine.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: routineName,
        exercises: buildTemplateExercises(draftExercises),
      };

      if (editingRoutineId) {
        await updateRoutineTemplate(editingRoutineId, payload);
      } else {
        await createRoutineTemplate(payload);
      }

      resetBuilder();
      await loadData();
    } catch (error: unknown) {
      Alert.alert(
        'Routine not saved',
        error instanceof Error ? error.message : 'Check the target values.',
      );
    } finally {
      setSaving(false);
    }
  }, [draftExercises, editingRoutineId, loadData, resetBuilder, routineName]);

  return (
    <Screen title="Routines">
      <View style={styles.shell}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleColumn}>
                <Text style={styles.sectionTitle}>Saved templates</Text>
                <Text style={styles.helperText}>
                  Edit, delete, or assign from Calendar.
                </Text>
              </View>
              <AppButton onPress={resetBuilder} variant="secondary">
                New
              </AppButton>
            </View>
            {routines.length === 0 ? (
              <EmptyState
                body="Build your first template below. It will be available in Calendar immediately."
                title="No templates yet"
              />
            ) : (
              routines.map((routine) => (
                <View key={routine.id} style={styles.savedRoutine}>
                  <View style={styles.exerciseTextColumn}>
                    <Text style={styles.exerciseName}>{routine.name}</Text>
                    <Text style={styles.exerciseMeta}>
                      {routine.exercise_count} exercises / {routine.set_count} sets
                    </Text>
                  </View>
                  <View style={styles.actionRow}>
                    <AppButton
                      onPress={() => {
                        void loadRoutineForEdit(routine.id);
                      }}
                      variant="secondary"
                    >
                      Edit
                    </AppButton>
                    <AppButton
                      onPress={() => confirmDeleteRoutine(routine)}
                      variant="ghost"
                    >
                      Delete
                    </AppButton>
                  </View>
                </View>
              ))
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {editingRoutineId ? 'Edit routine' : 'New routine'}
            </Text>
            <TextInput
              onChangeText={setRoutineName}
              placeholder="Routine name"
              placeholderTextColor={colors.textMuted}
              style={styles.input}
              value={routineName}
            />
            <AppButton
              onPress={() => {
                setExercisePickerVisible(true);
              }}
              variant="secondary"
            >
              Add exercise
            </AppButton>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {draftExercises.length === 0 ? (
              <EmptyState
                body="Tap Add exercise and pick from the searchable list."
                title="No exercises in this routine"
              />
            ) : (
              draftExercises.map((draftExercise, exerciseIndex) => (
                <ExerciseCard
                  draftExercise={draftExercise}
                  exerciseIndex={exerciseIndex}
                  key={draftExercise.localId}
                  onAddSet={() => {
                    setDraftExercises((current) =>
                      current.map((item) =>
                        item.localId === draftExercise.localId
                          ? {
                              ...item,
                              isExpanded: true,
                              sets: [
                                ...item.sets,
                                createDefaultDraftSet(item.exercise.track_type),
                              ],
                            }
                          : item,
                      ),
                    );
                  }}
                  onRemove={() => {
                    setDraftExercises((current) =>
                      current.filter(
                        (item) => item.localId !== draftExercise.localId,
                      ),
                    );
                  }}
                  onRemoveSet={(setIndex) => {
                    setDraftExercises((current) =>
                      current.map((item) =>
                        item.localId === draftExercise.localId
                          ? {
                              ...item,
                              sets: item.sets.filter(
                                (_, index) => index !== setIndex,
                              ),
                            }
                          : item,
                      ),
                    );
                  }}
                  onToggle={() => {
                    setDraftExercises((current) =>
                      current.map((item) =>
                        item.localId === draftExercise.localId
                          ? { ...item, isExpanded: !item.isExpanded }
                          : item,
                      ),
                    );
                  }}
                  onUpdateSet={(setIndex, field, value) => {
                    setDraftExercises((current) =>
                      current.map((item) =>
                        item.localId === draftExercise.localId
                          ? {
                              ...item,
                              sets: item.sets.map((set, index) =>
                                index === setIndex
                                  ? { ...set, [field]: value }
                                  : set,
                              ),
                            }
                          : item,
                      ),
                    );
                  }}
                />
              ))
            )}
          </View>
        </ScrollView>

        <View style={styles.stickyBar}>
          {editingRoutineId ? (
            <AppButton disabled={isSaving} onPress={resetBuilder} variant="secondary">
              Cancel
            </AppButton>
          ) : null}
          <AppButton disabled={isSaving} onPress={saveRoutine}>
            {editingRoutineId ? 'Save changes' : 'Save routine'}
          </AppButton>
        </View>
      </View>

      <ExercisePickerModal
        exerciseSearch={exerciseSearch}
        exercises={filteredExercises}
        onChangeExerciseSearch={setExerciseSearch}
        onClose={() => {
          setExercisePickerVisible(false);
        }}
        onSelectExercise={addExerciseToDraft}
        visible={isExercisePickerVisible}
      />
    </Screen>
  );
}

type ExerciseCardProps = {
  draftExercise: DraftRoutineExercise;
  exerciseIndex: number;
  onAddSet: () => void;
  onRemove: () => void;
  onRemoveSet: (setIndex: number) => void;
  onToggle: () => void;
  onUpdateSet: (setIndex: number, field: keyof DraftSet, value: string) => void;
};

function ExerciseCard({
  draftExercise,
  exerciseIndex,
  onAddSet,
  onRemove,
  onRemoveSet,
  onToggle,
  onUpdateSet,
}: ExerciseCardProps) {
  return (
    <View style={styles.exerciseCard}>
      <Pressable onPress={onToggle} style={styles.exerciseCardHeader}>
        <View style={styles.exerciseTextColumn}>
          <Text style={styles.exerciseName}>
            {exerciseIndex + 1}. {draftExercise.exercise.name}
          </Text>
          <Text style={styles.exerciseMeta}>
            {draftExercise.exercise.track_type} / {draftExercise.sets.length} sets
          </Text>
        </View>
        <Text style={styles.expandLabel}>
          {draftExercise.isExpanded ? 'Hide' : 'Edit'}
        </Text>
      </Pressable>

      {draftExercise.isExpanded ? (
        <View style={styles.setList}>
          {draftExercise.sets.length === 0 ? (
            <EmptyState
              body="Add at least one target set before saving."
              title="No sets"
            />
          ) : (
            draftExercise.sets.map((set, setIndex) => (
              <View key={set.localId} style={styles.setCard}>
                <View style={styles.setHeader}>
                  <Text style={styles.setTitle}>Set {setIndex + 1}</Text>
                  <AppButton
                    onPress={() => onRemoveSet(setIndex)}
                    variant="ghost"
                  >
                    Remove
                  </AppButton>
                </View>
                <SetTargetInputs
                  draftSet={set}
                  onUpdate={(field, value) => {
                    onUpdateSet(setIndex, field, value);
                  }}
                  trackType={draftExercise.exercise.track_type}
                />
              </View>
            ))
          )}
          <View style={styles.actionRow}>
            <AppButton onPress={onAddSet} variant="secondary">
              Add set
            </AppButton>
            <AppButton onPress={onRemove} variant="ghost">
              Remove exercise
            </AppButton>
          </View>
        </View>
      ) : null}
    </View>
  );
}

type SetTargetInputsProps = {
  draftSet: DraftSet;
  onUpdate: (field: keyof DraftSet, value: string) => void;
  trackType: TrackType;
};

function SetTargetInputs({
  draftSet,
  onUpdate,
  trackType,
}: SetTargetInputsProps) {
  if (trackType === 'weight_reps') {
    return (
      <View style={styles.inputGrid}>
        <TargetInput
          label="Weight"
          onChangeText={(value) => onUpdate('targetWeight', value)}
          value={draftSet.targetWeight}
        />
        <TargetInput
          keyboardType="number-pad"
          label="Reps"
          onChangeText={(value) => onUpdate('targetReps', value)}
          value={draftSet.targetReps}
        />
      </View>
    );
  }

  if (trackType === 'distance_duration_incline') {
    return (
      <View style={styles.inputGrid}>
        <TargetInput
          label="Distance km"
          onChangeText={(value) => onUpdate('targetDistanceKm', value)}
          value={draftSet.targetDistanceKm}
        />
        <TargetInput
          label="Incline"
          onChangeText={(value) => onUpdate('targetIncline', value)}
          value={draftSet.targetIncline}
        />
        <TargetInput
          keyboardType="number-pad"
          label="Seconds"
          onChangeText={(value) => onUpdate('targetDurationSeconds', value)}
          value={draftSet.targetDurationSeconds}
        />
      </View>
    );
  }

  return (
    <View style={styles.inputGrid}>
      <TargetInput
        keyboardType="number-pad"
        label="Seconds"
        onChangeText={(value) => onUpdate('targetDurationSeconds', value)}
        value={draftSet.targetDurationSeconds}
      />
    </View>
  );
}

type TargetInputProps = {
  keyboardType?: 'decimal-pad' | 'number-pad';
  label: string;
  onChangeText: (value: string) => void;
  value: string;
};

function TargetInput({
  keyboardType = 'decimal-pad',
  label,
  onChangeText,
  value,
}: TargetInputProps) {
  return (
    <View style={styles.targetInputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder="0"
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

type ExercisePickerModalProps = {
  exerciseSearch: string;
  exercises: Exercise[];
  onChangeExerciseSearch: (search: string) => void;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  visible: boolean;
};

function ExercisePickerModal({
  exerciseSearch,
  exercises,
  onChangeExerciseSearch,
  onClose,
  onSelectExercise,
  visible,
}: ExercisePickerModalProps) {
  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.sectionTitle}>Exercise picker</Text>
          <TextInput
            onChangeText={onChangeExerciseSearch}
            placeholder="Search by exercise or muscle"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={exerciseSearch}
          />
          <ScrollView contentContainerStyle={styles.modalList}>
            {exercises.length === 0 ? (
              <EmptyState
                body="Try clearing filters or searching another term."
                title="No exercises"
              />
            ) : (
              exercises.map((exercise) => (
                <Pressable
                  key={exercise.id}
                  onPress={() => onSelectExercise(exercise)}
                  style={({ pressed }) => [
                    styles.pickerExerciseRow,
                    pressed ? styles.pressed : null,
                  ]}
                >
                  <Text style={styles.exerciseName}>{exercise.name}</Text>
                  <Text style={styles.exerciseMeta}>
                    {exercise.primary_muscle} / {exercise.category}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
          <AppButton onPress={onClose} variant="secondary">
            Close
          </AppButton>
        </View>
      </View>
    </Modal>
  );
}

function getDefaultDraftSets(trackType: TrackType): DraftSet[] {
  const count = trackType === 'weight_reps' ? 3 : 1;

  return Array.from({ length: count }, () => createDefaultDraftSet(trackType));
}

function createDefaultDraftSet(trackType: TrackType): DraftSet {
  return {
    localId: `${Date.now()}-${Math.random()}`,
    targetDistanceKm: trackType === 'distance_duration_incline' ? '1' : '',
    targetDurationSeconds: trackType === 'weight_reps' ? '' : '600',
    targetIncline: trackType === 'distance_duration_incline' ? '0' : '',
    targetReps: trackType === 'weight_reps' ? '10' : '',
    targetWeight: trackType === 'weight_reps' ? '20' : '',
  };
}

function mapRoutineDetailsToDraft(
  routine: RoutineDetails,
): DraftRoutineExercise[] {
  return routine.exercises.map((routineExercise, index) => ({
    exercise: routineExercise.exercise,
    isExpanded: index === 0,
    localId: routineExercise.id,
    sets:
      routineExercise.sets.length > 0
        ? routineExercise.sets.map(mapRoutineSetToDraft)
        : getDefaultDraftSets(routineExercise.exercise.track_type),
  }));
}

function mapRoutineSetToDraft(routineSet: RoutineSet): DraftSet {
  return {
    localId: routineSet.id,
    targetDistanceKm: formatOptionalNumber(routineSet.target_distance_km),
    targetDurationSeconds: formatOptionalNumber(
      routineSet.target_duration_seconds,
    ),
    targetIncline: formatOptionalNumber(routineSet.target_incline),
    targetReps: formatOptionalNumber(routineSet.target_reps),
    targetWeight: formatOptionalNumber(routineSet.target_weight),
  };
}

function buildTemplateExercises(
  draftExercises: DraftRoutineExercise[],
): RoutineTemplateExerciseInput[] {
  return draftExercises.map((draftExercise, exerciseIndex) => {
    if (draftExercise.sets.length === 0) {
      throw new Error(`${draftExercise.exercise.name} needs at least one set.`);
    }

    return {
      exercise_id: draftExercise.exercise.id,
      order_index: exerciseIndex,
      sets: draftExercise.sets.map((set, setIndex) =>
        buildTemplateSet(draftExercise.exercise.track_type, set, setIndex),
      ),
    };
  });
}

function buildTemplateSet(
  trackType: TrackType,
  set: DraftSet,
  setIndex: number,
): RoutineTemplateExerciseInput['sets'][number] {
  return {
    set_number: setIndex + 1,
    target_weight:
      trackType === 'weight_reps'
        ? parseRequiredNumber(set.targetWeight, 'Target weight')
        : null,
    target_reps:
      trackType === 'weight_reps'
        ? parsePositiveInteger(set.targetReps, 'Target reps')
        : null,
    target_distance_km:
      trackType === 'distance_duration_incline'
        ? parseRequiredNumber(set.targetDistanceKm, 'Target distance')
        : null,
    target_incline:
      trackType === 'distance_duration_incline'
        ? parseRequiredNumber(set.targetIncline, 'Target incline')
        : null,
    target_duration_seconds:
      trackType === 'duration_only' ||
      trackType === 'distance_duration_incline'
        ? parsePositiveInteger(set.targetDurationSeconds, 'Target duration')
        : null,
  };
}

function formatOptionalNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

function parseRequiredNumber(value: string, field: string): number {
  const normalizedValue = value.replace(',', '.').trim();
  const numberValue = Number(normalizedValue);

  if (!normalizedValue || Number.isNaN(numberValue)) {
    throw new Error(`${field} must be a number.`);
  }

  return numberValue;
}

function parsePositiveInteger(value: string, field: string): number {
  const numberValue = Number(value.trim());

  if (!Number.isInteger(numberValue) || numberValue <= 0) {
    throw new Error(`${field} must be a positive whole number.`);
  }

  return numberValue;
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: 96,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  sectionTitleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  helperText: {
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
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  exerciseTextColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  exerciseName: {
    ...typography.body,
    color: colors.text,
  },
  exerciseMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  savedRoutine: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  exerciseCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  expandLabel: {
    ...typography.caption,
    color: colors.accent,
  },
  setList: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  setCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  setHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  setTitle: {
    ...typography.body,
    color: colors.text,
  },
  inputGrid: {
    gap: spacing.sm,
  },
  targetInputWrap: {
    gap: spacing.xs,
  },
  stickyBar: {
    backgroundColor: colors.background,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    bottom: 0,
    flexDirection: 'row',
    gap: spacing.sm,
    left: 0,
    paddingTop: spacing.md,
    position: 'absolute',
    right: 0,
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
    maxHeight: '86%',
    padding: spacing.lg,
  },
  modalList: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  pickerExerciseRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  pressed: {
    opacity: 0.72,
  },
});
