import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Bot, Eye, EyeOff, Loader2, Lock, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { ApiError, login } from "@/lib/api";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      email: typeof search.email === "string" ? search.email : undefined,
    };
  },
  head: () => ({
    meta: [
      { title: "Log In — JobScout AI" },
      {
        name: "description",
        content: "Log in to your JobScout AI account to continue your job search.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { setAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = React.useState(search.email || "");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);

  // If search param changes or is passed later
  React.useEffect(() => {
    if (search.email && !email) {
      setEmail(search.email);
    }
  }, [search.email]);

  // If already logged in, send to the app
  React.useEffect(() => {
    if (isAuthenticated) navigate({ to: "/upload" });
  }, [isAuthenticated, navigate]);

  const mutation = useMutation({
    mutationFn: () => login({ email: email.trim().toLowerCase(), password }),
    onSuccess: (data) => {
      setAuth(data.access_token, {
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        candidate_id: data.candidate_id,
        is_active: true,
      });
      toast.success("Welcome back!", {
        description: data.full_name ? `Hi, ${data.full_name}` : data.email,
      });
      navigate({ to: "/upload" });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : "Login failed. Please try again.";
      toast.error("Login failed", { description: msg });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Please fill in all fields.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 py-6 sm:py-12">
      {/* Card */}
      <div className="js-scale-in w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center sm:mb-8 sm:gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-agentic shadow-lg sm:h-14 sm:w-14">
            <Bot className="h-6 w-6 text-white sm:h-7 sm:w-7" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Welcome back
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Log in to continue your AI-powered job search.
            </p>
          </div>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="login-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={mutation.isPending}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="login-password">Password</Label>
              </div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  disabled={mutation.isPending}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Error state */}
            {mutation.isError && (
              <div className="js-fade-in rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : "Login failed. Please try again."}
              </div>
            )}

            {/* Quick Demo Fill button */}
            <button
              type="button"
              onClick={() => {
                setEmail("demo@jobscout.ai");
                setPassword("Demo12345!");
                toast.info("Demo credentials filled!", {
                  description: "Click 'Sign in' to explore with preloaded candidate data.",
                });
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 bg-primary-soft/50 py-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary-soft"
            >
              <Sparkles className="h-3.5 w-3.5 text-agentic" />
              <span>Fill Demo Credentials</span>
              <span className="font-mono text-[11px] opacity-75">(1-click review)</span>
            </button>

            {/* Submit */}
            <Button
              type="submit"
              className="js-hover-lift w-full"
              disabled={mutation.isPending}
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </div>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create one for free
          </Link>
        </p>
      </div>
    </div>
  );
}
