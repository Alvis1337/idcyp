import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface Recipe {
  id: number;
  instructions: string;
  step_number: number;
}

export interface Ingredient {
  id: number;
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Review {
  id: number;
  rating: number;
  review: string;
  user_name: string;
  created_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  category: string;
  price: number | string; // Can be string from database DECIMAL type
  image_url?: string;
  contributor: string;
  prep_time_minutes?: number;
  cook_time_minutes?: number;
  servings?: number;
  difficulty?: string;
  cuisine_type?: string;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
  recipes?: Recipe[];
  ingredients?: Ingredient[];
  tags?: Tag[];
  avg_rating?: number;
  rating_count?: number;
  reviews?: Review[];
}

interface MenuState {
  items: MenuItem[];
  selectedItem: MenuItem | null;
  loading: boolean;
  error: string | null;
  filters: {
    category?: string;
    search?: string;
    tags?: string[];
    favorites?: boolean;
  };
}

const initialState: MenuState = {
  items: [],
  selectedItem: null,
  loading: false,
  error: null,
  filters: {},
};

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Async thunks
export const fetchMenuItems = createAsyncThunk(
  'menu/fetchMenuItems',
  async (filters?: { category?: string; search?: string; favorites?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.favorites) params.append('favorites', 'true');

    const response = await fetch(`${API_BASE_URL}/menu/items?${params}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch menu items');
    return await response.json();
  }
);

export const fetchMenuItem = createAsyncThunk(
  'menu/fetchMenuItem',
  async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/menu/items/${id}`, {
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to fetch menu item');
    return await response.json();
  }
);

export const addMenuItem = createAsyncThunk(
  'menu/addMenuItem',
  async (item: Partial<MenuItem>) => {
    const response = await fetch(`${API_BASE_URL}/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to add menu item');
    }
    return await response.json();
  }
);

export const updateMenuItem = createAsyncThunk(
  'menu/updateMenuItem',
  async (item: MenuItem) => {
    const response = await fetch(`${API_BASE_URL}/menu/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to update menu item');
    return await response.json();
  }
);

export const deleteMenuItem = createAsyncThunk(
  'menu/deleteMenuItem',
  async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/menu/items/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to delete menu item');
    return id;
  }
);

export const toggleFavorite = createAsyncThunk(
  'menu/toggleFavorite',
  async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/menu/items/${id}/favorite`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!response.ok) throw new Error('Failed to toggle favorite');
    return await response.json();
  }
);

export const addRating = createAsyncThunk(
  'menu/addRating',
  async ({ id, rating, review }: { id: number; rating: number; review?: string }) => {
    const response = await fetch(`${API_BASE_URL}/menu/items/${id}/rating`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ rating, review }),
    });
    if (!response.ok) throw new Error('Failed to add rating');
    return await response.json();
  }
);

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<MenuState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearSelectedItem: (state) => {
      state.selectedItem = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch menu items
      .addCase(fetchMenuItems.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItems.fulfilled, (state, action: PayloadAction<MenuItem[]>) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchMenuItems.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch menu items';
      })
      // Fetch single item
      .addCase(fetchMenuItem.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.loading = false;
        state.selectedItem = action.payload;
      })
      .addCase(fetchMenuItem.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch menu item';
      })
      // Add menu item
      .addCase(addMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        state.items.push(action.payload);
      })
      // Update menu item
      .addCase(updateMenuItem.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      // Delete menu item
      .addCase(deleteMenuItem.fulfilled, (state, action: PayloadAction<number>) => {
        state.items = state.items.filter(item => item.id !== action.payload);
      })
      // Toggle favorite
      .addCase(toggleFavorite.fulfilled, (state, action: PayloadAction<MenuItem>) => {
        const index = state.items.findIndex(item => item.id === action.payload.id);
        if (index !== -1) {
          state.items[index].is_favorite = action.payload.is_favorite;
        }
        if (state.selectedItem?.id === action.payload.id) {
          state.selectedItem.is_favorite = action.payload.is_favorite;
        }
      });
  },
});

export const { setFilters, clearFilters, clearSelectedItem } = menuSlice.actions;
export default menuSlice.reducer;
