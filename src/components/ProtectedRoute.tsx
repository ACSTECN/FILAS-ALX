import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore, roleMatches } from "@/store/authStore";
import type { ReactNode } from "react";
import type { UserRole } from "@/types/auth";

type ProtectedRouteProps = {
  allowedRoles: UserRole | UserRole[];
  children: ReactNode;
};

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);

  if (!roleMatches(user, allowedRoles)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
