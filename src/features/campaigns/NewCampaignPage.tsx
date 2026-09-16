import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BriefForm, estimatePosts } from "./BriefForm";
import { PlanReview } from "./PlanReview";
import { campaignsApi, errorMessage } from "./api";
import type { CampaignBrief, PlanItem } from "./types";

const iso = (d: Date) => d.toISOString().slice(0, 10);
function defaultBrief(): CampaignBrief {
    const start = new Date();
    start.setDate(start.getDate() + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 20);
    return {
        name: "", brief: "", offer: "",
        goal: "sales", cadence: "steady", tone: "warm",
        visuals: "ai_all", look: "photographic",
        channels: [], startsOn: iso(start), endsOn: iso(end),
    };
}

const STEPS = ["Brief", "Review plan"] as const;

type VisualState = "loading" | "done" | "failed";

const LOOK_PROMPT: Record<string, string> = {
    photographic: "realistic photograph, natural light",
    warm_grainy: "warm film photograph, soft grain",
    editorial: "clean editorial magazine photograph",
    illustrated: "flat illustration, simple shapes",
};

const makesImages = (b: CampaignBrief) => b.visuals === "ai_all" || b.visuals === "ai_images";

function visualPrompt(item: PlanItem, b: CampaignBrief) {
    return `${item.title}. ${item.hook} Context: ${b.brief} Style: ${LOOK_PROMPT[b.look] ?? "realistic photograph"
        }. No text or lettering in the image.`;
}

