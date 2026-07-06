import { PhasePlaceholder } from '@/components/PhasePlaceholder';
import { Screen } from '@/components/Screen';

export default function BodyHighlighterPocPlaceholderScreen() {
  return (
    <Screen title="Body Map PoC">
      <PhasePlaceholder
        body="Body highlighter is left as a safe placeholder in Phase 1. Full anatomy map integration belongs to V2 unless the PoC proves useful."
        label="react-native-body-highlighter placeholder"
      />
    </Screen>
  );
}
