import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { BriefForm, estimatePosts } from "./BriefForm";
import { campaignsApi } from "./api";
import type { CampaignBrief } from "./types";
import { flowApi, flowError } from "./flowApi";
import type { BriefPatch, CampaignFlow, Step } from "./flowApi";
import { useAutosave, saveLabel } from "./useAutosave";
import { ReviewStep } from "./ReviewStep";
import { ScheduleStep } from "./ScheduleStep";
import { PublishStep } from "./PublishStep";
import { refreshSidebarCounts } from "@/features/Calendar/useSidebarCounts";

const STEPS: { n: Step; label: string }[] = [
    { n: 1, label: "Create" },
    { n: 2, label: "Review" },
    { n: 3, label: "Schedule" },
    { n: 4, label: "Publish" },
];

const BRIEF_KEYS: (keyof CampaignBrief)[] = [
    "name", "brief", "offer", "goal", "cadence", "tone",
    "visuals", "look", "channels", "startsOn", "endsOn",
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Saved values as-is (nulls become empty)
function rawBrief(f: CampaignFlow): CampaignBrief {
    return {
        name: f.name === "Untitled campaign" ? "" : f.name,
        brief: f.brief ?? "",
        offer: f.offer ?? "",
        goal: f.goal ?? "",
        cadence: f.cadence ?? "",
        tone: f.tone ?? "",
        visuals: f.visuals ?? "",
        look: f.look ?? "",
        channels: f.channels,
        startsOn: f.startsOn ?? "",
        endsOn: f.endsOn ?? "",
    };
}

// Saved values with sensible defaults for a fresh draft
function withDefaults(b: CampaignBrief): CampaignBrief {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 20);
    return {
        ...b,
        goal: b.goal || "sales",
        cadence: b.cadence || "steady",
        tone: b.tone || "warm",
        visuals: b.visuals || "ai_all",
        look: b.look || "photographic",
        startsOn: b.startsOn || iso(start),
        endsOn: b.endsOn || iso(end),
    };
}

// Only the fields that changed
function diff(a: CampaignBrief, b: CampaignBrief): BriefPatch {
    const patch: Record<string, unknown> = {};
    for (const k of BRIEF_KEYS) {
        if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) patch[k] = b[k];
    }
    return patch as BriefPatch;
}

function missingFor(b: CampaignBrief): string | null {
    if (!b.name.trim()) return "Give the campaign a name";
    if (!b.brief.trim()) return "Describe what you're promoting";
    if (b.channels.length === 0) return "Pick at least one channel";
    if (estimatePosts(b) === 0) return "Pick dates that haven't passed yet";
    return null;
}

