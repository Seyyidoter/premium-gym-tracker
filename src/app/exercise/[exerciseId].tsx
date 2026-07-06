import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { getExerciseGif } from '@/assets/assets_index';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import { getExerciseById } from '@/db/repositories/exerciseRepository';
import type { ExerciseRecentHistoryItem } from '@/db/repositories/workoutRepository';
import { getExerciseRecentHistory } from '@/db/repositories/workoutRepository';
import type { Exercise, TrackType } from '@/db/types';
import {
  formatDistanceKm,
  formatDuration,
  formatMetricNumber,
  formatShortDate,
  formatStatusLabel,
  formatVolumeKg,
} from '@/features/history/formatters';

const trackTypeLabels: Record<TrackType, string> = {
  distance_duration_incline: 'Distance / incline / duration',
  duration_only: 'Duration only',
  weight_reps: 'Weight / reps',
};

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [recentHistory, setRecentHistory] = useState<ExerciseRecentHistoryItem[]>(
    [],
  );
  const [isLoading, setLoading] = useState(true);

  const loadExercise = useCallback(async () => {
    if (!exerciseId) {
      setExercise(null);
      setRecentHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextExercise = await getExerciseById(exerciseId);
      setExercise(nextExercise);

      if (nextExercise) {
        setRecentHistory(await getExerciseRecentHistory(exerciseId, 5));
      } else {
        setRecentHistory([]);
      }
    } finally {
      setLoading(false);
    }
  }, [exerciseId]);

  useFocusEffect(
    useCallback(() => {
      void loadExercise();
    }, [loadExercise]),
  );

  if (isLoading) {
    return (
      <Screen title="Exercise">
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!exercise) {
    return (
      <Screen title="Exercise">
        <EmptyState
          body="This exercise is not available in the local library."
          title="Exercise unavailable"
        />
      </Screen>
    );
  }

  const gifSource = getExerciseGif(exercise.asset_key);

  return (
    <Screen title="Exercise">
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mediaFrame}>
          {gifSource ? (
            <>
              <Image
                resizeMode="contain"
                source={gifSource}
                style={styles.exerciseImage}
              />
              <View style={styles.mediaBadge}>
                <Text style={styles.mediaBadgeText}>Local media</Text>
              </View>
            </>
          ) : (
            <View style={styles.mediaPlaceholder}>
              <View style={styles.placeholderMark}>
                <Text style={styles.placeholderMarkText}>GIF</Text>
              </View>
              <Text style={styles.placeholderTitle}>No local media</Text>
              <Text style={styles.placeholderBody}>
                Asset key: {exercise.asset_key}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <View style={styles.titlePillRow}>
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{exercise.category}</Text>
            </View>
            <View style={styles.trackPill}>
              <Text style={styles.trackPillText}>
                {trackTypeLabels[exercise.track_type]}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.metadataGrid}>
          <InfoRow label="Primary muscle" value={exercise.primary_muscle} />
          <InfoRow
            label="Secondary muscles"
            value={
              exercise.secondary_muscles.length > 0
                ? exercise.secondary_muscles.join(', ')
                : 'None'
            }
          />
          <InfoRow label="Asset" value={gifSource ? 'Local GIF ready' : 'Placeholder'} />
        </View>

        <RecentHistoryBlock history={recentHistory} />

        <View style={styles.instructionsBlock}>
          <Text style={styles.sectionTitle}>Instructions</Text>
          <Text style={styles.instructionsText}>
            {exercise.instructions?.trim() || 'No instructions saved yet.'}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

type RecentHistoryBlockProps = {
  history: ExerciseRecentHistoryItem[];
};

function RecentHistoryBlock({ history }: RecentHistoryBlockProps) {
  return (
    <View style={styles.recentHistoryBlock}>
      <View style={styles.recentHistoryHeader}>
        <Text style={styles.sectionTitle}>Recent history</Text>
        <Text style={styles.recentHistoryMeta}>Last 5 workouts</Text>
      </View>
      {history.length === 0 ? (
        <View style={styles.historyEmptyBox}>
          <Text style={styles.historyEmptyTitle}>No history yet</Text>
          <Text style={styles.historyEmpty}>
            Logged performances for this exercise will appear here.
          </Text>
        </View>
      ) : (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.workout_id} style={styles.historyRow}>
              <View style={styles.historyDateColumn}>
                <Text style={styles.historyDate}>
                  {formatShortDate(item.scheduled_date)}
                </Text>
                <Text style={styles.historyMeta}>
                  {formatStatusLabel(item.status)}
                </Text>
              </View>
              <View style={styles.historyValueColumn}>
                <Text style={styles.historyValue}>
                  {formatHistoryValue(item)}
                </Text>
                <Text style={styles.historyMeta}>
                  {item.completed_set_count}/{item.set_count} sets completed
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function formatHistoryValue(item: ExerciseRecentHistoryItem): string {
  if (item.track_type === 'weight_reps') {
    if (item.best_weight !== null && item.best_reps !== null) {
      return `Best ${formatMetricNumber(item.best_weight)} x ${formatMetricNumber(
        item.best_reps,
      )} / ${formatVolumeKg(item.total_strength_volume)}`;
    }

    return formatVolumeKg(item.total_strength_volume);
  }

  if (item.track_type === 'distance_duration_incline') {
    const parts = [formatDistanceKm(item.total_cardio_distance_km)];

    if (item.max_incline !== null) {
      parts.push(`${formatMetricNumber(item.max_incline)} incline`);
    }

    if (item.total_duration_seconds > 0) {
      parts.push(formatDuration(item.total_duration_seconds));
    }

    return parts.join(' / ');
  }

  return formatDuration(item.total_duration_seconds);
}

const styles = StyleSheet.create({
  centered: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  mediaFrame: {
    alignItems: 'center',
    aspectRatio: 1.35,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  exerciseImage: {
    height: '100%',
    width: '100%',
  },
  mediaPlaceholder: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  placeholderMark: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    height: 48,
    justifyContent: 'center',
    width: 64,
  },
  placeholderMarkText: {
    ...typography.caption,
    color: colors.accent,
  },
  placeholderTitle: {
    ...typography.heading,
    color: colors.text,
  },
  placeholderBody: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  mediaBadge: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    bottom: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    position: 'absolute',
    right: spacing.sm,
  },
  mediaBadgeText: {
    ...typography.caption,
    color: colors.accent,
  },
  titleBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  titlePillRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  exerciseName: {
    ...typography.title,
    color: colors.text,
  },
  categoryPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoryPillText: {
    ...typography.caption,
    color: colors.text,
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
    textAlign: 'center',
  },
  metadataGrid: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  infoRow: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    paddingTop: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
  },
  instructionsBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  recentHistoryBlock: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  recentHistoryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  recentHistoryMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  historyList: {
    gap: spacing.sm,
  },
  historyRow: {
    alignItems: 'flex-start',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  historyDateColumn: {
    minWidth: 72,
  },
  historyValueColumn: {
    alignItems: 'flex-end',
    flex: 1,
    gap: spacing.xs,
  },
  historyDate: {
    ...typography.caption,
    color: colors.text,
  },
  historyValue: {
    ...typography.caption,
    color: colors.text,
    textAlign: 'right',
  },
  historyMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  historyEmptyBox: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  historyEmptyTitle: {
    ...typography.body,
    color: colors.text,
  },
  historyEmpty: {
    ...typography.caption,
    color: colors.textMuted,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  instructionsText: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
