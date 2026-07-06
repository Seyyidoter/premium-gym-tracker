import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { getExerciseGif } from '@/assets/assets_index';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import { listExercisesForLibrary } from '@/db/repositories/exerciseRepository';
import type { Exercise, TrackType } from '@/db/types';

const trackTypeLabels: Record<TrackType, string> = {
  distance_duration_incline: 'Distance',
  duration_only: 'Duration',
  weight_reps: 'Weight',
};

export default function ExerciseLibraryScreen() {
  const router = useRouter();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isLoading, setLoading] = useState(true);

  const filteredExercises = useMemo(() => {
    const searchTerm = searchText.trim().toLocaleLowerCase();

    if (!searchTerm) {
      return exercises;
    }

    return exercises.filter((exercise) => {
      const searchableText = [
        exercise.name,
        exercise.primary_muscle,
        exercise.secondary_muscles.join(' '),
        exercise.category,
      ]
        .join(' ')
        .toLocaleLowerCase();

      return searchableText.includes(searchTerm);
    });
  }, [exercises, searchText]);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      setExercises(await listExercisesForLibrary());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadExercises();
    }, [loadExercises]),
  );

  const updateSearch = useCallback(
    (value: string) => {
      setSearchText(value);
    },
    [],
  );

  const renderExercise = useCallback<ListRenderItem<Exercise>>(
    ({ item: exercise }) => (
      <ExerciseRow
        exercise={exercise}
        onPress={() => {
          router.push(`/exercise/${exercise.id}`);
        }}
      />
    ),
    [router],
  );

  return (
    <Screen title="Exercises">
      <View style={styles.searchShell}>
        <TextInput
          onChangeText={updateSearch}
          placeholder="Search exercise, muscle, or category"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          value={searchText}
        />
      </View>

      {isLoading ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading library</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={filteredExercises}
          keyExtractor={(exercise) => exercise.id}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              body="Search another exercise, muscle, or category."
              title="No exercises found"
            />
          }
          renderItem={renderExercise}
        />
      )}
    </Screen>
  );
}

type ExerciseRowProps = {
  exercise: Exercise;
  onPress: () => void;
};

function ExerciseRow({ exercise, onPress }: ExerciseRowProps) {
  const hasMedia = Boolean(getExerciseGif(exercise.asset_key));

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.exerciseRow,
        pressed ? styles.pressedRow : null,
      ]}
    >
      <View style={styles.exerciseTextColumn}>
        <Text style={styles.exerciseName}>{exercise.name}</Text>
        <Text style={styles.exerciseMeta}>
          {exercise.primary_muscle} / {exercise.category}
        </Text>
      </View>
      <View style={styles.badgeColumn}>
        <TrackTypePill trackType={exercise.track_type} />
        {hasMedia ? (
          <View style={styles.mediaPill}>
            <Text style={styles.mediaPillText}>Media</Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

type TrackTypePillProps = {
  trackType: TrackType;
};

function TrackTypePill({ trackType }: TrackTypePillProps) {
  return (
    <View style={styles.trackPill}>
      <Text style={styles.trackPillText}>{trackTypeLabels[trackType]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  searchShell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    ...typography.body,
    backgroundColor: 'transparent',
    color: colors.text,
    minHeight: 48,
  },
  loadingPanel: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.sm,
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xl,
  },
  exerciseRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    minHeight: 80,
    padding: spacing.md,
  },
  pressedRow: {
    opacity: 0.72,
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
  badgeColumn: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  trackPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  trackPillText: {
    ...typography.caption,
    color: colors.text,
  },
  mediaPill: {
    alignSelf: 'flex-end',
    borderColor: colors.accent,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  mediaPillText: {
    ...typography.caption,
    color: colors.accent,
  },
});
