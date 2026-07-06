import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import type { ReactNode } from 'react';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type { DatabaseSummary } from '@/db/repositories/dataManagementRepository';
import {
  exportDatabaseJson,
  getDatabaseSummary,
  resetUserData,
} from '@/db/repositories/dataManagementRepository';
import { formatCount, formatDate } from '@/features/history/formatters';

const appName = Constants.expoConfig?.name ?? 'Premium Gym Tracker';
const appVersion = Constants.expoConfig?.version ?? '1.0.0';

export default function SettingsScreen() {
  const [summary, setSummary] = useState<DatabaseSummary | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [isExporting, setExporting] = useState(false);
  const [isResetting, setResetting] = useState(false);
  const [lastExportUri, setLastExportUri] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      setSummary(await getDatabaseSummary());
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSummary();
    }, [loadSummary]),
  );

  const exportData = useCallback(async () => {
    setExporting(true);
    setLastExportUri(null);
    try {
      const documentDirectory = FileSystem.documentDirectory;

      if (!documentDirectory) {
        throw new Error('Local document directory is not available.');
      }

      const exportJson = await exportDatabaseJson();
      const safeTimestamp = exportJson.metadata.exported_at
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '');
      const fileUri = `${documentDirectory}premium-gym-tracker-${safeTimestamp}.json`;

      await FileSystem.writeAsStringAsync(
        fileUri,
        JSON.stringify(exportJson, null, 2),
      );

      setLastExportUri(fileUri);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          dialogTitle: 'Export Premium Gym Tracker data',
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Export complete', `Saved to: ${fileUri}`);
      }
    } catch (error: unknown) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setExporting(false);
    }
  }, []);

  const resetData = useCallback(async () => {
    setResetting(true);
    try {
      await resetUserData();
      await loadSummary();
      Alert.alert('Local data reset', 'Routines and workouts were removed.');
    } catch (error: unknown) {
      Alert.alert(
        'Reset failed',
        error instanceof Error ? error.message : 'Try again.',
      );
    } finally {
      setResetting(false);
    }
  }, [loadSummary]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Reset local data',
      'This will delete local routines and workouts. Seed exercises will stay available.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm reset',
              'This cannot be undone. Delete local routines and workouts now?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Reset data',
                  style: 'destructive',
                  onPress: () => {
                    void resetData();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [resetData]);

  const isBusy = isExporting || isResetting;

  return (
    <Screen title="Settings / Data">
      <ScrollView contentContainerStyle={styles.content}>
        <Section title="App info">
          <InfoRow label="App" value={appName} />
          <InfoRow label="Version" value={appVersion} />
          <InfoRow label="Storage" value="Offline local database" />
        </Section>

        <Section title="Database summary">
          {isLoading ? (
            <View style={styles.centered}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : summary ? (
            <View style={styles.summaryGrid}>
              <SummaryItem
                label="Exercises"
                value={formatCount(summary.total_exercises)}
              />
              <SummaryItem
                label="Routines"
                value={formatCount(summary.total_routines)}
              />
              <SummaryItem
                label="Workouts"
                value={formatCount(summary.total_workouts)}
              />
              <SummaryItem
                label="Completed"
                value={formatCount(summary.completed_workouts)}
              />
              <SummaryItem
                label="Sets"
                value={formatCount(summary.total_sets)}
              />
              <SummaryItem
                label="Done sets"
                value={formatCount(summary.completed_sets)}
              />
              <SummaryItem
                label="Last workout"
                value={
                  summary.last_workout_date
                    ? formatDate(summary.last_workout_date)
                    : 'No data yet'
                }
              />
              <SummaryItem
                label="DB version"
                value={String(summary.database_user_version)}
              />
            </View>
          ) : (
            <EmptyState
              body="Database summary could not be loaded."
              title="Summary unavailable"
            />
          )}
        </Section>

        <Section title="Export data">
          <Text style={styles.sectionBody}>
            Create a local JSON export with exercises, routines, workouts, sets,
            metrics and database metadata.
          </Text>
          <AppButton disabled={isBusy} onPress={exportData}>
            {isExporting ? 'Preparing export...' : 'Export JSON'}
          </AppButton>
          {lastExportUri ? (
            <Text style={styles.successText}>Last export saved locally.</Text>
          ) : null}
        </Section>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerTitle}>Reset local data</Text>
          <Text style={styles.dangerBody}>
            This will delete local routines and workouts. Seed exercises remain
            available after reset.
          </Text>
          <DangerButton disabled={isBusy} onPress={confirmReset}>
            {isResetting ? 'Resetting...' : 'Reset routines and workouts'}
          </DangerButton>
        </View>
      </ScrollView>
    </Screen>
  );
}

type SectionProps = {
  children: ReactNode;
  title: string;
};

function Section({ children, title }: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

type DangerButtonProps = {
  children: ReactNode;
  disabled: boolean;
  onPress: () => void;
};

function DangerButton({ children, disabled, onPress }: DangerButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dangerButton,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.dangerButtonText}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  centered: {
    alignItems: 'center',
    minHeight: 100,
    justifyContent: 'center',
  },
  section: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
    color: colors.text,
  },
  sectionBody: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  infoRow: {
    alignItems: 'center',
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingTop: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  summaryItem: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.xs,
    minHeight: 72,
    padding: spacing.sm,
  },
  summaryLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  summaryValue: {
    ...typography.body,
    color: colors.text,
  },
  successText: {
    ...typography.caption,
    color: colors.accent,
  },
  dangerSection: {
    backgroundColor: colors.surface,
    borderColor: colors.danger,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  dangerTitle: {
    ...typography.heading,
    color: colors.danger,
  },
  dangerBody: {
    ...typography.body,
    color: colors.textMuted,
    lineHeight: 22,
  },
  dangerButton: {
    alignItems: 'center',
    backgroundColor: colors.danger,
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dangerButtonText: {
    ...typography.body,
    color: colors.background,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.78,
  },
});
