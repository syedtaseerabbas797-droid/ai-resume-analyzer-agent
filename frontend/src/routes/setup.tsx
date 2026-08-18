import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCandidate } from "@/context/CandidateContext";
import { ApiError, seedCandidate } from "@/lib/api";

export const Route = createFileRoute("/setup")({
  head: () => ({
    meta: [
      { title: "Candidate Setup — JobScout AI" },
      {
        name: "description",
        content:
          "Set or seed a candidate ID to start using the JobScout AI career agent.",
      },
    ],
  }),
  component: SetupPage,
});

function SetupPage() {
  const { candidateId, setCandidateId } = useCandidate();
  const navigate = useNavigate();
  const [draft, setDraft] = React.useState("");

  React.useEffect(() => {
    setDraft(candidateId ?? "");
  }, [candidateId]);

  const seed = useMutation({
    mutationFn: seedCandidate,
    onSuccess: (data) => {
      setDraft(data.candidate_id);
      setCandidateId(data.candidate_id);
      toast.success("Demo candidate created", { description: data.message });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : "Could not create candidate";
      toast.error("Seed failed", { description: msg });
    },
  });

  const handleSave = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Please enter a candidate ID");
      return;
    }
    setCandidateId(trimmed);
    toast.success("Candidate ID saved");
  };

  const handleContinue = () => {
    const trimmed = draft.trim();
    if (!trimmed) {
      toast.error("Please enter or seed a candidate ID first");
      return;
    }
    setCandidateId(trimmed);
    navigate({ to: "/upload" });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Step 1"
        title="Candidate Setup"
        description="Use an existing candidate ID from your database or create a fresh demo candidate to begin."
      />

      <div className="js-fade-up flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/10 p-4">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold text-foreground">Important</p>
          <p className="text-muted-foreground">
            Use a real candidate ID from your database. The default Swagger
            UUID will not work.
          </p>
        </div>
      </div>

      <div className="js-fade-up space-y-6 rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <Label htmlFor="candidateId">Candidate ID (UUID)</Label>
          <Input
            id="candidateId"
            placeholder="e.g. 3f3a9c40-9b2c-4ad0-9f2d-1a2b3c4d5e6f"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Stored locally in your browser so it persists across pages.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSave} variant="outline">
            Save ID
          </Button>
          <Button
            variant="secondary"
            onClick={() => seed.mutate()}
            disabled={seed.isPending}
          >
            <UserPlus className="h-4 w-4" />
            {seed.isPending ? "Creating…" : "Create Demo Candidate"}
          </Button>
          <Button
            onClick={handleContinue}
            className="ml-auto js-hover-lift"
            disabled={!draft.trim()}
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {candidateId ? (
        <div className="js-fade-up rounded-2xl border border-border bg-primary-soft/60 p-5">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Active candidate
              </p>
              <p className="truncate font-mono text-sm text-foreground">
                {candidateId}
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link to="/upload">Go to upload</Link>
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
