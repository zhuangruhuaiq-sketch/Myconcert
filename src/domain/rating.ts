export function ratingAt(x: number, width: number) {
  return Math.min(5, Math.max(0.5, Math.ceil(x / (width / 10)) / 2));
}