export default function NewCampaignPage() {
    const navigate = useNavigate();
    const [step, setStep] = useState<0 | 1>(0);
    const [brief, setBrief] = useState<CampaignBrief>(defaultBrief);
    const [connected, setConnected] = useState<string[] | null>(null);
    const [plan, setPlan] = useState<PlanItem[] | null>(null);
    const [approved, setApproved] = useState<Set<number>>(new Set());
    const [busy, setBusy] = useState<null | "plan" | "save">(null);
    const [error, setError] = useState<string | null>(null);
    const [visualState, setVisualState] = useState<Record<number, VisualState>>({});
    const runRef = useRef(0); // ignores images from an older plan after Regenerate

    useEffect(() => {
        campaignsApi
            .connectedChannels()
            .then((list) => {
                setConnected(list);
                setBrief((b) => (b.channels.length ? b : { ...b, channels: list })); // preselect all
            })
            .catch(() => setConnected([]));
    }, []);

    // What still stops "Build the plan"
    const missing = !brief.name.trim()
        ? "Give the campaign a name"
        : !brief.brief.trim()
            ? "Describe what you're promoting"
            : brief.channels.length === 0
                ? "Pick at least one channel"
                : estimatePosts(brief) === 0
                    ? "Pick dates that haven't passed yet"
                    : null;

    async function buildPlan() {
        if (missing) return;
        setBusy("plan");
        setError(null);
        try {
            const items = await campaignsApi.plan(brief);
            setPlan(items);
            setApproved(new Set()); // a new plan starts unapproved
            setStep(1);
            void makeVisuals(items, brief);
            window.scrollTo({ top: 0 });
        } catch (err) {
            setError(errorMessage(err, "Couldn't build the plan. Try again."));
        } finally {
            setBusy(null);
        }
    }

    function toggle(index: number) {
        setApproved((prev) => {
            const next = new Set(prev);
            if (next.has(index)) next.delete(index);
            else next.add(index);
            return next;
        });
    }

    function approveAll() {
        if (!plan) return;
        const needsImage = makesImages(brief);
        setApproved(new Set(
            plan.filter((p) => p.title.trim() && (!needsImage || p.mediaUrl)).map((p) => p.index),
        ));
    }

    function editItem(item: PlanItem) {
        setPlan((prev) => prev?.map((p) => (p.index === item.index ? item : p)) ?? prev);
    }
    async function makeOne(item: PlanItem, b: CampaignBrief, run: number) {
        setVisualState((s) => ({ ...s, [item.index]: "loading" }));
        try {
            const url = await campaignsApi.generateImage(visualPrompt(item, b));
            if (run !== runRef.current) return;
            setPlan((prev) =>
                prev?.map((p) => (p.index === item.index ? { ...p, mediaUrl: url, mediaType: "image" } : p)) ?? prev,
            );
            setVisualState((s) => ({ ...s, [item.index]: "done" }));
        } catch {
            if (run === runRef.current) setVisualState((s) => ({ ...s, [item.index]: "failed" }));
        }
    }

    async function makeVisuals(items: PlanItem[], b: CampaignBrief) {
        const run = ++runRef.current;
        if (!makesImages(b)) {
            setVisualState({});
            return;
        }
        setVisualState(Object.fromEntries(items.map((i) => [i.index, "loading" as VisualState])));
        const queue = [...items];
        const worker = async () => {
            while (queue.length && run === runRef.current) {
                await makeOne(queue.shift()!, b, run);
            }
        };
        await Promise.all([worker(), worker(), worker()]); // three at a time
    }

    async function createDrafts() {
        if (!plan || approved.size === 0) return;
        setBusy("save");
        setError(null);
        try {
            const items = plan.filter((p) => approved.has(p.index));
            const created = await campaignsApi.create(brief, items);
            window.dispatchEvent(new Event("pk:drafts-changed"));
            navigate(`/campaigns/${created.id}`);
        } catch (err) {
            setError(errorMessage(err, "Couldn't save the campaign. Try again."));
            setBusy(null);
        }
    }

    function backToBrief() {
        setStep(0);
        setError(null);
        window.scrollTo({ top: 0 });
    }

    const n = approved.size;

    const pending = Object.values(visualState).filter((s) => s === "loading").length;
    const totalVisuals = Object.keys(visualState).length;

    return (
        <div className="min-h-screen bg-neutral-100">
            <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 bg-neutral-900 px-6 py-5 lg:px-12">
                <div>
                    <p className="font-serif text-2xl text-white">New campaign</p>
                    <p className="font-serif text-sm text-neutral-400">
                        Step {step + 1} of 2: {STEPS[step]}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/campaigns")}
                        disabled={busy === "save"}
                        className="px-3 py-2 font-serif text-white/80 hover:text-white disabled:opacity-40"
                    >
                        Cancel
                    </button>

                    {step === 0 && (
                        <button
                            type="button"
                            onClick={buildPlan}
                            disabled={!!missing || busy !== null}
                            title={missing ?? undefined}
                            className="border border-[#C8102E] px-5 py-2.5 font-serif text-white hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                            {busy === "plan" ? "Building the plan…" : "Build the plan"}
                        </button>
                    )}

                    {step === 1 && (
                        <>
                            <button
                                type="button"
                                onClick={backToBrief}
                                disabled={busy !== null}
                                className="border border-neutral-600 px-5 py-2.5 font-serif text-white hover:border-white disabled:opacity-40"
                            >
                                Back to brief
                            </button>
                            <button
                                type="button"
                                onClick={createDrafts}
                                disabled={n === 0 || busy !== null || pending > 0}
                                title={n === 0 ? "Approve at least one post" : undefined}
                                className="border border-[#C8102E] px-5 py-2.5 font-serif text-white hover:bg-[#C8102E] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                                {busy === "save"
                                    ? "Creating drafts…"
                                    : pending > 0
                                        ? `Making visuals… ${totalVisuals - pending} of ${totalVisuals}`
                                        : n === 0
                                            ? "Create drafts"
                                            : `Create ${n} ${n === 1 ? "draft" : "drafts"}`}
                            </button>
                        </>
                    )}
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-6 py-8 lg:px-12">
                <ol className="mb-8 flex flex-wrap gap-3">
                    {STEPS.map((label, i) => (
                        <li
                            key={label}
                            aria-current={i === step ? "step" : undefined}
                            className={`border px-5 py-2.5 font-serif ${i === step ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]" : "border-neutral-300 text-neutral-600"
                                }`}
                        >
                            {i + 1} {label}
                        </li>
                    ))}
                </ol>

                {error && (
                    <p role="alert" className="mb-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                        {error}
                    </p>
                )}

                {step === 0 && (
                    <>
                        <BriefForm value={brief} onChange={setBrief} connected={connected} />
                        {missing && <p className="mt-6 text-sm text-neutral-600">{missing} to build the plan.</p>}
                    </>
                )}

                {step === 1 && plan && (
                    <>
                        <PlanReview
                            brief={brief}
                            plan={plan}
                            approved={approved}
                            onToggle={toggle}
                            onApproveAll={approveAll}
                            onEdit={editItem}
                            onRegenerate={buildPlan}
                            regenerating={busy === "plan"}
                            showVisuals={makesImages(brief)}
                            visualState={visualState}
                            onNewVisual={(item) => makeOne(item, brief, runRef.current)}
                        />
                        <p className="mt-6 text-sm text-neutral-600">
                            Approved posts become drafts in this campaign. Nothing is published until you add a visual and
                            schedule each one.
                        </p>
                    </>
                )}
            </main>
        </div>
    );
}