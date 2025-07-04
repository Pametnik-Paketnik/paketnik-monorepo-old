import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from './index';
import { apiGet } from '@/lib/api';

export const fetchReservations = createAsyncThunk('reservations/fetchReservations', async (_, { rejectWithValue, getState }) => {
  try {
    const state = getState() as RootState;
    const hostId = state.auth.user?.id;

    console.log('Fetching reservations with hostId:', hostId);

    if (!hostId) {
      console.error('No host ID available');
      throw new Error('No host ID available');
    }
    
    const url = `${import.meta.env.VITE_API_URL}/reservations/host/${hostId}`;
    console.log('Fetching from URL:', url);
    
    const res = await apiGet(url);
    
    console.log('Response status:', res.status);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('API Error:', errorText);
      throw new Error('Failed to fetch reservations');
    }
    
    const data = await res.json();
    console.log('Received reservations data:', data);
    return data;
  } catch (err: unknown) {
    console.error('Error in fetchReservations:', err);
    return rejectWithValue(err instanceof Error ? err.message : 'Unknown error');
  }
});

const reservationsSlice = createSlice({
  name: 'reservations',
  initialState: {
    items: [],
    loading: false,
    error: null as string | null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchReservations.pending, (state) => {
        console.log('Fetching reservations...');
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchReservations.fulfilled, (state, action) => {
        console.log('Reservations fetched successfully:', action.payload);
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchReservations.rejected, (state, action) => {
        console.error('Failed to fetch reservations:', action.payload);
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default reservationsSlice.reducer; 