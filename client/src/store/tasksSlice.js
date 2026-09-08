import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  tasks: [],
  isLoading: false,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasks: (state, action) => {
      state.tasks = action.payload;
    },
    addTask: (state, action) => {
      state.tasks.push(action.payload);
    },
    updateTask: (state, action) => {
      const idx = state.tasks.findIndex((t) => t._id === action.payload._id);
      if (idx !== -1) state.tasks[idx] = action.payload;
    },
    removeTask: (state, action) => {
      state.tasks = state.tasks.filter((t) => t._id !== action.payload);
    },
    reorderTasks: (state, action) => {
      state.tasks = action.payload;
    },
    setTasksLoading: (state, action) => {
      state.isLoading = action.payload;
    },
  },
});

export const { setTasks, addTask, updateTask, removeTask, reorderTasks, setTasksLoading } =
  tasksSlice.actions;

export const selectTasks = (state) => state.tasks.tasks;
export const selectTasksLoading = (state) => state.tasks.isLoading;
export const selectTotalMinutes = (state) =>
  state.tasks.tasks.reduce((sum, t) => sum + t.durationMinutes, 0);

export default tasksSlice.reducer;
