import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail } from "lucide-react";

import { useAuthStore } from "@/stores/auth.store";
import { toast } from "@/{api,components/{ui,guards},config,features/Toast";
import { resendOtp, verifyOtp } from "../otp/api";


export function VerifyEmailPage() {
    const navigate = useNavigate();
    const user = useAuthStore((s) => s.user);
    const fetchUser = useAuthStore((s) => s.fetchUser);
    const signout = useAuthStore((s) => s.signout);

    const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cooldown, setCooldown] = useState(60);

    const inputs = useRef<Array<HTMLInputElement | null>>([]);

    useEffect(() => {
        inputs.current[0]?.focus();
    }, []);

    useEffect(() => {
        if (cooldown <= 0) return;
        const t = setInterval(() => setCooldown((c) => c - 1), 1000);
        return () => clearInterval(t);
    }, [cooldown]);

    function setDigit(index: number, value: string) {
        const clean = value.replace(/\D/g, "");
        if (!clean && value) return;

        const next = [...digits];
        next[index] = clean.slice(-1);
        setDigits(next);
        setError(null);

        if (clean && index < 5) inputs.current[index + 1]?.focus();
        if (next.every((d) => d) && next.join("").length === 6) void submit(next.join(""));
    }

    function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key === "Backspace" && !digits[index] && index > 0) {
            inputs.current[index - 1]?.focus();
        }
    }

    function onPaste(e: React.ClipboardEvent) {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
        if (pasted.length !== 6) return;
        e.preventDefault();
        setDigits(pasted.split(""));
        void submit(pasted);
    }

    async function submit(code: string) {
        if (!user?.email || submitting) return;
        setSubmitting(true);
        setError(null);
        try {
            await verifyOtp(user.email, code);
            await fetchUser();
            toast.success("Email verified.");
            navigate("/onboarding", { replace: true });
        } catch (err: any) {
            setError(err?.response?.data?.message ?? "That didn't work. Try again.");
            setDigits(Array(6).fill(""));
            inputs.current[0]?.focus();
        } finally {
            setSubmitting(false);
        }
    }

    async function resend() {
        if (!user?.email || cooldown > 0) return;
        try {
            await resendOtp(user.email);
            toast.success("New code sent.");
            setCooldown(60);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Couldn't send a new code.");
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-white px-5">
            <div className="w-full max-w-sm text-center">
                <div className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                    <Mail className="h-5 w-5 text-neutral-700" />
                </div>

                <h1 className="font-serif text-2xl text-neutral-900">Check your email</h1>
                <p className="mt-2 text-sm text-neutral-500">
                    We sent a 6-digit code to <span className="text-neutral-900">{user?.email}</span>
                </p>

                <div className="mt-8 flex justify-center gap-2" onPaste={onPaste}>
                    {digits.map((d, i) => (
                        <input
                            key={i}
                            ref={(el) => { inputs.current[i] = el; }}
                            value={d}
                            onChange={(e) => setDigit(i, e.target.value)}
                            onKeyDown={(e) => onKeyDown(i, e)}
                            inputMode="numeric"
                            autoComplete={i === 0 ? "one-time-code" : "off"}
                            maxLength={1}
                            disabled={submitting}
                            className={`h-12 w-11 rounded-lg border text-center font-serif text-xl text-neutral-900 outline-none transition focus:border-[#C8102E] disabled:opacity-50 ${error ? "border-[#C8102E]" : "border-neutral-300"
                                }`}
                        />
                    ))}
                </div>

                {submitting && (
                    <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                    </div>
                )}

                {error && <p className="mt-4 text-sm text-[#C8102E]">{error}</p>}

                <p className="mt-8 text-sm text-neutral-500">
                    Didn't get it?{" "}
                    {cooldown > 0 ? (
                        <span className="text-neutral-400">Resend in {cooldown}s</span>
                    ) : (
                        <button onClick={resend} className="font-medium text-[#C8102E] hover:underline">
                            Send a new code
                        </button>
                    )}
                </p>

                <button
                    onClick={() => signout()}
                    className="mt-10 text-xs text-neutral-400 hover:text-neutral-600"
                >
                    Use a different account
                </button>
            </div>
        </div>
    );
}