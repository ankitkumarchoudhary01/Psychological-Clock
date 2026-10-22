import { createSlice } from '@reduxjs/toolkit';

const HISTORY_KEY = 'psych_history';

const load = () => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
};
const persist = (sessions) => {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(sessions)); } catch {}
};

const historySlice = createSlice({
  name: 'history',
  initialState: { sessions: load() },
  reducers: {
    addSession: (state, action) => {
      state.sessions.push(action.payload);
      persist(state.sessions);
    },
    clearHistory: (state) => {
      state.sessions = [];
      persist([]);
    },
  },
});

export const { addSession, clearHistory } = historySlice.actions;

export const selectSessions    = (s) => s.history.sessions;
export const selectTodayFocus  = (s) => {
  const today = new Date().toISOString().slice(0, 10);
  return s.history.sessions
    .filter((sess) => sess.date === today)
    .reduce((sum, sess) => sum + (sess.totalFocusSeconds || 0), 0);
};
export const selectWeekSessions = (s) => {
  const cutoff = Date.now() - 7 * 86400000;
  return s.history.sessions.filter((sess) => new Date(sess.startedAt).getTime() >= cutoff);
};

export default historySlice.reducer;
