import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/context/AuthContext";

/**
 * Redirects unauthenticated users to /login after client hydration.
 * Returns isAuthenticated — use it to avoid rendering protected UI
 * before the redirect fires.
 *
 * @example
 * function ProtectedPage() {
 *   const isAuthenticated = useAuthGuard();
 *   if (!isAuthenticated) return null;   // blank flash before redirect
 *   return <div>Secret content</div>;
 * }
 */
export function useAuthGuard(): boolean {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [hydrated, isAuthenticated, navigate]);

  return isAuthenticated;
}
