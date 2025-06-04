import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';

export const fetchRevenue = createAsyncThunk('revenue/fetchRevenue', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    const hostId = state.auth.user?.id;

    if (!hostId) {
      console.error('No host ID available');
      throw new Error('No host ID available');
    }
    
    const res = await fetch(`http://localhost:3000/api/boxes/host/${hostId}/revenue`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) throw new Error('Failed to fetch revenue');
    return await res.json();
  } catch (err: any) {
    return rejectWithValue(err.message);
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