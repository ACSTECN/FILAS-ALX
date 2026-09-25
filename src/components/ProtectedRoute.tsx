import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, roleMatches } from "@/store/authStore";
import { usePlatformAuthStore } from "@/store/platformAuthStore";
import type { ReactNode } from "react";
import type { UserRole } from "@/types/auth";

type ProtectedRouteProps = {
  allowedRoles: UserRole | UserRole[];
  children: ReactNode;
  guardType?: "alx" | "platform-admin";
  redirectTo?: string;
};

export function ProtectedRoute({
  allowedRoles,
  children,
  guardType = "alx",
  redirectTo,
}: ProtectedRouteProps) {
  const location = useLocation();
  const platformUser = usePlatformAuthStore((s) => s.user);
  const user = useAuthStore((state) => state.user);

  if (guardType === "platform-admin") {
    if (roleMatches(platformUser, allowedRoles)) {
      return <>{children}</>;
    }
    const to = redirectTo ?? "/admin-login";
    return <Navigate to={to} replace state={{ from: location }} />;
  }

  if (roleMatches(user, allowedRoles)) {
    return <>{children}</>;
  }

  if (user?.role === "entregador") {
    return <Navigate to="/entregador" replace />;
  }

  return <Navigate to={redirectTo ?? "/login"} replace state={{ from: location }} />;
}
