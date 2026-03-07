/**
 * Converts milliseconds into MM:SS for timer display.
 */
export function formatMMSS(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

/**
 * Returns one random item from a non-empty array.
 */
export function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
