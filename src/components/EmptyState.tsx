import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';

type EmptyStateProps = {
  body: string;
  title: string;
};

export function EmptyState({ body, title }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderColor: colors.border,
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  title: {
    ...typography.heading,
    color: colors.text,
  },
  body: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
});
