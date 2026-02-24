import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface MealPlan {
  id: number;
  user_id: number;
  menu_item_id: number;
  planned_date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  notes?: string;
  completed: boolean;
  meal_name?: string;
  image_url?: string;
  category?: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
}

interface MealPlanState {
  plans: MealPlan[];
  loading: boolean;
  error: string | null;
  selectedDate: string;
}

const initialState: MealPlanState = {
  plans: [],
  loading: false,
  error: null,
  selectedDate: new Date().toISOString().split('T')[0],
};

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const fetchMealPlans = createAsyncThunk(
  'mealPlan/fetchMealPlans',
  async ({ startDate, endDate }: { startDate: string; endDate: string }) => {
    const response = await fetch(
      `${API_BASE_URL}/meals/plans?startDate=${startDate}&endDate=${endDate}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch meal plans');
    return await response.json();
  }
);

export const fetchDayMealPlan = createAsyncThunk(
  'mealPlan/fetchDayMealPlan',
  async (date: string) => {
    const response = await fetch(`${API_BASE_URL}/meals/plans/day/${date}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch meal plan');
    return await response.json();
  }
);

export const addMealPlan = createAsyncThunk(
  'mealPlan/addMealPlan',
  async (plan: Omit<MealPlan, 'id' | 'user_id'>) => {
    const response = await fetch(`${API_BASE_URL}/meals/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(plan),
    });
    if (!response.ok) throw new Error('Failed to add meal plan');
    return await response.json();
  }
);

export const updateMealPlan = createAsyncThunk(
  'mealPlan/updateMealPlan',
  async (plan: MealPlan) => {
    const response = await fetch(`${API_BASE_URL}/meals/plans/${plan.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(plan),
    });
    if (!response.ok) throw new Error('Failed to update meal plan');
    return await response.json();
  }
);

export const deleteMealPlan = createAsyncThunk(
  'mealPlan/deleteMealPlan',
  async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/meals/plans/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete meal plan');
    return id;
  }
);

export const generateShoppingList = createAsyncThunk(
  'mealPlan/generateShoppingList',
  async ({ startDate, endDate, name }: { startDate: string; endDate: string; name?: string }) => {
    const response = await fetch(`${API_BASE_URL}/meals/plans/shopping-list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ startDate, endDate, name }),
    });
    if (!response.ok) throw new Error('Failed to generate shopping list');
    return await response.json();
  }
);

const mealPlanSlice = createSlice({
  name: 'mealPlan',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch meal plans
      .addCase(fetchMealPlans.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMealPlans.fulfilled, (state, action: PayloadAction<MealPlan[]>) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(fetchMealPlans.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch meal plans';
      })
      // Fetch day meal plan
      .addCase(fetchDayMealPlan.fulfilled, (state, action: PayloadAction<MealPlan[]>) => {
        state.plans = action.payload;
      })
      // Add meal plan
      .addCase(addMealPlan.fulfilled, (state, action: PayloadAction<MealPlan>) => {
        state.plans.push(action.payload);
      })
      // Update meal plan
      .addCase(updateMealPlan.fulfilled, (state, action: PayloadAction<MealPlan>) => {
        const index = state.plans.findIndex(plan => plan.id === action.payload.id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
      })
      // Delete meal plan
      .addCase(deleteMealPlan.fulfilled, (state, action: PayloadAction<number>) => {
        state.plans = state.plans.filter(plan => plan.id !== action.payload);
      });
  },
});

export const { setSelectedDate } = mealPlanSlice.actions;
export default mealPlanSlice.reducer;
