import * as React from "react";

const CANDIDATE_KEY = "jobscout.candidate_id";
const RUN_KEY = "jobscout.last_run_id";

interface CandidateContextValue {
  candidateId: string | null;
  setCandidateId: (id: string | null) => void;
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
  const [candidateId, setCandidateIdState] = React.useState<string | null>(
    null,
  );
  const [lastRunId, setLastRunIdState] = React.useState<string | null>(null);

  // Hydrate from localStorage on mount (client only).
  React.useEffect(() => {
    setCandidateIdState(readLocal(CANDIDATE_KEY));
    setLastRunIdState(readLocal(RUN_KEY));
  }, []);

  const setCandidateId = React.useCallback((id: string | null) => {
    setCandidateIdState(id);
    writeLocal(CANDIDATE_KEY, id);
  }, []);

  const setLastRunId = React.useCallback((id: string | null) => {
    setLastRunIdState(id);
    writeLocal(RUN_KEY, id);
  }, []);

  const value = React.useMemo(
    () => ({ candidateId, setCandidateId, lastRunId, setLastRunId }),
    [candidateId, lastRunId, setCandidateId, setLastRunId],
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
