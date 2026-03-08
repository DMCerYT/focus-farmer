/**
 * Creates a fresh mutable game state object for one app session.
 * Keep all runtime state here so components can share a single source of truth.
 */
export function createGameState() {
  return {
    coins: 0,
    sessions: 0,
    currentFocus: null,
    focusTimerId: null,
    restTimerId: null,
    restEndsAt: null,
    onFocusStateChange: null,
  };
}
