import { createSlice } from '@reduxjs/toolkit';

const BACKUP_KEY = 'psych_session_backup';

/** Save in-progress session to localStorage so user can resume later */
const persistBackup = (sessionTasks, currentTaskIndex, startedAt, secondsLeft) => {
  try {
    localStorage.setItem(BACKUP_KEY, JSON.stringify({
      taskIds: sessionTasks.map((t) => t._id),
      sessionTasks,
      currentTaskIndex,
      startedAt,
      secondsLeft,        // remaining seconds at the time of saving
      savedAt: new Date().toISOString(),
    }));
  } catch (_) {}
};

const clearBackup = () => {
  try { localStorage.removeItem(BACKUP_KEY); } catch (_) {}
};

/** Try to load a matching backup for the given task list */
const loadBackup = (tasks) => {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    const b = JSON.parse(raw);
    const newIds = tasks.map((t) => t._id).join(',');
    const backupIds = (b.taskIds || []).join(',');
    if (newIds !== backupIds) return null;             // different task list
    if (b.currentTaskIndex >= tasks.length) return null;
    // Ignore backups older than 24 hours
    if (Date.now() - new Date(b.savedAt).getTime() > 86400000) return null;
    return b;
  } catch (_) { return null; }
};

const initialState = {
  isRunning: false,
  currentTaskIndex: 0,
  sessionTasks: [],
  startedAt: null,
  isPiPMode: false,     // global floating mini-clock
};

const clockSlice = createSlice({
  name: 'clock',
  initialState,
  reducers: {
    /**
     * Start or resume a session.
     * payload: { tasks: Task[], startIndex?: number, forceNew?: boolean }
     *
     * If a matching backup exists (same task IDs, < 24 h old) and forceNew is
     * not set, the session is automatically resumed from saved progress.
     */
    startSession: (state, action) => {
      const { tasks, startIndex = 0, forceNew = false } = action.payload;

      const backup = forceNew ? null : loadBackup(tasks);

      if (backup) {
        // ── Resume from saved progress ──────────────────────────────────
        const idx = backup.currentTaskIndex;
        const prevMin = tasks.slice(0, idx).reduce((s, t) => s + t.durationMinutes, 0);
        const taskTotalSec = tasks[idx].durationMinutes * 60;
        // Reconstruct startedAt so that current task countdown restores to secondsLeft
        const elapsed = Math.max(0, taskTotalSec - (backup.secondsLeft ?? taskTotalSec));
        state.startedAt = new Date(Date.now() - (prevMin * 60 + elapsed) * 1000).toISOString();
        state.currentTaskIndex = idx;
      } else {
        // ── Fresh start at startIndex ────────────────────────────────────
        const prevMin = tasks.slice(0, startIndex).reduce((s, t) => s + t.durationMinutes, 0);
        state.startedAt = new Date(Date.now() - prevMin * 60 * 1000).toISOString();
        state.currentTaskIndex = startIndex;
        clearBackup();
      }

      state.isRunning = true;
      state.sessionTasks = tasks;
    },

    /** Save current progress to localStorage (called from ClockPage before exit) */
    saveProgress: (state, action) => {
      const secondsLeft = action.payload ?? 0;
      persistBackup(state.sessionTasks, state.currentTaskIndex, state.startedAt, secondsLeft);
    },

    /** Restart only the CURRENT task — rewinds its countdown to full duration */
    restartCurrentTask: (state) => {
      if (!state.isRunning) return;
      const prevMin = state.sessionTasks
        .slice(0, state.currentTaskIndex)
        .reduce((s, t) => s + t.durationMinutes, 0);
      state.startedAt = new Date(Date.now() - prevMin * 60 * 1000).toISOString();
    },

    nextTask: (state) => {
      if (state.currentTaskIndex < state.sessionTasks.length - 1) {
        state.currentTaskIndex += 1;
        // Reset startedAt so new task starts from its full duration
        const prevMin = state.sessionTasks
          .slice(0, state.currentTaskIndex)
          .reduce((s, t) => s + t.durationMinutes, 0);
        state.startedAt = new Date(Date.now() - prevMin * 60 * 1000).toISOString();
      } else {
        state.isRunning = false;
        clearBackup();
      }
    },

    prevTask: (state) => {
      if (state.currentTaskIndex > 0) {
        state.currentTaskIndex -= 1;
        const prevMin = state.sessionTasks
          .slice(0, state.currentTaskIndex)
          .reduce((s, t) => s + t.durationMinutes, 0);
        state.startedAt = new Date(Date.now() - prevMin * 60 * 1000).toISOString();
      }
    },

    setCurrentTaskIndex: (state, action) => {
      state.currentTaskIndex = action.payload;
    },

    stopSession: (state) => {
      state.isRunning = false;
      state.currentTaskIndex = 0;
      state.sessionTasks = [];
      state.startedAt = null;
      state.isPiPMode = false;
      clearBackup();
    },

    setPiPMode: (state, action) => {
      state.isPiPMode = action.payload;
    },
  },
});

export const {
  startSession,
  saveProgress,
  restartCurrentTask,
  nextTask,
  prevTask,
  setCurrentTaskIndex,
  stopSession,
  setPiPMode,
} = clockSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectIsRunning        = (s) => s.clock.isRunning;
export const selectCurrentTaskIndex = (s) => s.clock.currentTaskIndex;
export const selectSessionTasks     = (s) => s.clock.sessionTasks;
export const selectStartedAt        = (s) => s.clock.startedAt;
export const selectIsPiPMode        = (s) => s.clock.isPiPMode;
export const selectCurrentTask      = (s) =>
  s.clock.sessionTasks[s.clock.currentTaskIndex] || null;
export const selectNextTask         = (s) =>
  s.clock.sessionTasks[s.clock.currentTaskIndex + 1] || null;
export const selectIsSessionComplete = (s) =>
  !s.clock.isRunning && s.clock.sessionTasks.length > 0 && s.clock.startedAt !== null;

/** Returns backup info if a resumable session exists for the given task list */
export const selectHasBackup = (tasks) => () => Boolean(loadBackup(tasks));

export default clockSlice.reducer;
