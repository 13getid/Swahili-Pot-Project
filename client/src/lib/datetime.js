import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

// All timestamps are stored in UTC. Display them in East Africa Time (UTC+3).
const EAT = 'Africa/Nairobi';

export function formatEAT(value, pattern = 'd MMM yyyy, HH:mm') {
  if (!value) return '—';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '—';
  return format(toZonedTime(date, EAT), pattern);
}

export function formatDateEAT(value) {
  return formatEAT(value, 'd MMM yyyy');
}

export function formatTimeEAT(value) {
  return formatEAT(value, 'HH:mm');
}
