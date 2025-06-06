import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { apiGet } from '@/lib/api';

interface User {
  id: number;
  username: string;
  userType: string;
  createdAt: string;
  updatedAt: string;
}

interface BoxOpeningHistory {
  user: User;
  boxId: string;
  timestamp: string;
  status: string;
  tokenFormat: number;
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

      const response = await apiGet(`${import.meta.env.VITE_API_URL}/boxes/opening-history/host/${userId}`);

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