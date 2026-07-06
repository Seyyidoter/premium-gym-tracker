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
    <View style={[styles.pill, styles[status]]}>
      <Text style={[styles.label, status === 'completed' ? styles.completedLabel : null]}>
        {statusLabels[status]}
      </Text>
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
  planned: {
    borderColor: colors.border,
  },
  in_progress: {
    borderColor: colors.accent,
  },
  completed: {
    backgroundColor: colors.background,
    borderColor: colors.accent,
  },
  label: {
    ...typography.caption,
    color: colors.text,
  },
  completedLabel: {
    color: colors.accent,
  },
});
