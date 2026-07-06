import type { WorkoutStatus } from '@/db/types';

const numberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 0,
});

const decimalFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  minimumFractionDigits: 0,
});

export function formatDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

export function formatShortDate(dateKey: string): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
  });
}

export function formatDuration(seconds: number): string {
  if (seconds <= 0) {
    return '0 min';
  }

  const totalSeconds = Math.round(seconds);
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${remainingSeconds}s`;
  }

  if (remainingSeconds === 0) {
    return `${minutes} min`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function formatDistanceKm(distanceKm: number): string {
  if (distanceKm <= 0) {
    return '0 km';
  }

  return `${decimalFormatter.format(distanceKm)} km`;
}

export function formatVolumeKg(volume: number): string {
  if (volume <= 0) {
    return '0 kg';
  }

  return `${numberFormatter.format(Math.round(volume))} kg`;
}

export function formatCount(value: number): string {
  return numberFormatter.format(value);
}

export function formatMetricNumber(value: number): string {
  return decimalFormatter.format(value);
}

export function formatStatusLabel(status: WorkoutStatus): string {
  if (status === 'in_progress') {
    return 'In progress';
  }

  return status === 'completed' ? 'Completed' : 'Planned';
}
