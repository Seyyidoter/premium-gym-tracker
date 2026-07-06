import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type { WorkoutStatus } from '@/db/types';

type StatusPillProps = {
  status: WorkoutStatus;
};

const statusLabels: Record<WorkoutStatus, string> = {
  planned: 'Planned',
  in_progress: 'In progress',
  completed: 'Completed',
};

export function StatusPill({ status }: StatusPillProps) {
  return (
    <View style={[styles.pill, status === 'completed' ? styles.completed : null]}>
      <Text style={styles.label}>{statusLabels[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  completed: {
    borderColor: colors.accent,
  },
  label: {
    ...typography.caption,
    color: colors.text,
  },
});
