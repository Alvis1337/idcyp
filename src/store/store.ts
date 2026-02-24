import { configureStore } from '@reduxjs/toolkit';
import menuReducer from './menuSlice';
import mealPlanReducer from './mealPlanSlice';

export const store = configureStore({
  reducer: {
    menu: menuReducer,
    mealPlan: mealPlanReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
