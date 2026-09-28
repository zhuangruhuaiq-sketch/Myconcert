import { dayKey } from "./rules";

export function shiftPeriod(day: string, weekly: boolean, direction: number) {
  const date = new Date(day + "T12:00:00");
  if (direction) {
    if (weekly) date.setDate(date.getDate() + direction * 7);
    else { date.setDate(1); date.setMonth(date.getMonth() + direction); }
  }
  return dayKey(date);
}

export function calendarPeriod(day: string, weekly: boolean) {
  const selected = new Date(day + "T12:00:00");
  const start = new Date(selected.getFullYear(), selected.getMonth(), weekly ? selected.getDate() - (selected.getDay() + 6) % 7 : 1);
  const end = new Date(start);
  if (weekly) end.setDate(end.getDate() + 7);
  else end.setMonth(end.getMonth() + 1);
  const offset = weekly ? 0 : (start.getDay() + 6) % 7;
  const days = Array.from({ length: weekly ? 7 : 42 }, (_, index) => {
    const date = new Date(start); date.setDate(date.getDate() + index - offset);
    return date < start || date >= end ? "" : dayKey(date);
  });
  return { start, end, days };
}
