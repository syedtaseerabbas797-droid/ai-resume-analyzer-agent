import * as React from "react";
import { useAuth } from "./AuthContext";

const RUN_KEY = "jobscout.last_run_id";

interface CandidateContextValue {
  candidateId: string | null;
  lastRunId: string | null;
  setLastRunId: (id: string | null) => void;
}

const CandidateContext = React.createContext<CandidateContextValue | null>(
  null,
);

function readLocal(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (value == null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function CandidateProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const candidateId = user?.candidate_id || null;

  const [lastRunId, setLastRunIdState] = React.useState<string | null>(null);

  // Hydrate from localStorage on mount (client only).
  React.useEffect(() => {
    setLastRunIdState(readLocal(RUN_KEY));
  }, []);

  const setLastRunId = React.useCallback((id: string | null) => {
    setLastRunIdState(id);
    writeLocal(RUN_KEY, id);
  }, []);

  const value = React.useMemo(
    () => ({ candidateId, lastRunId, setLastRunId }),
    [candidateId, lastRunId, setLastRunId],
  );

  return (
    <CandidateContext.Provider value={value}>
      {children}
    </CandidateContext.Provider>
  );
}

export function useCandidate(): CandidateContextValue {
  const ctx = React.useContext(CandidateContext);
  if (!ctx) {
    throw new Error("useCandidate must be used inside <CandidateProvider>");
  }
  return ctx;
}
