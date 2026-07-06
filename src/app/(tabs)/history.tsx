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
  WeeklyWorkoutSummary,
  WorkoutHistoryItem,
  WorkoutHistoryStatusFilter,
  WorkoutHistorySummary,
} from '@/db/repositories/workoutRepository';
import {
  getWeeklyWorkoutSummary,
  getWorkoutHistorySummary,
  listWorkoutHistory,
} from '@/db/repositories/workoutRepository';
import {
  formatCount,
  formatDate,
  formatDistanceKm,
  formatDuration,
  formatVolumeKg,
} from '@/features/history/formatters';

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

const emptyWeeklySummary: WeeklyWorkoutSummary = {
  completed_sets: 0,
  completed_workouts: 0,
  total_cardio_distance_km: 0,
  total_cardio_duration_seconds: 0,
  total_strength_volume: 0,
  total_workouts: 0,
};

export default function HistoryScreen() {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] =
    useState<WorkoutHistoryStatusFilter>('all');
  const [summary, setSummary] = useState<WorkoutHistorySummary>(emptySummary);
  const [weeklySummary, setWeeklySummary] =
    useState<WeeklyWorkoutSummary>(emptyWeeklySummary);
  const [workouts, setWorkouts] = useState<WorkoutHistoryItem[]>([]);
  const [isLoading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const nextSummary = await getWorkoutHistorySummary();
      const nextWeeklySummary = await getWeeklyWorkoutSummary();
      const nextWorkouts = await listWorkoutHistory({
        status: selectedStatus,
      });

      setSummary(nextSummary);
      setWeeklySummary(nextWeeklySummary);
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
              body="Plan a routine or complete a workout and it will show up here."
              title="No workouts yet"
            />
          )
        }
        ListHeaderComponent={
          <HistoryHeader
            selectedStatus={selectedStatus}
            setSelectedStatus={setSelectedStatus}
            summary={summary}
            weeklySummary={weeklySummary}
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
  weeklySummary: WeeklyWorkoutSummary;
};

function HistoryHeader({
  selectedStatus,
  setSelectedStatus,
  summary,
  weeklySummary,
}: HistoryHeaderProps) {
  return (
    <View style={styles.headerStack}>
      <View style={styles.summaryPanel}>
        <Text style={styles.sectionEyebrow}>All time</Text>
        <View style={styles.heroSummaryRow}>
          <SummaryCard
            label="Workouts"
            subvalue={`${formatCount(summary.completed_workouts)} completed`}
            value={formatCount(summary.total_workouts)}
          />
          <SummaryCard
            label="Last completed"
            subvalue="Workout date"
            value={
              summary.last_completed_workout_date
                ? formatDate(summary.last_completed_workout_date)
                : 'No data yet'
            }
          />
        </View>

        <View style={styles.compactStatsGrid}>
          <SummaryCard
            label="Completed sets"
            value={formatCount(summary.completed_sets)}
          />
          <SummaryCard
            label="Strength volume"
            value={formatVolumeKg(summary.total_strength_volume)}
          />
          <SummaryCard
            label="Cardio distance"
            value={formatDistanceKm(summary.total_cardio_distance_km)}
          />
          <SummaryCard
            label="Cardio duration"
            value={formatDuration(summary.total_cardio_duration_seconds)}
          />
        </View>
      </View>

      <WeeklySummary summary={weeklySummary} />

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
  subvalue?: string;
  value: string;
};

function SummaryCard({ label, subvalue, value }: SummaryCardProps) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
      {subvalue ? (
        <Text numberOfLines={1} style={styles.summarySubvalue}>
          {subvalue}
        </Text>
      ) : null}
    </View>
  );
}

type WeeklySummaryProps = {
  summary: WeeklyWorkoutSummary;
};

function WeeklySummary({ summary }: WeeklySummaryProps) {
  return (
    <View style={styles.weeklyPanel}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>This week</Text>
        <Text style={styles.sectionMeta}>
          {formatCount(summary.completed_workouts)} completed
        </Text>
      </View>
      <View style={styles.weeklyGrid}>
        <WeeklyMetric
          label="Workouts"
          value={formatCount(summary.total_workouts)}
        />
        <WeeklyMetric
          label="Completed"
          value={formatCount(summary.completed_workouts)}
        />
        <WeeklyMetric
          label="Sets"
          value={formatCount(summary.completed_sets)}
        />
        <WeeklyMetric
          label="Volume"
          value={formatVolumeKg(summary.total_strength_volume)}
        />
        <WeeklyMetric
          label="Distance"
          value={formatDistanceKm(summary.total_cardio_distance_km)}
        />
        <WeeklyMetric
          label="Duration"
          value={formatDuration(summary.total_cardio_duration_seconds)}
        />
      </View>
    </View>
  );
}

type WeeklyMetricProps = {
  label: string;
  value: string;
};

function WeeklyMetric({ label, value }: WeeklyMetricProps) {
  return (
    <View style={styles.weeklyMetric}>
      <Text numberOfLines={1} style={styles.weeklyValue}>
        {value}
      </Text>
      <Text style={styles.weeklyLabel}>{label}</Text>
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
          <Text style={styles.workoutDate}>{formatDate(item.scheduled_date)}</Text>
        </View>
        <View style={styles.statusShell}>
          <StatusPill status={item.status} />
        </View>
      </View>

      <View style={styles.metricRow}>
        <Metric label="Exercises" value={formatCount(item.exercise_count)} />
        <Metric
          label="Sets done"
          value={`${formatCount(item.completed_set_count)}/${formatCount(
            item.set_count,
          )}`}
        />
      </View>

      <View style={styles.statBadgeRow}>
        {statParts.length > 0 ? (
          statParts.map((part) => (
            <View key={part} style={styles.statBadge}>
              <Text style={styles.statBadgeText}>{part}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.statLine}>No logged metrics yet</Text>
        )}
      </View>
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
    parts.push(formatVolumeKg(item.total_strength_volume));
  }

  if (item.total_cardio_distance_km > 0) {
    parts.push(formatDistanceKm(item.total_cardio_distance_km));
  }

  if (item.total_cardio_duration_seconds > 0) {
    parts.push(formatDuration(item.total_cardio_duration_seconds));
  }

  return parts;
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
  summaryPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  sectionEyebrow: {
    ...typography.caption,
    color: colors.accent,
  },
  heroSummaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  compactStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 74,
    padding: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.heading,
    color: colors.text,
  },
  summarySubvalue: {
    ...typography.caption,
    color: colors.textMuted,
  },
  weeklyPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  sectionMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  weeklyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  weeklyMetric: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '30%',
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.sm,
  },
  weeklyValue: {
    ...typography.body,
    color: colors.text,
  },
  weeklyLabel: {
    ...typography.caption,
    color: colors.textMuted,
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
    minHeight: 40,
    paddingHorizontal: spacing.xs,
  },
  filterButtonSelected: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.accent,
    borderWidth: StyleSheet.hairlineWidth,
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
  statusShell: {
    alignItems: 'flex-end',
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
  statBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statBadge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statBadgeText: {
    ...typography.caption,
    color: colors.text,
  },
  statLine: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
