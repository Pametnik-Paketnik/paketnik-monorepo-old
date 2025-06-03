import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "@/store";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isInitialized } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    if (isInitialized && !user) {
      navigate("/login", { replace: true });
    }
  }, [user, isInitialized, navigate]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
} 