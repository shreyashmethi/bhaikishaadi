// Small haptic confirmation for "it worked" moments (plan §6).
// Safe no-op where the Vibration API is unavailable (iOS Safari, desktop).
export function buzz(pattern: number | number[] = 30) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* ignore */
    }
  }
}
