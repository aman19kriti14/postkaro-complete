import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, KeyRound, Loader2 } from "lucide-react";

import { toast } from "@/{api,components/{ui,guards},config,features/Toast";
import { forgotPassword, resetPassword } from "../otp/api";


export function ForgotPasswordPage() {
    const navigate = useNavigate();

    const [step, setStep] = useState<"email" | "reset">("email");
    const [email, setEmail] = useState("");
    const [code, setCode] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(t);
    }, [cooldown]);

    async function sendCode(e?: React.FormEvent) {
        e?.preventDefault();
        if (!email.trim() || busy) return;

        setBusy(true);
        setError(null);
        try {
            await forgotPassword(email.trim());
            toast.success("If that account exists, a code is on its way.");
            setStep("reset");
            setCooldown(60);
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Couldn't send the code. Try again.");
        } finally {
            setBusy(false);
        }
    }

    async function submitReset(e: React.FormEvent) {
        e.preventDefault();
        if (busy) return;

        if (password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }

        setBusy(true);
        setError(null);
        try {
            await resetPassword(email.trim(), code.trim(), password);
            toast.success("Password updated. Sign in with your new one.");
            navigate("/signin", { replace: true });
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "Couldn't reset your password.");
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-5">
            <div className="w-full max-w-sm">
                <Link
                    to="/signin"
                    className="mb-8 inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
                >
                    <ArrowLeft className="h-4 w-4" /> Back to sign in
                </Link>

                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <KeyRound className="h-5 w-5 text-neutral-700" />
                </div>

                {step === "email" ? (
                    <>
                        <h1 className="font-serif text-2xl text-neutral-900">Forgot your password?</h1>
                        <p className="mt-2 text-sm text-neutral-500">
                            Enter your email and we'll send you a code to set a new one.
                        </p>

                        <form onSubmit={sendCode} className="mt-8 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm text-neutral-700">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                                    placeholder="you@example.com"
                                    autoFocus
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#C8102E]"
                                />
                            </div>

                            {error && <p className="text-sm text-[#C8102E]">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy || !email.trim()}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#C8102E] px-4 py-2.5 text-sm font-medium text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white disabled:opacity-50"
                            >
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Send reset code
                            </button>
                        </form>
                    </>
                ) : (
                    <>
                        <h1 className="font-serif text-2xl text-neutral-900">Set a new password</h1>
                        <p className="mt-2 text-sm text-neutral-500">
                            We sent a 6-digit code to <span className="text-neutral-900">{email}</span>
                        </p>

                        <form onSubmit={submitReset} className="mt-8 space-y-4">
                            <div>
                                <label className="mb-1.5 block text-sm text-neutral-700">Code</label>
                                <input
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(null); }}
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    placeholder="123456"
                                    autoFocus
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 font-serif text-lg tracking-[0.3em] outline-none transition focus:border-[#C8102E]"
                                />
                            </div>

                            <div>
                                <label className="mb-1.5 block text-sm text-neutral-700">New password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                                    placeholder="At least 8 characters"
                                    autoComplete="new-password"
                                    className="w-full rounded-lg border border-neutral-300 px-3 py-2.5 text-sm outline-none transition focus:border-[#C8102E]"
                                />
                            </div>

                            {error && <p className="text-sm text-[#C8102E]">{error}</p>}

                            <button
                                type="submit"
                                disabled={busy || code.length !== 6 || password.length < 8}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-[#C8102E] px-4 py-2.5 text-sm font-medium text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white disabled:opacity-50"
                            >
                                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                                Update password
                            </button>

                            <p className="text-center text-sm text-neutral-500">
                                Didn't get it?{" "}
                                {cooldown > 0 ? (
                                    <span className="text-neutral-400">Resend in {cooldown}s</span>
                                ) : (
                                    <button type="button" onClick={() => sendCode()} className="font-medium text-[#C8102E] hover:underline">
                                        Send a new code
                                    </button>
                                )}
                            </p>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}