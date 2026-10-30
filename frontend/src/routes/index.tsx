import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  FileText,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JobScout AI — Your AI-Powered Career Agent" },
      {
        name: "description",
        content:
          "Upload your resume, let an AI agent search jobs, and get ranked, ATS-aware matches in minutes.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="js-hero-gradient relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:py-20 md:px-8 md:py-28">
          <div className="js-fade-up mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-agentic" />
              Autonomous AI career agent
            </span>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl md:text-5xl lg:text-6xl">
              Your AI-Powered{" "}
              <span className="bg-gradient-to-r from-primary via-agentic to-ai bg-clip-text text-transparent">
                Career Agent
              </span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground sm:mt-5 sm:text-base md:text-lg">
              Upload your resume, let the AI agent search jobs across the web,
              and get ranked matches scored against your skills and experience.
            </p>
            <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <Button asChild size="lg" className="js-hover-lift w-full sm:w-auto">
                <Link to="/signup">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/upload">Upload resume</Link>
              </Button>
            </div>
          </div>

          {/* 3-step cards */}
          <div className="js-fade-up mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:mt-16">
            {[
              {
                icon: Upload,
                title: "Upload Resume",
                desc: "Drop your PDF or DOCX. We extract and analyze it.",
                tone: "primary",
              },
              {
                icon: Search,
                title: "AI Agent Searches",
                desc: "The agent generates queries and finds relevant jobs.",
                tone: "agentic",
              },
              {
                icon: Target,
                title: "Ranked Matches",
                desc: "Get ATS-style scores with matched and missing skills.",
                tone: "ai",
              },
            ].map((s, i) => (
              <div
                key={s.title}
                className="js-hover-lift relative rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={
                      s.tone === "primary"
                        ? "grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"
                        : s.tone === "agentic"
                          ? "grid h-10 w-10 place-items-center rounded-xl bg-agentic/10 text-agentic"
                          : "grid h-10 w-10 place-items-center rounded-xl bg-ai/10 text-ai"
                    }
                  >
                    <s.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:py-20 md:px-8">
        <div className="js-fade-up max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            What's inside
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            Built like a senior career strategist.
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Three focused capabilities working together — resume intelligence,
            autonomous search, and recruiter-grade matching.
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 sm:gap-5">
          {[
            {
              icon: FileText,
              title: "AI Resume Analysis",
              desc: "ATS score, technical and soft skills, strengths, weaknesses, and improvement suggestions.",
              tone: "primary",
            },
            {
              icon: Bot,
              title: "Real-Time Job Search",
              desc: "An agent generates targeted queries and collects fresh listings across the web.",
              tone: "agentic",
            },
            {
              icon: ShieldCheck,
              title: "Smart ATS Matching",
              desc: "Each job is scored on skills, experience, and role fit, with matched and missing keywords.",
              tone: "ai",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="js-hover-lift rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
            >
              <span
                className={
                  f.tone === "primary"
                    ? "grid h-11 w-11 place-items-center rounded-xl bg-primary-soft text-primary"
                    : f.tone === "agentic"
                      ? "grid h-11 w-11 place-items-center rounded-xl bg-agentic/10 text-agentic"
                      : "grid h-11 w-11 place-items-center rounded-xl bg-ai/10 text-ai"
                }
              >
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground sm:text-lg">
                {f.title}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg" className="js-hover-lift w-full sm:w-auto">
            <Link to="/signup">
              Launch JobScout <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
