const MAX_COUNT = 1000;

/** `crypto.randomUUID()` is a native, CSPRNG-backed UUIDv4 generator — no library needed. */
export function generateUuids(count: number): string[] {
  const n = Math.max(1, Math.min(Math.floor(count) || 1, MAX_COUNT));
  return Array.from({ length: n }, () => crypto.randomUUID());
}
