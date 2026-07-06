import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';

export default function NotFoundScreen() {
  return (
    <Screen title="Not Found">
      <Text style={styles.body}>This route does not exist.</Text>
      <Link href="/" style={styles.link}>
        Go home
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...typography.body,
    color: colors.textMuted,
  },
  link: {
    ...typography.body,
    color: colors.accent,
    marginTop: spacing.sm,
  },
});
