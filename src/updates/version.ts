/**
 * Compare two version strings (e.g. "1.2.3").
 * Returns positive if a > b, negative if a < b, 0 if equal.
 */
export function compareVersions(a: string, b: string): number {
  const partsA = a.split(".").map((s) => parseInt(s, 10));
  const partsB = b.split(".").map((s) => parseInt(s, 10));
  const len = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < len; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

/**
 * Returns true if `latest` is a newer version than `current`.
 */
export function isNewer(current: string | undefined, latest: string | undefined): boolean {
  if (!current || !latest) return false;
  return compareVersions(latest, current) > 0;
}
