import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type {
  WorkoutHistoryItem,
  WorkoutHistoryStatusFilter,
  WorkoutHistorySummary,
} from '@/db/repositories/workoutRepository';
import {
  getWorkoutHistorySummary,
  listWorkoutHistory,
} from '@/db/repositories/workoutRepository';
import { formatReadableDate } from '@/features/calendar/dateUtils';

const statusFilters: { label: string; value: WorkoutHistoryStatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Planned', value: 'planned' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
];

const emptySummary: WorkoutHistorySummary = {
  completed_sets: 0,
  completed_workouts: 0,
  last_completed_workout_date: null,
  total_cardio_distance_km: 0,
  total_cardio_duration_seconds: 0,
  total_strength_volume: 0,
  total_workouts: 0,
  workouts_this_week: 0,
};

export default function HistoryScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] =
    useState<WorkoutHistoryStatusFilter>('all');
  const [summary, setSummary] = useState<WorkoutHistorySummary>(emptySummary);
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const nextSummary = await getWorkoutHistorySummary();
      const nextWorkouts = await listWorkoutHistory({
        status: selectedStatus,
      });

      setSummary(nextSummary);
      setWorkouts(nextWorkouts);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  return (
    <Screen title="History">
      <FlatList
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <EmptyState
              body="Workouts will appear here once you plan or complete them."
              title="No workouts"
            />
          )
        }
        ListHeaderComponent={
          <HistoryHeader
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            summary={summary}
          />
        }
        contentContainerStyle={styles.listContent}
        data={isLoading ? [] : workouts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutHistoryCard
            item={item}
            onPress={() => {
              router.push(`/workout/${item.id}`);
            }}
          />
        )}
      />
    </Screen>
  );
}

type HistoryHeaderProps = {
  selectedStatus: WorkoutHistoryStatusFilter;
  setSelectedStatus: (status: WorkoutHistoryStatusFilter) => void;
  summary: WorkoutHistorySummary;
};

function HistoryHeader({
  selectedStatus,
  setSelectedStatus,
  summary,
}: HistoryHeaderProps) {
  return (
    <View style={styles.headerStack}>
      <View style={styles.summaryGrid}>
        <SummaryCard label="Total workouts" value={String(summary.total_workouts)} />
        <SummaryCard
          label="Completed"
          value={String(summary.completed_workouts)}
        />
        <SummaryCard
          label="This week"
          value={String(summary.workouts_this_week)}
        />
        <SummaryCard label="Completed sets" value={String(summary.completed_sets)} />
        <SummaryCard
          label="Strength volume"
          value={formatNumber(summary.total_strength_volume)}
        />
        <SummaryCard
          label="Cardio distance"
          value={`${formatNumber(summary.total_cardio_distance_km)} km`}
        />
        <SummaryCard
          label="Cardio duration"
          value={formatDuration(summary.total_cardio_duration_seconds)}
        />
        <SummaryCard
          label="Last completed"
          value={
            summary.last_completed_workout_date
              ? formatReadableDate(summary.last_completed_workout_date)
              : 'None'
          }
        />
      </View>

      <View style={styles.filterRow}>
        {statusFilters.map((filter) => {
          const isSelected = filter.value === selectedStatus;

          return (
            <Pressable
              key={filter.value}
              onPress={() => {
                setSelectedStatus(filter.value);
              }}
              style={({ pressed }) => [
                styles.filterButton,
                isSelected ? styles.filterButtonSelected : null,
                pressed ? styles.pressed : null,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  isSelected ? styles.filterTextSelected : null,
                ]}
              >
                {filter.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type SummaryCardProps = {
  label: string;
  value: string;
};

function SummaryCard({ label, value }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

type WorkoutHistoryCardProps = {
  item: WorkoutHistoryItem;
  onPress: () => void;
};

function WorkoutHistoryCard({ item, onPress }: WorkoutHistoryCardProps) {
  const statParts = getWorkoutStatParts(item);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.workoutCard,
        pressed ? styles.pressed : null,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleColumn}>
          <Text style={styles.workoutTitle}>
            {item.routine_name ?? 'Planned workout'}
          </Text>
          <Text style={styles.workoutDate}>
            {formatReadableDate(item.scheduled_date)}
          </Text>
        </View>
        <StatusPill status={item.status} />
      </View>

      <View style={styles.metricRow}>
        <Metric label="Exercises" value={String(item.exercise_count)} />
        <Metric label="Sets" value={String(item.set_count)} />
        <Metric
          label="Done"
          value={`${item.completed_set_count}/${item.set_count}`}
        />
      </View>

      <Text style={styles.statLine}>
        {statParts.length > 0 ? statParts.join(' / ') : 'No logged metrics yet'}
      </Text>
    </Pressable>
  );
}

type MetricProps = {
  label: string;
  value: string;
};

function Metric({ label, value }: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function getWorkoutStatParts(item: WorkoutHistoryItem): string[] {
  const parts: string[] = [];

  if (item.total_strength_volume > 0) {
    parts.push(`${formatNumber(item.total_strength_volume)} volume`);
  }

  if (item.total_cardio_distance_km > 0) {
    parts.push(`${formatNumber(item.total_cardio_distance_km)} km`);
  }

  if (item.total_cardio_duration_seconds > 0) {
    parts.push(formatDuration(item.total_cardio_duration_seconds));
  }

  return parts;
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0 min';
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remainingSeconds}s`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    minHeight: 160,
    justifyContent: 'center',
  },
  headerStack: {
    gap: spacing.md,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 78,
    padding: spacing.md,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.heading,
    color: colors.text,
  },
  filterRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  filterButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: spacing.xs,
  },
  filterButtonSelected: {
    backgroundColor: colors.surfaceMuted,
  },
  filterText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  filterTextSelected: {
    color: colors.accent,
  },
  workoutCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  pressed: {
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
  workoutDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metric: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flex: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  metricValue: {
    ...typography.body,
    color: colors.text,
  },
  metricLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  statLine: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
