const namesEndingInShi = new Set(["四日市", "津市"]);

export function cityName(name: string) {
  const trimmed = name.trim();
  return namesEndingInShi.has(trimmed) ? trimmed : trimmed.replace(/市$/, "");
}
