import names from "../../assets/maps/city-names.json";

export function citySuggestions(input: string, recorded: string[]) {
  const query = input.trim().replace(/市$/, "");
  if (!/[\u3400-\u9fff]/.test(query)) return [];
  const matches = new Map<string, { city: string; label: string; rank: number }>();
  for (const city of recorded) {
    if (city.includes(query)) matches.set(city, { city, label: "已记录", rank: city === query ? 0 : 1 });
  }
  for (const [alias, city, label] of names) {
    if (!alias.includes(query) && !city.includes(query)) continue;
    const rank = city === query ? 0 : city.startsWith(query) ? 2 : alias.startsWith(query) ? 3 : 4;
    const existing = matches.get(city);
    if (!existing || rank < existing.rank) matches.set(city, { city, label, rank });
  }
  return [...matches.values()].sort((a, b) => a.rank - b.rank || a.city.length - b.city.length || a.city.localeCompare(b.city, "zh")).slice(0, 6);
}
