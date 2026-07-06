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
import type { Exercise, TrackType } from '@/db/types';

const trackTypeLabels: Record<TrackType, string> = {
  distance_duration_incline: 'Distance / incline / duration',
  duration_only: 'Duration only',
  weight_reps: 'Weight / reps',
};

export default function ExerciseDetailScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const [exercise, setExercise] = useState<Exercise | null>(null);
  const [isLoading, setLoading] = useState(true);

  const loadExercise = useCallback(async () => {
    if (!exerciseId) {
      return;
    }

    setLoading(true);
    try {
      setExercise(await getExerciseById(exerciseId));
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
