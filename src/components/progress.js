const PROGRESS_KEY = 'focus-farmer-progress-v1';

/**
 * Local progress store with account-ready shape.
 *
 * Account integration path:
 * - Keep this API stable.
 * - Swap the internals from localStorage to remote API calls keyed by `user.id`.
 */
export function createProgressStore(storage = window.localStorage) {
  function readRaw() {
    try {
      const raw = storage.getItem(PROGRESS_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function writeRaw(payload) {
    storage.setItem(PROGRESS_KEY, JSON.stringify(payload));
  }

  function defaultProgress() {
    return {
      user: {
        id: null,
        email: null,
      },
      totals: {
        coins: 0,
        sessions: 0,
      },
      sessions: [],
    };
  }

  function getProgress() {
    const stored = readRaw();
    if (!stored) {
      return defaultProgress();
    }

    return {
      user: {
        id: stored.user?.id ?? null,
        email: stored.user?.email ?? null,
      },
      totals: {
        coins: Number(stored.totals?.coins || 0),
        sessions: Number(stored.totals?.sessions || 0),
      },
      sessions: Array.isArray(stored.sessions) ? stored.sessions : [],
    };
  }

  /**
   * Keep this setter so auth can plug in once login is implemented.
   */
  function setUser(user) {
    const progress = getProgress();
    progress.user = {
      id: user?.id ?? null,
      email: user?.email ?? null,
    };
    writeRaw(progress);
  }

  function saveTotals({ coins, sessions }) {
    const progress = getProgress();
    progress.totals = { coins, sessions };
    writeRaw(progress);
  }

  function addSession(entry) {
    const progress = getProgress();
    progress.sessions.unshift(entry);

    // Keep history bounded for fast popup/overlay loads.
    progress.sessions = progress.sessions.slice(0, 200);
    writeRaw(progress);
  }

  return {
    getProgress,
    setUser,
    saveTotals,
    addSession,
  };
}
