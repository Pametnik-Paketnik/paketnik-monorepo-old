import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

interface User {
  id: number;
  username: string;
  userType: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
}

const COOKIE_NAME = "auth_session";

// Try to get initial state from cookies
const getInitialState = (): AuthState => {
  const savedSession = Cookies.get(COOKIE_NAME);
  if (savedSession) {
    try {
      const parsedSession = JSON.parse(savedSession);
      return {
        ...parsedSession,
        isInitialized: true
      };
    } catch {
      return { user: null, accessToken: null, isInitialized: true };
    }
  }
  return { user: null, accessToken: null, isInitialized: true };
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isInitialized = true;
      // Save to cookie
      Cookies.set(COOKIE_NAME, JSON.stringify({
        user: state.user,
        accessToken: state.accessToken
      }), { expires: 7 }); // Expires in 7 days
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isInitialized = true;
      // Remove cookie
      Cookies.remove(COOKIE_NAME);
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
