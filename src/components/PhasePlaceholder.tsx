import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';

type PhasePlaceholderProps = {
  body: string;
  label?: string;
};

export function PhasePlaceholder({
  body,
  label = 'Phase 1 placeholder',
}: PhasePlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.md,
  },
  label: {
    ...typography.caption,
    color: colors.accent,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
