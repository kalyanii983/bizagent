const AUTH_KEY = 'nxtbiz_auth';

export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuthState(state) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_KEY);
}

export function updateAuthState(patch) {
  const current = getAuthState() || {};
  setAuthState({ ...current, ...patch });
}
