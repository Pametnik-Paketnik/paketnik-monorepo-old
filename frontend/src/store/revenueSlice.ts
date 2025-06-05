import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { apiGet } from '@/lib/api';

export const fetchRevenue = createAsyncThunk('revenue/fetchRevenue', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const hostId = state.auth.user?.id;

    if (!hostId) {
      console.error('No host ID available');
      throw new Error('No host ID available');
    }
    
    const res = await apiGet(`${import.meta.env.VITE_API_URL}/boxes/host/${hostId}/revenue`);
    if (!res.ok) throw new Error('Failed to fetch revenue');
    return await res.json();
  } catch (err: unknown) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error');
  }
});

const revenueSlice = createSlice({
  name: 'revenue',
  initialState: {
    items: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRevenue.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRevenue.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchRevenue.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default revenueSlice.reducer; 