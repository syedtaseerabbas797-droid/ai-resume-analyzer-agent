import { useAuthGuard } from "./useAuthGuard";
import { useAuth } from "@/context/AuthContext";

/**
 * Ensures the user is authenticated and returns their candidateId.
 */
export function useCandidateGuard(): string | null {
  const isAuthenticated = useAuthGuard();
  const { user } = useAuth();

  if (!isAuthenticated || !user) return null;
  return user.candidate_id;
}
