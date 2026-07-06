import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

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

  return (
    <Screen title="Exercises">
      <TextInput
        onChangeText={updateSearch}
        placeholder="Search by exercise, muscle, or category"
        placeholderTextColor={colors.textMuted}
        style={styles.searchInput}
        value={searchText}
      />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filteredExercises.length === 0 ? (
            <EmptyState
              body="Try a different exercise name, muscle, or category."
              title="No exercises found"
            />
          ) : (
            filteredExercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                onPress={() => {
                  router.push(`/exercise/${exercise.id}`);
                }}
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
                <TrackTypePill trackType={exercise.track_type} />
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
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
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
    minHeight: 72,
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
});
