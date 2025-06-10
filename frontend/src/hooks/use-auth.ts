import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export function useAuth() {
  const {
    user,
    accessToken,
    isInitialized,
    twoFactorRequired,
    tempToken,
    available2FAMethods,
    selectedMethod,
    faceAuthRequestId,
    faceAuthStatus,
    websocketConnected,
  } = useSelector((state: RootState) => state.auth);

  return {
    user,
    accessToken,
    isInitialized,
    isAuthenticated: !!user,
    isHost: user?.userType === "HOST",
    isUser: user?.userType === "USER",
    hasHostAccess: user?.userType === "HOST",
    // 2FA state
    twoFactorRequired,
    tempToken,
    available2FAMethods,
    selectedMethod,
    // WebSocket Face ID state
    faceAuthRequestId,
    faceAuthStatus,
    websocketConnected,
    // Helper computed properties
    is2FAFlow: twoFactorRequired && !!tempToken,
    hasFaceIDOption: available2FAMethods.some(method => method.type === 'face_id'),
    hasTotpOption: available2FAMethods.some(method => method.type === 'totp'),
    isFaceIDSelected: selectedMethod === 'face_id',
    isTotpSelected: selectedMethod === 'totp',
    isFaceAuthPending: faceAuthStatus === 'pending',
    isFaceAuthCompleted: faceAuthStatus === 'completed',
    isFaceAuthFailed: faceAuthStatus === 'failed',
  };
} 