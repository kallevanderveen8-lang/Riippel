// CrazyGames' weekly season opens every Monday at 09:00 UTC.
const WEEK_MS = 7 * 86400000;
const FIRST_MONDAY = Date.UTC(1970, 0, 5, 9);
export function weeklyId(now = Date.now()) { return Math.floor((now - FIRST_MONDAY) / WEEK_MS); }
export function weeklyStart(id) { return FIRST_MONDAY + id * WEEK_MS; }
export function weeklySeed(id) { return (Math.imul(id, 2654435761) + 0x72697070) >>> 0; }
export function weeklyStars(stones, par) { return stones <= par ? 3 : stones === par + 1 ? 2 : 1; }
export function weeklyScore(stars, seconds) {
  // POINTS descending: even the slowest 3★ clear beats every 2★ clear.
  const centiseconds = Math.min(9999999, Math.max(0, Math.round(seconds * 100)));
  return stars * 10000000 + 9999999 - centiseconds;
}
export function weeklyTime(seconds) {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const minutes = Math.floor(centiseconds / 6000);
  return `${minutes}:${String(Math.floor(centiseconds / 100) % 60).padStart(2,'0')}.${String(centiseconds % 100).padStart(2,'0')}`;
}
export function recordWeekly(progress, id, stars, seconds) {
  const score = weeklyScore(stars, seconds), old = progress.weeklyBest[id];
  if (old && old.score >= score) return { ...old, improved: false };
  const best = { stars, seconds: Math.round(seconds * 100) / 100, score };
  progress.weeklyBest[id] = best;
  // Retain a year's personal results without swelling cloud saves forever.
  for (const key of Object.keys(progress.weeklyBest)) if (Number(key) < id - 52) delete progress.weeklyBest[key];
  return { ...best, improved: true };
}
export async function encryptScore(score, base64Key) {
  if (!Number.isSafeInteger(score) || !base64Key || !globalThis.crypto?.subtle) throw new Error('Leaderboard encryption unavailable');
  const keyBytes = Uint8Array.from(atob(base64Key), char => char.charCodeAt(0));
  if (keyBytes.length !== 32) throw new Error('Leaderboard key must be 32 bytes');
  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv}, key, new TextEncoder().encode(String(score))));
  const payload = new Uint8Array(iv.length + encrypted.length); payload.set(iv); payload.set(encrypted, iv.length);
  return btoa(Array.from(payload, byte => String.fromCharCode(byte)).join(''));
}
