import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bot, Loader2, Rocket, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { useCandidateGuard } from "@/hooks/useCandidateGuard";
import { useCandidate } from "@/context/CandidateContext";
import { ApiError, runAgent } from "@/lib/api";

export const Route = createFileRoute("/agent/")({
  head: () => ({
    meta: [
      { title: "Run Agent — JobScout AI" },
      {
        name: "description",
        content:
          "Launch the JobScout AI agent to search for matching jobs based on your resume.",
      },
    ],
  }),
  component: AgentLaunchPage,
});

function AgentLaunchPage() {
  const candidateId = useCandidateGuard();
  const { setLastRunId } = useCandidate();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error("Missing candidate");
      return runAgent(candidateId);
    },
    onSuccess: (data) => {
      if (!data?.run_id) {
        toast.error("Agent did not return a run ID");
        return;
      }
      setLastRunId(data.run_id);
      toast.success("Agent launched", {
        description: "Tracking progress in real time.",
      });
      navigate({
        to: "/agent/progress/$runId",
        params: { runId: data.run_id },
      });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : "Could not launch agent";
      toast.error("Launch failed", { description: msg });
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 md:px-8 md:py-14">
      <PageHeader
        eyebrow="Step 4"
        title="Launch JobScout Agent"
        description="The autonomous agent will generate search queries, find jobs, extract details, and score them against your resume."
      />



      <div className="js-fade-up rounded-2xl border border-border bg-gradient-to-br from-card via-card to-primary-soft/40 p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary via-agentic to-ai text-primary-foreground shadow-lg">
            <Bot className="h-7 w-7" />
          </span>
          <h2 className="mt-5 text-2xl font-semibold tracking-tight text-foreground">
            Ready to find your next role?
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            One click launches the agent. You'll be redirected to a live
            progress view.
          </p>

          <div className="mt-6 grid w-full max-w-md grid-cols-3 gap-2 text-[11px] text-muted-foreground">
            {["Query gen", "Job search", "Match & score"].map((s) => (
              <div
                key={s}
                className="rounded-lg border border-border bg-card px-2 py-1.5"
              >
                <Sparkles className="mx-auto mb-1 h-3 w-3 text-agentic" />
                {s}
              </div>
            ))}
          </div>

          <Button
            size="lg"
            className="js-hover-lift mt-8"
            disabled={mutation.isPending || !candidateId}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Launching…
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4" /> Launch JobScout Agent
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
