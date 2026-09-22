import { useEffect, useState } from "react";
import { Check, Clock, Coins, Loader2 } from "lucide-react";

import { useBillingStore } from "@/stores/billing.store";
import { toast } from "@/{api,components/{ui,guards},config,features/Toast";
import {
    fetchMyRequests,
    fetchTransactions,
    requestPlan,
    requestTopup,
    type CreditEntry,
    type UpgradeRequestView,
} from "./api";

const TOPUP_OPTIONS = [
    { credits: 200, label: "200 credits" },
    { credits: 500, label: "500 credits" },
    { credits: 2000, label: "2,000 credits" },
];

export function BillingPage() {
    const status = useBillingStore((s) => s.status);
    const refresh = useBillingStore((s) => s.refresh);

    const [requests, setRequests] = useState<UpgradeRequestView[]>([]);
    const [history, setHistory] = useState<CreditEntry[]>([]);
    const [sending, setSending] = useState<string | null>(null);

    useEffect(() => {
        void refresh();
        void fetchMyRequests().then(setRequests).catch(() => { });
        void fetchTransactions(0, 20).then(setHistory).catch(() => { });
    }, [refresh]);

    const pending = requests.find((r) => r.status === "PENDING");

    async function askForPlan(plan: string) {
        setSending(plan);
        try {
            const req = await requestPlan(plan);
            setRequests((prev) => [req, ...prev]);
            toast.success("Request sent. We'll activate it shortly and reach out.");
        } catch {
            toast.error("Couldn't send the request. Please try again.");
        } finally {
            setSending(null);
        }
    }

    async function askForTopup(credits: number) {
        setSending(`topup-${credits}`);
        try {
            const req = await requestTopup(credits);
            setRequests((prev) => [req, ...prev]);
            toast.success("Request sent. We'll add the credits shortly.");
        } catch {
            toast.error("Couldn't send the request. Please try again.");
        } finally {
            setSending(null);
        }
    }

    if (!status) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
            </div>
        );
    }

    const trial = status.status === "TRIALING";

    return (
        <div className="mx-auto max-w-5xl px-5 py-8">
            {/* Current state */}
            <header className="mb-8">
                <h1 className="font-serif text-3xl text-neutral-900">Plan & credits</h1>
                <p className="mt-1 text-sm text-neutral-500">
                    {trial
                        ? status.daysLeft > 0
                            ? `You're on the free trial — ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left.`
                            : "Your trial ends today."
                        : status.active
                            ? `You're on the ${status.plan.charAt(0) + status.plan.slice(1).toLowerCase()} plan.`
                            : "Your plan has ended. Creating and publishing are paused."}
                </p>
            </header>

            <section className="mb-10 grid gap-4 sm:grid-cols-3">
                <Stat label="Credits left" value={String(status.totalCredits)} accent={status.totalCredits <= 20} />
                <Stat label="Used this period" value={String(status.usedThisPeriod)} />
                <Stat label="Accounts allowed" value={String(status.accountLimit)} />
            </section>

            {pending && (
                <div className="mb-8 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
                    <Clock className="h-4 w-4 shrink-0 text-neutral-500" />
                    <p className="text-sm text-neutral-700">
                        We've got your request for{" "}
                        <strong>
                            {pending.kind === "PLAN"
                                ? `the ${pending.plan} plan`
                                : `${pending.credits} credits`}
                        </strong>
                        . We'll activate it shortly and get in touch.
                    </p>
                </div>
            )}

            {/* Plans */}
            <h2 className="mb-4 font-serif text-xl text-neutral-900">Plans</h2>
            <div className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {status.plans.map((p) => {
                    const current = status.plan === p.code && status.active;
                    return (
                        <div
                            key={p.code}
                            className={`flex flex-col rounded-xl border p-5 ${current ? "border-[#C8102E]" : "border-neutral-200"
                                }`}
                        >
                            <p className="text-xs uppercase tracking-wide text-neutral-500">
                                {p.code.charAt(0) + p.code.slice(1).toLowerCase()}
                            </p>
                            <p className="mt-2 font-serif text-2xl text-neutral-900">
                                ₹{p.priceInr.toLocaleString("en-IN")}
                                <span className="text-sm text-neutral-500">/mo</span>
                            </p>

                            <ul className="mt-4 flex-1 space-y-2 text-sm text-neutral-600">
                                <li className="flex gap-2">
                                    <Check className="h-4 w-4 shrink-0 text-[#C8102E]" />
                                    {p.monthlyCredits.toLocaleString("en-IN")} credits a month
                                </li>
                                <li className="flex gap-2">
                                    <Check className="h-4 w-4 shrink-0 text-[#C8102E]" />
                                    {p.accountLimit} connected account{p.accountLimit === 1 ? "" : "s"}
                                </li>
                            </ul>

                            {current ? (
                                <p className="mt-5 text-center text-sm font-medium text-[#C8102E]">Current plan</p>
                            ) : (
                                <button
                                    onClick={() => askForPlan(p.code)}
                                    disabled={sending !== null}
                                    className="mt-5 rounded-md border border-[#C8102E] px-3 py-2 text-sm font-medium text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white disabled:opacity-50"
                                >
                                    {sending === p.code ? "Sending…" : "Request this plan"}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Top-ups */}
            <h2 className="mb-2 font-serif text-xl text-neutral-900">Need more credits?</h2>
            <p className="mb-4 text-sm text-neutral-500">
                Top-up credits never expire and stay with you when your plan renews.
            </p>
            <div className="mb-12 flex flex-wrap gap-3">
                {TOPUP_OPTIONS.map((t) => (
                    <button
                        key={t.credits}
                        onClick={() => askForTopup(t.credits)}
                        disabled={sending !== null}
                        className="flex items-center gap-2 rounded-md border border-neutral-300 px-4 py-2 text-sm text-neutral-700 transition hover:border-neutral-900 disabled:opacity-50"
                    >
                        <Coins className="h-4 w-4" />
                        {sending === `topup-${t.credits}` ? "Sending…" : t.label}
                    </button>
                ))}
            </div>

            {/* What things cost */}
            <h2 className="mb-4 font-serif text-xl text-neutral-900">What each action costs</h2>
            <div className="mb-12 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                {Object.entries(status.costs).map(([action, cost]) => (
                    <div key={action} className="flex justify-between border-b border-neutral-100 py-2 text-sm">
                        <span className="text-neutral-600">{prettyAction(action)}</span>
                        <span className="text-neutral-900">{cost}</span>
                    </div>
                ))}
            </div>

            {/* History */}
            <h2 className="mb-4 font-serif text-xl text-neutral-900">Recent activity</h2>
            {history.length === 0 ? (
                <p className="text-sm text-neutral-500">Nothing yet.</p>
            ) : (
                <div className="overflow-hidden rounded-lg border border-neutral-200">
                    {history.map((h) => (
                        <div
                            key={h.id}
                            className="flex items-center justify-between border-b border-neutral-100 px-4 py-3 text-sm last:border-0"
                        >
                            <div className="min-w-0">
                                <p className="truncate text-neutral-800">{h.note || h.label}</p>
                                <p className="text-xs text-neutral-400">
                                    {new Date(h.createdAt).toLocaleString("en-IN")}
                                </p>
                            </div>
                            <span className={h.amount < 0 ? "text-neutral-600" : "text-[#C8102E]"}>
                                {h.amount > 0 ? `+${h.amount}` : h.amount}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
    return (
        <div className="rounded-xl border border-neutral-200 p-5">
            <p className="text-xs uppercase tracking-wide text-neutral-500">{label}</p>
            <p className={`mt-1 font-serif text-3xl ${accent ? "text-[#C8102E]" : "text-neutral-900"}`}>{value}</p>
        </div>
    );
}

function prettyAction(action: string) {
    return action
        .toLowerCase()
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
}