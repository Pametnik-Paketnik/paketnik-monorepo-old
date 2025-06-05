import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { apiGet } from '@/lib/api';

export const fetchBoxes = createAsyncThunk('boxes/fetchBoxes', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const hostId = state.auth.user?.id;

    console.log('Fetching boxes with hostId:', hostId);

    if (!hostId) {
      console.error('No host ID available');
      throw new Error('No host ID available');
    }
    
    const res = await apiGet(`${import.meta.env.VITE_API_URL}/boxes/host/${hostId}`);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', errorText);
      throw new Error('Failed to fetch boxes');
    }

    const data = await res.json();
    return data;
  } catch (err: unknown) {
    console.error('Error in fetchBoxes:', err);
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error');
  }
});

const boxesSlice = createSlice({
  name: 'boxes',
  initialState: {
    items: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoxes.pending, (state) => {
        // console.log('Fetching boxes...');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoxes.fulfilled, (state, action) => {
        // console.log('Boxes fetched successfully:', action.payload);  
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBoxes.rejected, (state, action) => {
        // console.error('Failed to fetch boxes:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default boxesSlice.reducer; 