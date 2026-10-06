export function cityName(name: string, recorded: ReadonlySet<string>) {
  const trimmed = name.trim();
  const short = trimmed.replace(/市$/, "");
  return recorded.has(short) ? short : trimmed;
}
