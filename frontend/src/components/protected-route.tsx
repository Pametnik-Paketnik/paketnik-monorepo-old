import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredUserType?: string;
}

export function ProtectedRoute({ children, requiredUserType }: ProtectedRouteProps) {
  const navigate = useNavigate();
  const { user, isInitialized } = useAuth();

  useEffect(() => {
    if (isInitialized) {
      // If user is not authenticated, redirect to login
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // If a specific user type is required and user doesn't match, redirect to login
      if (requiredUserType && user.userType !== requiredUserType) {
        navigate("/login", { replace: true });
        return;
      }
    }
  }, [user, isInitialized, navigate, requiredUserType]);

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // If user is not authenticated, don't render anything (will redirect)
  if (!user) {
    return null;
  }

  // If a specific user type is required and user doesn't match, don't render anything (will redirect)
  if (requiredUserType && user.userType !== requiredUserType) {
    return null;
  }

  return <>{children}</>;
} 