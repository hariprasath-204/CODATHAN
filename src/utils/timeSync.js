let clockOffset = 0;
let isSynced = false;
let syncPromise = null;
let syncIntervalStarted = false;

/**
 * Synchronizes client clock with the authoritative backend server time
 * using HTTP Date headers or API endpoints to prevent clock drift
 * and ensure exact synchronized countdown across all devices.
 */
export async function syncClock(force = false) {
  if (force) {
    syncPromise = null;
  }
  if (syncPromise) return syncPromise;

  if (!syncIntervalStarted && typeof window !== 'undefined') {
    syncIntervalStarted = true;
    // Re-sync every 30 seconds
    setInterval(() => {
      syncClock(true).catch(() => {});
    }, 30000);
  }

  syncPromise = (async () => {
    try {
      const start = Date.now();
      const res = await fetch(window.location.origin, { method: 'HEAD', cache: 'no-store' });
      const dateHeader = res.headers.get('Date');
      if (dateHeader) {
        const serverTime = new Date(dateHeader).getTime();
        if (!isNaN(serverTime) && serverTime > 0) {
          const roundTrip = Date.now() - start;
          clockOffset = (serverTime + roundTrip / 2) - Date.now();
          isSynced = true;
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('clock-synced'));
          }
          return;
        }
      }
    } catch (err) {
      console.warn("Time sync fallback to local clock:", err?.message);
    }
  })();

  return syncPromise;
}

/**
 * Returns the current synchronized timestamp in milliseconds.
 * Works accurately across devices regardless of local OS clock differences.
 */
export function getNow() {
  return Date.now() + clockOffset;
}
