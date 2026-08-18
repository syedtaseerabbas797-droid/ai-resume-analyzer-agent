import { Link } from "@tanstack/react-router";
import { AlertTriangle, Copy, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCandidate } from "@/context/CandidateContext";

export function CandidateIdBanner({ showWarning = false }: { showWarning?: boolean }) {
  const { candidateId } = useCandidate();

  const handleCopy = async () => {
    if (!candidateId) return;
    try {
      await navigator.clipboard.writeText(candidateId);
      toast.success("Candidate ID copied");
    } catch {
      toast.error("Could not copy ID");
    }
  };

  if (!candidateId) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4 text-sm">
        <span className="text-muted-foreground">No candidate ID set.</span>
        <Button asChild size="sm">
          <Link to="/setup">Set up candidate</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary-soft text-primary">
            <Fingerprint className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              Candidate ID
            </p>
            <p className="truncate font-mono text-sm text-foreground">
              {candidateId}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-3.5 w-3.5" /> Copy
        </Button>
      </div>
      {showWarning ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-3 text-xs text-warning-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <p>
            <span className="font-semibold text-warning">Heads up:</span>{" "}
            Use a real candidate ID from your database. The default Swagger UUID
            will not work.
          </p>
        </div>
      ) : null}
    </div>
  );
}
