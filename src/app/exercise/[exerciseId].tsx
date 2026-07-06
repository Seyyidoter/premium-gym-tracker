import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';

import { PhasePlaceholder } from '@/components/PhasePlaceholder';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { typography } from '@/design-system/typography';

export default function ExerciseDetailPlaceholderScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();

  return (
    <Screen title="Exercise">
      <Text style={{ ...typography.body, color: colors.textMuted }}>
        {exerciseId}
      </Text>
      <PhasePlaceholder body="Exercise detail GIF and instructions are reserved for a later phase. This screen intentionally contains no direct database query." />
    </Screen>
  );
}
