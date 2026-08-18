import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { useCandidate } from "@/context/CandidateContext";

/**
 * Redirects to /setup if no candidate_id is present after hydration.
 * Returns the current candidateId (may be null on the first render).
 */
export function useCandidateGuard(): string | null {
  const { candidateId } = useCandidate();
  const navigate = useNavigate();
  const [hydrated, setHydrated] = React.useState(false);

  React.useEffect(() => {
    setHydrated(true);
  }, []);

  React.useEffect(() => {
    if (hydrated && !candidateId) {
      toast.error("No candidate ID set. Please set one up first.");
      navigate({ to: "/setup" });
    }
  }, [hydrated, candidateId, navigate]);

  return candidateId;
}
