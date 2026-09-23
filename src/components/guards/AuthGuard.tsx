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

  // Email first — nothing else works until it's verified
  if (user && !user.emailVerified && location.pathname !== "/verify-email") {
    return <Navigate to="/verify-email" replace />;
  }

  // Already verified? Don't let them back onto the verify screen
  if (user?.emailVerified && location.pathname === "/verify-email") {
    return <Navigate to={user.onboardingComplete ? "/dashboard" : "/onboarding"} replace />;
  }

  // Allow onboarding flow pages even if onboarding isn't complete
  const onboardingPaths = ["/onboarding", "/connect-accounts", "/verify-email"];
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
    if (user && !user.emailVerified) {
      return <Navigate to="/verify-email" replace />;
    }
    if (user && !user.onboardingComplete) {
      return <Navigate to="/onboarding" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}