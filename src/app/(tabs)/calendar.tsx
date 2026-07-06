import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppButton } from '@/components/AppButton';
import { EmptyState } from '@/components/EmptyState';
import { Screen } from '@/components/Screen';
import { StatusPill } from '@/components/StatusPill';
import { colors } from '@/design-system/colors';
import { spacing } from '@/design-system/spacing';
import { typography } from '@/design-system/typography';
import type { RoutineListItem } from '@/db/repositories/routineRepository';
import { listRoutineSummaries } from '@/db/repositories/routineRepository';
import type { WorkoutSummary } from '@/db/repositories/workoutRepository';
import {
  createWorkoutFromRoutine,
  listWorkoutSummariesBetween,
  listWorkoutSummariesByDate,
} from '@/db/repositories/workoutRepository';
import {
  formatMonthTitle,
  formatReadableDate,
  getMonthGrid,
  getMonthRange,
  moveMonth,
  todayDateKey,
} from '@/features/calendar/dateUtils';

const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarScreen() {
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => todayDateKey());
  const [monthWorkouts, setMonthWorkouts] = useState<WorkoutSummary[]>([]);
  const [selectedWorkouts, setSelectedWorkouts] = useState<WorkoutSummary[]>(
    [],
  );
  const [assignDateKey, setAssignDateKey] = useState(() => todayDateKey());
  const [routines, setRoutines] = useState<RoutineListItem[]>([]);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isLoadingMonth, setLoadingMonth] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const longPressDateRef = useRef<string | null>(null);

  const calendarDays = useMemo(
    () => getMonthGrid(visibleMonth),
    [visibleMonth],
  );
  const workoutDates = useMemo(
    () => new Set(monthWorkouts.map((workout) => workout.scheduled_date)),
    [monthWorkouts],
  );

  const loadMonth = useCallback(async () => {
    setLoadingMonth(true);
    try {
      const range = getMonthRange(visibleMonth);
      setMonthWorkouts(
        await listWorkoutSummariesBetween(range.start, range.end),
      );
    } finally {
      setLoadingMonth(false);
    }
  }, [visibleMonth]);

  const loadSelectedDay = useCallback(async () => {
    setSelectedWorkouts(await listWorkoutSummariesByDate(selectedDateKey));
  }, [selectedDateKey]);

  const loadRoutines = useCallback(async () => {
    setRoutines(await listRoutineSummaries());
  }, []);

  const refreshCalendarData = useCallback(async () => {
    await loadRoutines();
    await loadSelectedDay();
    await loadMonth();
  }, [loadMonth, loadRoutines, loadSelectedDay]);

  useEffect(() => {
    void loadMonth();
  }, [loadMonth]);

  useEffect(() => {
    void loadSelectedDay();
  }, [loadSelectedDay]);

  useFocusEffect(
    useCallback(() => {
      void refreshCalendarData();
    }, [refreshCalendarData]),
  );

  const openAssignModal = useCallback(
    async (dateKey: string) => {
      setSelectedDateKey(dateKey);
      setAssignDateKey(dateKey);
      setErrorMessage(null);
      setRoutines(await listRoutineSummaries());
      setModalVisible(true);
    },
    [],
  );

  const assignRoutine = useCallback(
    async (routineId: string) => {
      setSaving(true);
      setErrorMessage(null);
      try {
        await createWorkoutFromRoutine(routineId, assignDateKey);
        setModalVisible(false);
        await loadSelectedDay();
        await loadMonth();
      } catch (error: unknown) {
        setErrorMessage(
          error instanceof Error ? error.message : 'Routine could not be assigned.',
        );
      } finally {
        setSaving(false);
      }
    },
    [assignDateKey, loadMonth, loadSelectedDay],
  );

  return (
    <Screen title="Calendar">
      <View style={styles.monthHeader}>
        <AppButton
          onPress={() => {
            setVisibleMonth((current) => moveMonth(current, -1));
          }}
          variant="secondary"
        >
          Previous
        </AppButton>
        <Text style={styles.monthTitle}>{formatMonthTitle(visibleMonth)}</Text>
        <AppButton
          onPress={() => {
            setVisibleMonth((current) => moveMonth(current, 1));
          }}
          variant="secondary"
        >
          Next
        </AppButton>
      </View>

      <View style={styles.calendar}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
        {calendarDays.map((day) => {
          const isSelected = day.dateKey === selectedDateKey;
          const hasWorkout = workoutDates.has(day.dateKey);

          return (
            <Pressable
              delayLongPress={450}
              key={day.dateKey}
              onLongPress={() => {
                longPressDateRef.current = day.dateKey;
                void openAssignModal(day.dateKey);
              }}
              onPress={() => {
                if (longPressDateRef.current === day.dateKey) {
                  longPressDateRef.current = null;
                  return;
                }

                setSelectedDateKey(day.dateKey);
              }}
              style={({ pressed }) => [
                styles.dayCell,
                !day.isCurrentMonth ? styles.outsideMonth : null,
                day.isToday ? styles.today : null,
                isSelected ? styles.selectedDay : null,
                pressed ? styles.pressedDay : null,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  !day.isCurrentMonth ? styles.outsideMonthText : null,
                ]}
              >
                {day.dayOfMonth}
              </Text>
              {hasWorkout ? <View style={styles.workoutDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.detailHeader}>
        <Text style={styles.detailTitle}>{formatReadableDate(selectedDateKey)}</Text>
        {isLoadingMonth ? <ActivityIndicator color={colors.accent} /> : null}
      </View>

      <ScrollView contentContainerStyle={styles.detailList}>
        {selectedWorkouts.length === 0 ? (
          <EmptyState
            body="Long press this day to assign one of your saved routines."
            title="No workout on this day"
          />
        ) : (
          selectedWorkouts.map((workout) => (
            <View key={workout.id} style={styles.workoutCard}>
              <View style={styles.cardHeader}>
                <View style={styles.cardTitleColumn}>
                  <Text style={styles.workoutTitle}>
                    {workout.routine_name ?? 'Planned workout'}
                  </Text>
                  <Text style={styles.workoutMeta}>
                    {workout.exercise_count} exercises / {workout.set_count} sets
                  </Text>
                </View>
                <StatusPill status={workout.status} />
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <Modal
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
        }}
        transparent
        visible={isModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>
              Assign routine to {formatReadableDate(assignDateKey)}
            </Text>
            {errorMessage ? (
              <Text style={styles.errorText}>{errorMessage}</Text>
            ) : null}
            <ScrollView contentContainerStyle={styles.modalList}>
              {routines.length === 0 ? (
                <EmptyState
                  body="Create a routine first, then come back to assign it."
                  title="No routines"
                />
              ) : (
                routines.map((routine) => (
                  <Pressable
                    disabled={isSaving || routine.exercise_count === 0}
                    key={routine.id}
                    onPress={() => {
                      void assignRoutine(routine.id);
                    }}
                    style={({ pressed }) => [
                      styles.routineRow,
                      pressed ? styles.pressedDay : null,
                      routine.exercise_count === 0 ? styles.disabledRow : null,
                    ]}
                  >
                    <Text style={styles.routineName}>{routine.name}</Text>
                    <Text style={styles.workoutMeta}>
                      {routine.exercise_count} exercises / {routine.set_count} sets
                    </Text>
                  </Pressable>
                ))
              )}
            </ScrollView>
            <AppButton
              disabled={isSaving}
              onPress={() => {
                setModalVisible(false);
              }}
              variant="secondary"
            >
              Close
            </AppButton>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  monthTitle: {
    ...typography.heading,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },
  weekday: {
    ...typography.caption,
    color: colors.textMuted,
    paddingBottom: spacing.sm,
    textAlign: 'center',
    width: '14.2857%',
  },
  dayCell: {
    alignItems: 'center',
    aspectRatio: 1,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    justifyContent: 'center',
    width: '14.2857%',
  },
  selectedDay: {
    backgroundColor: colors.surfaceMuted,
    borderColor: colors.accent,
  },
  today: {
    borderColor: colors.text,
  },
  outsideMonth: {
    opacity: 0.38,
  },
  pressedDay: {
    opacity: 0.7,
  },
  dayText: {
    ...typography.body,
    color: colors.text,
  },
  outsideMonthText: {
    color: colors.textMuted,
  },
  workoutDot: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  detailHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailTitle: {
    ...typography.heading,
    color: colors.text,
  },
  detailList: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  workoutCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    padding: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  cardTitleColumn: {
    flex: 1,
    gap: spacing.xs,
  },
  workoutTitle: {
    ...typography.heading,
    color: colors.text,
  },
  workoutMeta: {
    ...typography.caption,
    color: colors.textMuted,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.62)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
    maxHeight: '72%',
    padding: spacing.lg,
  },
  modalTitle: {
    ...typography.heading,
    color: colors.text,
  },
  modalList: {
    gap: spacing.sm,
  },
  routineRow: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.xs,
    padding: spacing.md,
  },
  disabledRow: {
    opacity: 0.45,
  },
  routineName: {
    ...typography.body,
    color: colors.text,
  },
  errorText: {
    ...typography.caption,
    color: colors.danger,
  },
});
