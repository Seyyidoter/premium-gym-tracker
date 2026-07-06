import 'react-native-gesture-handler';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import { initializeDatabase } from '@/db/database';

type BootState = 'loading' | 'ready' | 'error';

export default function RootLayout() {
  const [bootState, setBootState] = useState<BootState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    initializeDatabase()
      .then(() => {
        if (isMounted) {
          setBootState('ready');
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : 'Database init failed.',
          );
          setBootState('error');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (bootState !== 'ready') {
    return (
      <BootScreen
        message={
          bootState === 'loading'
            ? 'Preparing local database'
            : (errorMessage ?? 'Database init failed.')
        }
        showSpinner={bootState === 'loading'}
      />
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="exercise/[exerciseId]"
          options={{ title: 'Exercise' }}
        />
        <Stack.Screen
          name="workout/[workoutId]"
          options={{ title: 'Workout' }}
        />
        <Stack.Screen
          name="body-highlighter-poc"
          options={{ title: 'Body Map PoC' }}
        />
      </Stack>
    </>
  );
}

type BootScreenProps = {
  message: string;
  showSpinner: boolean;
};

function BootScreen({ message, showSpinner }: BootScreenProps) {
  return (
    <View style={styles.bootContainer}>
      <StatusBar style="light" />
      {showSpinner ? <ActivityIndicator color={colors.accent} /> : null}
      <Text style={styles.bootText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bootContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: spacing.md,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  bootText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
});
