import { Tabs } from 'expo-router';

import { colors } from '@/design-system/colors';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        sceneStyle: { backgroundColor: colors.background },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen
        name="calendar"
        options={{ headerShown: false, title: 'Calendar' }}
      />
      <Tabs.Screen
        name="exercises"
        options={{ headerShown: false, title: 'Exercises' }}
      />
      <Tabs.Screen
        name="routines"
        options={{ headerShown: false, title: 'Routines' }}
      />
    </Tabs>
  );
}
