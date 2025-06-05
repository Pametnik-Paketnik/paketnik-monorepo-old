import { useSelector } from "react-redux";
import type { RootState } from "@/store";

export function useAuth() {
  const { user, accessToken, isInitialized } = useSelector(
    (state: RootState) => state.auth
  );

  return {
    user,
    accessToken,
    isInitialized,
    isAuthenticated: !!user,
    isHost: user?.userType === "HOST",
    isUser: user?.userType === "USER",
    hasHostAccess: user?.userType === "HOST",
  };
} 