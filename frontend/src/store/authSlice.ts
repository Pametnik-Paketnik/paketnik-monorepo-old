import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";
import Cookies from "js-cookie";

interface User {
  id: number;
  name: string;
  surname: string;
  email: string;
  userType: string;
}

interface TwoFactorMethod {
  type: string;
  enabled: boolean;
  display_name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  // 2FA flow state
  twoFactorRequired: boolean;
  tempToken: string | null;
  available2FAMethods: TwoFactorMethod[];
  selectedMethod: string | null;
  // WebSocket Face ID state
  faceAuthRequestId: string | null;
  faceAuthStatus: 'idle' | 'pending' | 'completed' | 'failed' | 'expired';
  websocketConnected: boolean;
}

const COOKIE_NAME = "auth_session";

// Try to get initial state from cookies
const getInitialState = (): AuthState => {
  const savedSession = Cookies.get(COOKIE_NAME);
  if (savedSession) {
    try {
      const parsedSession = JSON.parse(savedSession);
      return {
        user: parsedSession.user || null,
        accessToken: parsedSession.accessToken || null,
        isInitialized: true,
        twoFactorRequired: false,
        tempToken: null,
        available2FAMethods: [],
        selectedMethod: null,
        faceAuthRequestId: null,
        faceAuthStatus: 'idle',
        websocketConnected: false,
      };
    } catch {
      return {
        user: null,
        accessToken: null,
        isInitialized: true,
        twoFactorRequired: false,
        tempToken: null,
        available2FAMethods: [],
        selectedMethod: null,
        faceAuthRequestId: null,
        faceAuthStatus: 'idle',
        websocketConnected: false,
      };
    }
  }
  return {
    user: null,
    accessToken: null,
    isInitialized: true,
    twoFactorRequired: false,
    tempToken: null,
    available2FAMethods: [],
    selectedMethod: null,
    faceAuthRequestId: null,
    faceAuthStatus: 'idle',
    websocketConnected: false,
  };
};

const initialState: AuthState = getInitialState();

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    // Complete login (no 2FA or after 2FA completion)
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string }>
    ) => {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.isInitialized = true;
      state.twoFactorRequired = false;
      state.tempToken = null;
      state.available2FAMethods = [];
      state.selectedMethod = null;
      state.faceAuthRequestId = null;
      state.faceAuthStatus = 'idle';
      state.websocketConnected = false;
      
      // Save to cookie
      Cookies.set(COOKIE_NAME, JSON.stringify({
        user: state.user,
        accessToken: state.accessToken
      }), { expires: 7 }); // Expires in 7 days
    },

    // Set 2FA required state after initial login
    set2FARequired: (
      state,
      action: PayloadAction<{
        tempToken: string;
        available2FAMethods: TwoFactorMethod[];
      }>
    ) => {
      state.twoFactorRequired = true;
      state.tempToken = action.payload.tempToken;
      state.available2FAMethods = action.payload.available2FAMethods;
      state.selectedMethod = null;
      state.faceAuthRequestId = null;
      state.faceAuthStatus = 'idle';
    },

    // Select 2FA method
    select2FAMethod: (state, action: PayloadAction<string>) => {
      state.selectedMethod = action.payload;
      state.faceAuthRequestId = null;
      state.faceAuthStatus = 'idle';
    },

    // WebSocket Face ID specific actions
    setFaceAuthRequest: (
      state,
      action: PayloadAction<{ requestId: string; status: string }>
    ) => {
      state.faceAuthRequestId = action.payload.requestId;
      state.faceAuthStatus = action.payload.status as AuthState['faceAuthStatus'];
    },

    updateFaceAuthStatus: (
      state,
      action: PayloadAction<AuthState['faceAuthStatus']>
    ) => {
      state.faceAuthStatus = action.payload;
    },

    setWebSocketConnected: (state, action: PayloadAction<boolean>) => {
      state.websocketConnected = action.payload;
    },

    // Reset 2FA state (for errors or cancellation)
    reset2FAFlow: (state) => {
      state.twoFactorRequired = false;
      state.tempToken = null;
      state.available2FAMethods = [];
      state.selectedMethod = null;
      state.faceAuthRequestId = null;
      state.faceAuthStatus = 'idle';
      state.websocketConnected = false;
    },

    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.isInitialized = true;
      state.twoFactorRequired = false;
      state.tempToken = null;
      state.available2FAMethods = [];
      state.selectedMethod = null;
      state.faceAuthRequestId = null;
      state.faceAuthStatus = 'idle';
      state.websocketConnected = false;
      
      // Remove cookie
      Cookies.remove(COOKIE_NAME);
    },
  },
});

export const {
  setCredentials,
  set2FARequired,
  select2FAMethod,
  setFaceAuthRequest,
  updateFaceAuthStatus,
  setWebSocketConnected,
  reset2FAFlow,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
