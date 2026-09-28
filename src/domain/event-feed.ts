import { ConcertEvent } from "./rules";

export function eventFeed(events: ConcertEvent[], now: number) {
  const upcoming = events.filter((e) => Date.parse(e.startAt) > now)
    .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt) || a.id.localeCompare(b.id));
  const started = events.filter((e) => Date.parse(e.startAt) <= now)
    .sort((a, b) => Date.parse(b.startAt) - Date.parse(a.startAt) || a.id.localeCompare(b.id));
  return { upcoming, started };
}

export const eventPoster = (event: ConcertEvent) =>
  event.media?.find((m) => m.role === "海报" && m.kind === "image");
