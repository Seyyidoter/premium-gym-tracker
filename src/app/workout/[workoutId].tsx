import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { PhasePlaceholder } from '@/components/PhasePlaceholder';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { typography } from '@/design-system/typography';

export default function WorkoutPlaceholderScreen() {
  const { workoutId } = useLocalSearchParams<{ workoutId: string }>();

  return (
    <Screen title="Workout">
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        {workoutId}
      </Text>
      <PhasePlaceholder body="Active workout logging is intentionally not implemented in Phase 1." />
    </Screen>
  );
}
