import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import {
  Bot,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { ApiError, signup } from "@/lib/api";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create Account — JobScout AI" },
      {
        name: "description",
        content:
          "Create a free JobScout AI account to analyze your resume and find matching jobs with AI.",
      },
    ],
  }),
  component: SignupPage,
});

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "At least 8 characters", ok: password.length >= 8 },
    { label: "Contains a number", ok: /\d/.test(password) },
    { label: "Contains a letter", ok: /[a-zA-Z]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-1">
      {checks.map((c) => (
        <li key={c.label} className="flex items-center gap-2 text-xs">
          <CheckCircle2
            className={`h-3.5 w-3.5 ${c.ok ? "text-success" : "text-muted-foreground/40"}`}
          />
          <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  );
}

function SignupPage() {
  const { setAuth, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  // If already logged in, send to the app
  React.useEffect(() => {
    if (isAuthenticated) navigate({ to: "/upload" });
  }, [isAuthenticated, navigate]);

  const mutation = useMutation({
    mutationFn: () =>
      signup({
        email: email.trim(),
        password,
        full_name: fullName.trim() || undefined,
      }),
    onSuccess: (data) => {
      toast.success("Account created!", {
        description: "Please log in with your new credentials.",
      });
      navigate({ to: "/login" });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof ApiError ? err.message : "Sign up failed. Please try again.";
      toast.error("Sign up failed", { description: msg });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Email and password are required.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match.");
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center bg-background px-4 py-6 sm:py-12">
      <div className="js-scale-in w-full max-w-md">
        {/* Logo + heading */}
        <div className="mb-6 flex flex-col items-center gap-2.5 text-center sm:mb-8 sm:gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-agentic shadow-lg sm:h-14 sm:w-14">
            <Bot className="h-6 w-6 text-white sm:h-7 sm:w-7" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Create your account
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Start your AI-powered career search in seconds.
            </p>
          </div>
        </div>

        {/* Feature chips */}
        <div className="mb-5 flex flex-wrap justify-center gap-1.5 sm:mb-6 sm:gap-2">
          {[
            "ATS Resume Analysis",
            "Autonomous Job Search",
            "Smart Matching",
          ].map((f) => (
            <span
              key={f}
              className="rounded-full border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:px-3 sm:py-1 sm:text-xs"
            >
              {f}
            </span>
          ))}
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="signup-name">
                Full name{" "}
                <span className="text-muted-foreground">(optional)</span>
              </Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-9"
                  disabled={mutation.isPending}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email address</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-email"
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
              <Label htmlFor="signup-password">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Min. 8 characters"
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
              <PasswordStrength password={password} />
            </div>

            {/* Confirm password */}
            <div className="space-y-2">
              <Label htmlFor="signup-confirm">Confirm password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="signup-confirm"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Repeat password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className={`pl-9 pr-10 ${
                    confirm && confirm !== password
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  disabled={mutation.isPending}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirm && confirm !== password && (
                <p className="text-xs text-destructive">Passwords do not match.</p>
              )}
            </div>

            {/* API error */}
            {mutation.isError && (
              <div className="js-fade-in rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {mutation.error instanceof ApiError
                  ? mutation.error.message
                  : "Sign up failed. Please try again."}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="js-hover-lift w-full"
              disabled={mutation.isPending || (!!confirm && confirm !== password)}
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                "Create free account"
              )}
            </Button>
          </form>
        </div>

        {/* Log in link */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
