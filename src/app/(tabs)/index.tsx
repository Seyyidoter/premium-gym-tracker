import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type { WorkoutSummary } from '@/db/repositories/workoutRepository';
import { listWorkoutSummariesByDate } from '@/db/repositories/workoutRepository';
import {
  addDays,
  formatReadableDate,
  todayDateKey,
} from '@/features/calendar/dateUtils';

const PAGE_RADIUS = 7;
const INITIAL_PAGE = PAGE_RADIUS;

export default function TodayScreen() {
  const today = useMemo(() => todayDateKey(), []);
  const pageOffsets = useMemo(
    () =>
      Array.from({ length: PAGE_RADIUS * 2 + 1 }, (_, index) => {
        return index - PAGE_RADIUS;
      }),
    [],
  );
  const [selectedOffset, setSelectedOffset] = useState(0);
  const selectedDateKey = addDays(today, selectedOffset);

  return (
    <Screen title="Premium Gym Tracker">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.dateLabel}>Selected day</Text>
          <Text style={styles.dateTitle}>
            {formatReadableDate(selectedDateKey)}
          </Text>
        </View>
        <Text style={styles.hint}>Swipe</Text>
      </View>
      <PagerView
        initialPage={INITIAL_PAGE}
        onPageSelected={(event) => {
          setSelectedOffset(event.nativeEvent.position - INITIAL_PAGE);
        }}
        style={styles.pager}
      >
        {pageOffsets.map((offset) => {
          const dateKey = addDays(today, offset);

          return (
            <View key={dateKey} style={styles.page}>
              <DayWorkoutList dateKey={dateKey} />
            </View>
          );
        })}
      </PagerView>
    </Screen>
  );
}

type DayWorkoutListProps = {
  dateKey: string;
};

function DayWorkoutList({ dateKey }: DayWorkoutListProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);

  const loadWorkouts = useCallback(async () => {
    setIsLoading(true);
    try {
      setWorkouts(await listWorkoutSummariesByDate(dateKey));
    } finally {
      setIsLoading(false);
    }
  }, [dateKey]);

  useFocusEffect(
    useCallback(() => {
      void loadWorkouts();
    }, [loadWorkouts]),
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (workouts.length === 0) {
    return (
      <EmptyState
        body="No planned workout for this day yet. Assign a routine from the calendar when you are ready."
        title="No workout"
      />
    );
  }

  return (
    <View style={styles.list}>
      {workouts.map((workout) => (
        <Pressable
          key={workout.id}
          onPress={() => {
            router.push(`/workout/${workout.id}`);
          }}
          style={({ pressed }) => [
            styles.workoutCard,
            pressed ? styles.pressedCard : null,
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleColumn}>
              <Text style={styles.workoutTitle}>
                {workout.routine_name ?? 'Planned workout'}
              </Text>
              <Text style={styles.workoutMeta}>
                {workout.exercise_count} exercises / {workout.set_count} sets
              </Text>
            </View>
            <StatusPill status={workout.status} />
          </View>
          <Text style={styles.progressText}>
            {workout.completed_set_count} / {workout.set_count} sets completed
          </Text>
          <Text style={styles.openText}>Open workout</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  dateLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  dateTitle: {
    ...typography.heading,
    color: colors.text,
    marginTop: spacing.xs,
  },
  hint: {
    ...typography.caption,
    color: colors.accent,
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
    paddingTop: spacing.md,
  },
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    gap: spacing.md,
  },
  workoutCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  pressedCard: {
    opacity: 0.72,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  workoutTitle: {
    ...typography.heading,
    color: colors.text,
  },
  workoutMeta: {
    ...typography.body,
    color: colors.textMuted,
  },
  progressText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  openText: {
    ...typography.caption,
    color: colors.accent,
  },
});
