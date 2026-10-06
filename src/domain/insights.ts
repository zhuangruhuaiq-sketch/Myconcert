import { ConcertEvent, totals } from "./rules";
import { cityName } from "./city-name";

export function rank(values: string[]) {
  const counts = new Map<string, number>();
  for (const value of values.map((s) => s.trim()).filter(Boolean)) counts.set(value, (counts.get(value) || 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function insights(events: ConcertEvent[]) {
  const watched = events.filter((e) => e.status === "已观看");
  const rated = watched.filter((e) => e.rating !== undefined);
  const recordedCities = new Set(watched.map((e) => e.city.trim()));
  const artists = rank(watched.flatMap((e) => [...new Set(e.artists.split(/[,，、;；\n]+/).map((s) => s.trim()).filter(Boolean))]));
  const cities = rank(watched.map((e) => cityName(e.city, recordedCities)));
  const venues = rank(watched.filter((e) => e.venue.trim()).map((e) => [cityName(e.city, recordedCities), e.venue.trim()].filter(Boolean).join(" · ")));
  const months = Array.from({ length: 12 }, (_, i) => watched.filter((e) => new Date(e.startAt).getMonth() === i).length);
  const spending = [...new Set(events.map((e) => e.currency))].sort().map((currency) => {
    const records = events.filter((e) => e.currency === currency);
    const categories = new Map<string, number>();
    for (const e of records) {
      for (const expense of [{ category: "票价", amount: e.price || 0 }, ...e.expenses]) {
        categories.set(expense.category, (categories.get(expense.category) || 0) + expense.amount);
      }
    }
    return { currency, total: totals(records), average: totals(records) / records.length,
      categories: [...categories].sort((a, b) => b[1] - a[1]) };
  });
  return {
    watched, artists, cities, venues, months, spending,
    types: rank(watched.map((e) => e.type)),
    years: rank(watched.map((e) => String(new Date(e.startAt).getFullYear()))).sort((a, b) => a[0].localeCompare(b[0])),
    statuses: rank(events.map((e) => e.status)),
    hours: watched.reduce((n, e) => n + (+new Date(e.endAt) - +new Date(e.startAt)) / 3600000, 0),
    averageRating: rated.length ? rated.reduce((n, e) => n + e.rating!, 0) / rated.length : undefined,
    ratings: Array.from({ length: 6 }, (_, i) => [`${i}${i < 5 ? "–<" + (i + 1) : ""} 分`, rated.filter((e) => Math.floor(e.rating!) === i).length] as [string, number]),
    weekends: watched.filter((e) => [0, 6].includes(new Date(e.startAt).getDay())).length,
    repeatArtists: artists.filter(([, n]) => n > 1).length,
    ratedCount: rated.length,
  };
}
