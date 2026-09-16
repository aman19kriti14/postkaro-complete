import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { authApi } from "@/api/auth.api";
import { tokenStore } from "@/api/client";
import { useAuthStore } from "@/stores/auth.store";

export function SigninPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);

  function validateForm(): boolean {
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = "Enter a valid email";
    if (!password) errs.password = "Password is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError("");

    if (!validateForm()) return;

    setLoading(true);
    try {
      const res = await authApi.signin({
        email: email.trim().toLowerCase(),
        password,
      });

      const { user, tokens } = res.data.data;
      tokenStore.set(tokens);
      useAuthStore.setState({ user, isAuthenticated: true, isInitialized: true });

      if (!user.onboardingComplete) {
        navigate("/onboarding");
      } else {
        navigate("/dashboard");
      }
    } catch (err: any) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);

      if (!err.response) {
        setApiError("Cannot connect to server. Is the backend running?");
      } else if (err.response.status === 401) {
        setApiError("Invalid email or password.");
      } else if (err.response.status === 429) {
        setApiError("Too many attempts. Please wait a minute and try again.");
      } else {
        setApiError(err.response.data?.message || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout>
      <div className="text-center">
        <h2 className="text-2xl font-medium text-neutral-900 font-[var(--font-display)]">Welcome back</h2>
        <p className="mt-1 text-sm text-neutral-500">Sign in to your calendar and drafts.</p>
      </div>

      <div className="space-y-3">
        <button type="button" className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-[var(--radius-md)] border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.26c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
            <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
          </svg>
          Continue with Google
        </button>
        <button type="button" className="w-full flex items-center justify-center gap-2.5 h-11 px-4 rounded-[var(--radius-md)] border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
          <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="16" height="14" rx="2" />
            <path d="M2 5l8 6 8-6" />
          </svg>
          Continue with email link
        </button>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-neutral-200" />
        <span className="text-xs text-neutral-400 font-medium">OR</span>
        <div className="flex-1 h-px bg-neutral-200" />
      </div>

      {apiError && (
        <div className="p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2" role="alert">
          <svg className="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.75 4.75a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zM8 11a.75.75 0 100-1.5A.75.75 0 008 11z" />
          </svg>
          <div className="flex-1">
            <span>{apiError}</span>
            {attempts >= 3 && (
              <span className="block mt-1 text-xs text-red-600">
                Tried {attempts} times.{" "}
                <Link to="/forgot-password" className="underline font-medium">Reset your password?</Link>
              </span>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          placeholder="you@studio.in"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (apiError) setApiError("");
          }}
          error={errors.email}
        />

        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (apiError) setApiError("");
          }}
          error={errors.password}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-500 cursor-pointer"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
            />
            <span className="text-sm text-neutral-600">Keep me signed in</span>
          </label>
          <Link to="/forgot-password" className="text-sm font-medium text-primary-500 hover:text-primary-600">Forgot password?</Link>
        </div>

        <Button type="submit" fullWidth size="lg" variant="outline" isLoading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center text-sm text-neutral-500">
        New to Postkaro?{" "}
        <Link to="/signup" className="font-medium text-primary-500 hover:text-primary-600">Create a free account</Link>
        {" "}— no card needed.
      </p>
    </AuthLayout>
  );
}