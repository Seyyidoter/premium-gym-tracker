import { PhasePlaceholder } from '@/components/PhasePlaceholder';
import { Screen } from '@/components/Screen';

export default function CalendarPlaceholderScreen() {
  return (
    <Screen title="Calendar">
      <PhasePlaceholder body="Calendar interactions start in Phase 2. This route exists so Expo Router structure is ready." />
    </Screen>
  );
}
