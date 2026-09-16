import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";
import { Loader2 } from "lucide-react";

export function AuthGuard() {
  const { isAuthenticated, isInitialized, user } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // Allow onboarding flow pages even if onboarding isn't complete
  const onboardingPaths = ["/onboarding", "/connect-accounts"];
  if (user && !user.onboardingComplete && !onboardingPaths.includes(location.pathname)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <Outlet />;
}

export function GuestGuard() {
  const { isAuthenticated, isInitialized, user } = useAuthStore();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (isAuthenticated) {
    if (user && !user.onboardingComplete) {
      return <Navigate to="/connect-accounts" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
