import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { apiGet } from '@/lib/api';

interface BoxOpeningHistory {
  id: string;
  boxId: string;
  userId: number;
  openedAt: string;
  closedAt: string | null;
  status: string;
  [key: string]: any;
}

export const fetchBoxOpeningHistory = createAsyncThunk(
  'boxOpeningHistory/fetchBoxOpeningHistory',
  async (_, { rejectWithValue, getState }) => {
    try {
      const state = getState() as RootState;
      const userId = state.auth.user?.id;

      if (!userId) {
        throw new Error('No user ID available');
      }

      const response = await apiGet(`${import.meta.env.VITE_API_URL}/boxes/opening-history/user/${userId}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch box opening history: ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (err: unknown) {
      return rejectWithValue(err instanceof Error ? err.message : 'Unknown error');
    }
  }
);

const boxOpeningHistorySlice = createSlice({
  name: 'boxOpeningHistory',
  initialState: {
    items: [] as BoxOpeningHistory[],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoxOpeningHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchBoxOpeningHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchBoxOpeningHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default boxOpeningHistorySlice.reducer; 