export default function CampaignBuilderPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();

    const [flow, setFlow] = useState<CampaignFlow | null>(null);
    const [brief, setBrief] = useState<CampaignBrief | null>(null);
    const [step, setStep] = useState<Step>(1);
    const [connected, setConnected] = useState<string[] | null>(null);
    const [busy, setBusy] = useState<null | "plan" | "exit">(null);
    const [error, setError] = useState<string | null>(null);

    const { queue, flush, state } = useAutosave<BriefPatch>((patch) => flowApi.saveBrief(id, patch));

    // ---------- load and resume at the saved step ----------

    useEffect(() => {
        let alive = true;
        Promise.all([
            flowApi.get(id),
            campaignsApi.connectedChannels().catch(() => [] as string[]),
        ])
            .then(([f, list]) => {
                if (!alive) return;
                if (f.status !== "DRAFT") {
                    navigate(`/campaigns/${f.id}`, { replace: true });
                    return;
                }
                const saved = rawBrief(f);
                const b = withDefaults(saved);
                if (b.channels.length === 0 && list.length > 0) b.channels = list; // preselect all

                const fill = diff(saved, b);
                if (Object.keys(fill).length > 0) queue(fill); // store the defaults

                setFlow(f);
                setBrief(b);
                setConnected(list);
                setStep(f.currentStep);
            })
            .catch((err) => alive && setError(flowError(err, "Couldn't open this campaign")));
        return () => {
            alive = false;
        };
    }, [id, navigate, queue]);

    const onBriefChange = useCallback(
        (next: CampaignBrief) => {
            setBrief((prev) => {
                if (prev) {
                    const patch = diff(prev, next);
                    if (Object.keys(patch).length > 0) queue(patch);
                }
                return next;
            });
        },
        [queue],
    );

    // ---------- navigation ----------

    const isDraft = flow?.status === "DRAFT";
    const maxStep: Step = flow?.currentStep ?? 1;

    // Jump to a step already reached
    const goTo = (n: Step) => {
        if (!isDraft) return;
        if (n > maxStep || n === step) return;
        setStep(n);
        setError(null);
        void flowApi.saveStep(id, n).catch(() => undefined);
        window.scrollTo({ top: 0 });
    };

    // Move forward to a new step
    const advance = async (n: Step) => {
        setError(null);
        try {
            await flowApi.saveStep(id, n);
            setFlow((f) => (f ? { ...f, currentStep: Math.max(f.currentStep, n) as Step } : f));
            setStep(n);
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(flowError(err, "Couldn't move to the next step"));
        }
    };

    // Backend already set step 4 and locked the campaign
    const onPublished = (f: CampaignFlow) => {
        setFlow(f);
        setStep(4);
        refreshSidebarCounts();
        window.dispatchEvent(new Event("pk:drafts-changed"));
        window.scrollTo({ top: 0 });
    };

    // ---------- actions ----------

    async function buildPlan() {
        if (!brief || missingFor(brief)) return;
        setBusy("plan");
        setError(null);
        try {
            await flush(); // plan must use the latest brief
            const f = await flowApi.generatePlan(id);
            setFlow(f);
            setStep(2);
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(flowError(err, "Couldn't build the plan. Try again."));
        } finally {
            setBusy(null);
        }
    }

    async function continueToReview() {
        await flush();
        goTo(2);
    }

    async function saveAndExit() {
        setBusy("exit");
        await flush();
        navigate("/campaigns");
    }

    // ---------- loading / error ----------

    if (!flow || !brief) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-neutral-100 font-serif text-neutral-600">
                {error ? (
                    <div className="text-center">
                        <p>{error}</p>
                        <button
                            onClick={() => navigate("/campaigns")}
                            className="mt-4 text-[#C8102E] underline underline-offset-4"
                        >
                            Back to campaigns
                        </button>
                    </div>
                ) : (
                    "Opening campaign…"
                )}
            </div>
        );
    }

    const current = STEPS[step - 1] ?? STEPS[0]!;
    const previous = isDraft ? STEPS[step - 2] : undefined;
    const missing = missingFor(brief);
    const hasPlan = flow.posts.length > 0;

    // ---------- layout ----------

    return (
        <div className="min-h-screen bg-neutral-100">
            {/* Header */}
            <header className="sticky top-0 z-20 flex items-center justify-between gap-4 bg-neutral-900 px-6 py-4 lg:px-12">
                <div className="min-w-0 border-l border-neutral-700 pl-4">
                    <p className="truncate font-serif text-xl text-white">{brief.name.trim() || "Untitled campaign"}</p>
                    <p className="font-serif text-sm text-neutral-400">
                        Step {step} of 4 — {current.label}
                    </p>
                </div>
                <div className="flex items-center gap-5">
                    {isDraft && <span className="hidden text-sm text-neutral-400 sm:inline">{saveLabel(state)}</span>}
                    <button
                        type="button"
                        onClick={saveAndExit}
                        disabled={busy !== null}
                        className="font-serif text-white/90 hover:text-white disabled:opacity-40"
                    >
                        {isDraft ? "Save and exit" : "Done"}
                    </button>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-6 py-8 lg:px-12">
                {/* Back + step pills */}
                <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={() => (previous ? goTo(previous.n) : void saveAndExit())}
                        disabled={busy !== null}
                        className="flex items-center gap-2 border border-neutral-300 bg-white px-5 py-2.5 font-serif text-black hover:border-black disabled:opacity-40"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        {previous
                            ? `Back to ${previous.label === "Create" ? "brief" : previous.label.toLowerCase()}`
                            : "All campaigns"}
                    </button>

                    <ol className="flex flex-wrap gap-3">
                        {STEPS.map((s) => {
                            const isCurrent = s.n === step;
                            const reachable = isDraft ? s.n <= maxStep : s.n === 4;
                            return (
                                <li key={s.n}>
                                    <button
                                        type="button"
                                        onClick={() => goTo(s.n)}
                                        disabled={!reachable || !isDraft || busy !== null}
                                        aria-current={isCurrent ? "step" : undefined}
                                        className={`border px-5 py-2.5 font-serif ${isCurrent
                                                ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                                : s.n < step || (isDraft && reachable)
                                                    ? "border-[#C8102E] bg-white text-black hover:bg-[#C8102E]/5"
                                                    : "cursor-default border-neutral-300 text-neutral-500"
                                            }`}
                                    >
                                        {s.n}&nbsp; {s.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                </div>

                {error && (
                    <p role="alert" className="mb-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                        {error}
                    </p>
                )}

                {/* Step 1 — Create */}
                {step === 1 && (
                    <>
                        <h1 className="font-serif text-5xl text-black">Set the brief.</h1>
                        <p className="mb-8 mt-4 max-w-3xl font-serif text-lg leading-relaxed text-neutral-600">
                            Tell Postkaro what this campaign is for. The studio drafts the posts from here, and you
                            approve each one on the next step.
                        </p>

                        <BriefForm value={brief} onChange={onBriefChange} connected={connected} />

                        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                            <p className="font-serif text-neutral-600">
                                {missing
                                    ? `${missing} to build the plan.`
                                    : hasPlan
                                        ? "Rebuilding replaces the current plan."
                                        : ""}
                            </p>
                            <div className="flex flex-wrap gap-3">
                                {hasPlan && (
                                    <button
                                        type="button"
                                        onClick={continueToReview}
                                        disabled={busy !== null}
                                        className="border border-neutral-300 bg-white px-6 py-3 font-serif text-black hover:border-black disabled:opacity-40"
                                    >
                                        Continue to review
                                    </button>
                                )}
                                <button
                                    type="button"
                                    onClick={buildPlan}
                                    disabled={!!missing || busy !== null}
                                    className="flex items-center gap-2 border border-[#C8102E] bg-white px-6 py-3 font-serif text-lg text-[#C8102E] hover:bg-[#C8102E]/5 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    {busy === "plan"
                                        ? "Building the plan…"
                                        : hasPlan
                                            ? "Rebuild the plan"
                                            : "Build the plan ›"}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Step 2 — Review */}
                {step === 2 && (
                    <ReviewStep
                        flow={flow}
                        brief={brief}
                        onChange={setFlow}
                        onNext={() => advance(3)}
                    />
                )}

                {/* Step 3 — Schedule */}
                {step === 3 && (
                    <ScheduleStep flow={flow} onChange={setFlow} onPublished={onPublished} />
                )}

                {/* Step 4 — Publish */}
                {step === 4 && <PublishStep flow={flow} />}
            </main>
        </div>
    );
}