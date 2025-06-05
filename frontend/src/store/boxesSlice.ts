import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';

export const fetchBoxes = createAsyncThunk('boxes/fetchBoxes', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const token = state.auth.accessToken;
    const hostId = state.auth.user?.id;

    console.log('Fetching boxes with:', { token: !!token, hostId });

    if (!hostId) {
      console.error('No host ID available');
      throw new Error('No host ID available');
    }
    
    const res = await fetch(`${import.meta.env.VITE_API_URL}/boxes/host/${hostId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    // console.log('API Response status:', res.status);

    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', errorText);
      throw new Error('Failed to fetch boxes');
    }

    const data = await res.json();
    // console.log('Received boxes data:', data);
    return data;
  } catch (err: any) {
    console.error('Error in fetchBoxes:', err);
    return rejectWithValue(err.message);
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