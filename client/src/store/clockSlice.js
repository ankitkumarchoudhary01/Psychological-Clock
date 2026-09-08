import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isRunning: false,
  currentTaskIndex: 0,
  sessionTasks: [],   // snapshot of tasks at session start
  startedAt: null,    // ISO string of when the session started
};

const clockSlice = createSlice({
  name: 'clock',
  initialState,
  reducers: {
    startSession: (state, action) => {
      state.isRunning = true;
      state.currentTaskIndex = 0;
      state.sessionTasks = action.payload; // array of task objects
      state.startedAt = new Date().toISOString();
    },
    nextTask: (state) => {
      if (state.currentTaskIndex < state.sessionTasks.length - 1) {
        state.currentTaskIndex += 1;
      } else {
        // Session complete
        state.isRunning = false;
      }
    },
    prevTask: (state) => {
      if (state.currentTaskIndex > 0) {
        state.currentTaskIndex -= 1;
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
    },
  },
});

export const { startSession, nextTask, prevTask, setCurrentTaskIndex, stopSession } =
  clockSlice.actions;

export const selectIsRunning = (state) => state.clock.isRunning;
export const selectCurrentTaskIndex = (state) => state.clock.currentTaskIndex;
export const selectSessionTasks = (state) => state.clock.sessionTasks;
export const selectStartedAt = (state) => state.clock.startedAt;
export const selectCurrentTask = (state) =>
  state.clock.sessionTasks[state.clock.currentTaskIndex] || null;
export const selectNextTask = (state) =>
  state.clock.sessionTasks[state.clock.currentTaskIndex + 1] || null;
export const selectIsSessionComplete = (state) =>
  !state.clock.isRunning && state.clock.sessionTasks.length > 0 && state.clock.startedAt !== null;

export default clockSlice.reducer;
