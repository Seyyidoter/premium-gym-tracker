import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PhasePlaceholder } from '@/components/PhasePlaceholder';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import { countExercises } from '@/db/repositories/exerciseRepository';
import { SEEDED_EXERCISE_COUNT } from '@/db/seed';

export default function TodayPlaceholderScreen() {
  const [exerciseCount, setExerciseCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    countExercises().then((count) => {
      if (isMounted) {
        setExerciseCount(count);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Screen title="Premium Gym Tracker">
      <View style={styles.statusRow}>
        <Text style={styles.statusLabel}>Seeded exercises</Text>
        <Text style={styles.statusValue}>
          {exerciseCount ?? '-'} / {SEEDED_EXERCISE_COUNT}
        </Text>
      </View>
      <PhasePlaceholder body="Core setup is ready. Today view, swipe navigation, and active workout logging are reserved for later phases." />
    </Screen>
  );
}

const styles = StyleSheet.create({
  statusRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  statusLabel: {
    ...typography.body,
    color: colors.textMuted,
  },
  statusValue: {
    ...typography.heading,
    color: colors.text,
  },
});
