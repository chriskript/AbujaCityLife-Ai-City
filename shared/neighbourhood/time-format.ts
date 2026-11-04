// Pure presentation of authoritative simulation seconds. Day 1 is simulation t0
// and reads as Monday, so Day 3 reads as Wednesday. All simulation arithmetic
// stays in raw seconds; only render sites use these helpers.
export const SIM_DAY_SECONDS = 86400;
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

export interface SimDayParts { day: number; weekday: string; hour12: number; minute: number; meridiem: 'AM' | 'PM' }

export function simDayParts(time: number): SimDayParts {
  const floored = Number.isFinite(time) && time > 0 ? Math.floor(time) : 0;
  const day = Math.floor(floored / SIM_DAY_SECONDS) + 1;
  const weekday = WEEKDAYS[(day - 1) % 7]!;
  const hour24 = Math.floor((floored % SIM_DAY_SECONDS) / 3600);
  const minute = Math.floor((floored % 3600) / 60);
  return { day, weekday, hour12: hour24 % 12 === 0 ? 12 : hour24 % 12, minute, meridiem: hour24 < 12 ? 'AM' : 'PM' };
}

const clock = (parts: SimDayParts): string => `${parts.hour12}:${String(parts.minute).padStart(2, '0')} ${parts.meridiem}`;

export function formatSimTime(time: number): string {
  const parts = simDayParts(time);
  return `Day ${parts.day} · ${parts.weekday} · ${clock(parts)}`;
}

export function formatSimTimeCompact(time: number): string {
  const parts = simDayParts(time);
  return `Day ${parts.day} · ${clock(parts)}`;
}
