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
      <Text style={styles.sectionTitle}>Recent history</Text>
      {history.length === 0 ? (
        <Text style={styles.historyEmpty}>No history yet.</Text>
      ) : (
        <View style={styles.historyList}>
          {history.map((item) => (
            <View key={item.workout_id} style={styles.historyRow}>
              <View style={styles.historyDateColumn}>
                <Text style={styles.historyDate}>
                  {formatHistoryDate(item.scheduled_date)}
                </Text>
                <Text style={styles.historyMeta}>
                  {item.completed_set_count}/{item.set_count} sets
                </Text>
              </View>
              <Text style={styles.historyValue}>{formatHistoryValue(item)}</Text>
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
      return `${formatNumber(item.best_weight)} x ${formatNumber(
        item.best_reps,
      )} best / ${formatNumber(item.total_strength_volume)} volume`;
    }

    return `${formatNumber(item.total_strength_volume)} volume`;
  }

  if (item.track_type === 'distance_duration_incline') {
    const parts = [`${formatNumber(item.total_cardio_distance_km)} km`];

    if (item.max_incline !== null) {
      parts.push(`${formatNumber(item.max_incline)} incline`);
    }

    if (item.total_duration_seconds > 0) {
      parts.push(formatDuration(item.total_duration_seconds));
    }

    return parts.join(' / ');
  }

  return formatDuration(item.total_duration_seconds);
}

function formatHistoryDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0s';
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
  historyDate: {
    ...typography.caption,
    color: colors.text,
  },
  historyValue: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
    textAlign: 'right',
  },
  historyMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  historyEmpty: {
    ...typography.body,
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
