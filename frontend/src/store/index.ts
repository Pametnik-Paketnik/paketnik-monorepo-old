import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import boxesReducer from './boxesSlice'
import reservationsReducer from './reservationsSlice'
import revenueReducer from './revenueSlice'
import boxOpeningHistoryReducer from './boxOpeningHistorySlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    boxes: boxesReducer,
    reservations: reservationsReducer,
    revenue: revenueReducer,
    boxOpeningHistory: boxOpeningHistoryReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch 