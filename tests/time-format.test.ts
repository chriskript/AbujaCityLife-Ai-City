import { describe, expect, it } from 'vitest';
import { SIM_DAY_SECONDS, formatSimTime, formatSimTimeCompact, simDayParts } from '../shared/neighbourhood/time-format.js';

// Day 1 is simulation t0 and reads as Monday, so Day 3 reads as Wednesday.
describe('simulation clock and calendar', () => {
  it('anchors Day 1 to Monday midnight', () => {
    expect(formatSimTime(0)).toBe('Day 1 · Monday · 12:00 AM');
    expect(simDayParts(0)).toEqual({ day: 1, weekday: 'Monday', hour12: 12, minute: 0, meridiem: 'AM' });
  });
  it('formats midday and midnight boundaries', () => {
    expect(formatSimTime(59.9)).toBe('Day 1 · Monday · 12:00 AM');
    expect(formatSimTime(12 * 3600)).toBe('Day 1 · Monday · 12:00 PM');
    expect(formatSimTime(86399)).toBe('Day 1 · Monday · 11:59 PM');
    expect(formatSimTime(86400)).toBe('Day 2 · Tuesday · 12:00 AM');
  });
  it('formats the reference evening across weekdays', () => {
    expect(formatSimTime(2 * SIM_DAY_SECONDS + 18 * 3600 + 45 * 60)).toBe('Day 3 · Wednesday · 6:45 PM');
    expect(formatSimTime(6 * SIM_DAY_SECONDS + 9 * 60)).toBe('Day 7 · Sunday · 12:09 AM');
    expect(formatSimTime(7 * SIM_DAY_SECONDS)).toBe('Day 8 · Monday · 12:00 AM');
  });
  it('offers a compact day-and-time form for tight spaces', () => {
    expect(formatSimTimeCompact(0)).toBe('Day 1 · 12:00 AM');
    expect(formatSimTimeCompact(2 * SIM_DAY_SECONDS + 18 * 3600 + 45 * 60)).toBe('Day 3 · 6:45 PM');
  });
  it('floors invalid input to the epoch instead of crashing', () => {
    expect(formatSimTime(-5)).toBe('Day 1 · Monday · 12:00 AM');
    expect(formatSimTime(Number.NaN)).toBe('Day 1 · Monday · 12:00 AM');
  });
});
