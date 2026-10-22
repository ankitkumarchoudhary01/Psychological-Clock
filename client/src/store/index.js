import { configureStore } from '@reduxjs/toolkit';
import authReducer    from './authSlice';
import tasksReducer   from './tasksSlice';
import clockReducer   from './clockSlice';
import historyReducer from './historySlice';

const store = configureStore({
  reducer: {
    auth:    authReducer,
    tasks:   tasksReducer,
    clock:   clockReducer,
    history: historyReducer,
  },
});

export default store;
