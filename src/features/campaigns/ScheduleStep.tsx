import { useEffect, useRef, useState } from "react";
import { Check, X, AlertTriangle, ChevronRight } from "lucide-react";
import { flowApi, flowError } from "./flowApi";
import type { CampaignFlow, Checks, FlowPost, PostPatch } from "./flowApi";

const PLATFORM_LABEL: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
    youtube: "YouTube", twitter: "X", x: "X", whatsapp: "WhatsApp",
};

const todayIST = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

interface Props {
    flow: CampaignFlow;
    onChange: (f: CampaignFlow) => void;
    onPublished: (f: CampaignFlow) => void;
}

export function ScheduleStep({ flow, onChange, onPublished }: Props) {
    const [mode, setMode] = useState<"best" | "pick">("best");
    const [checks, setChecks] = useState<Checks | null>(null);
    const [checking, setChecking] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const flowRef = useRef(flow);
    flowRef.current = flow;

    const approved = flow.posts.filter((p) => p.approved);

    // Re-run the checks whenever a slot changes
    const slotKey = approved.map((p) => `${p.id}:${p.date}:${p.time}`).join("|");
    useEffect(() => {
        let alive = true;
        setChecking(true);
        const t = setTimeout(() => {
            flowApi
                .checks(flow.id)
                .then((c) => alive && setChecks(c))
                .catch((err) => alive && setError(flowError(err, "Couldn't run the checks")))
                .finally(() => alive && setChecking(false));
        }, 400);
        return () => {
            alive = false;
            clearTimeout(t);
        };
    }, [flow.id, slotKey]);

    async function patch(postId: string, body: PostPatch) {
        setError(null);
        try {
            const updated = await flowApi.updatePost(flow.id, postId, body);
            const f = flowRef.current;
            const next = { ...f, posts: f.posts.map((p) => (p.id === updated.id ? updated : p)) };
            flowRef.current = next;
            onChange(next);
        } catch (err) {
            setError(flowError(err, "Couldn't save that slot"));
        }
    }

    async function toggleAutoPublish(value: boolean) {
        onChange({ ...flow, autoPublish: value });
        try {
            await flowApi.saveBrief(flow.id, { autoPublish: value });
        } catch (err) {
            onChange({ ...flow, autoPublish: !value });
            setError(flowError(err, "Couldn't save that setting"));
        }
    }

    async function publish() {
        setPublishing(true);
        setError(null);
        try {
            onPublished(await flowApi.publish(flow.id));
        } catch (err) {
            setError(flowError(err, "Couldn't publish the campaign"));
            flowApi.checks(flow.id).then(setChecks).catch(() => undefined);
        } finally {
            setPublishing(false);
        }
    }

    const canPublish = !!checks?.canPublish && !checking && !publishing && approved.length > 0;
    const blocking = checks?.items.find((i) => !i.ok && i.key !== "clashes");

    const renderSlot = (p: FlowPost) => (
        <div key={p.id} className="flex flex-wrap items-center gap-5 border border-neutral-200 p-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden border border-neutral-200 bg-neutral-100">
                {p.visualUrl ? (
                    <img src={p.visualUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                    <span className="font-serif text-xs uppercase text-neutral-600">{p.format ?? "post"}</span>
                )}
            </div>

            <div className="min-w-[160px] flex-1">
                <p className="font-serif text-xl leading-snug text-black">{p.title || "Untitled post"}</p>
                <p className="mt-1 font-serif text-neutral-600">
                    {p.channels.map((c) => PLATFORM_LABEL[c] ?? c).join(" · ")}
                </p>
            </div>

            <div className="flex flex-wrap gap-3">
                <input
                    type="date"
                    value={p.date ?? ""}
                    min={todayIST()}
                    disabled={mode === "best"}
                    onChange={(e) => e.target.value && patch(p.id, { date: e.target.value })}
                    className="border border-neutral-300 bg-white px-4 py-3 font-serif text-black focus:border-black focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-600"
                />
                <input
                    type="time"
                    value={p.time ?? ""}
                    disabled={mode === "best"}
                    onChange={(e) => e.target.value && patch(p.id, { time: e.target.value })}
                    className="border border-neutral-300 bg-white px-4 py-3 font-serif text-black focus:border-black focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-600"
                />
            </div>
        </div>
    );

    return (
        <>
            <h1 className="font-serif text-5xl text-black">Put it on the calendar.</h1>
            <p className="mb-8 mt-4 max-w-3xl font-serif text-lg leading-relaxed text-neutral-600">
                Best-time slots are filled in for each post. Switch to picking each slot to adjust any date or time,
                then check the list on the right.
            </p>

            {error && (
                <p role="alert" className="mb-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                    {error}
                </p>
            )}

            <div className="grid gap-8 lg:grid-cols-2">
                {/* Slots */}
                <section className="border border-neutral-200 bg-white p-6 lg:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                        <h2 className="font-serif text-3xl text-black">Slots</h2>
                        <div className="flex gap-3">
                            {(["best", "pick"] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    onClick={() => setMode(m)}
                                    aria-pressed={mode === m}
                                    className={`border px-5 py-2.5 font-serif ${mode === m
                                            ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                            : "border-neutral-300 text-neutral-700 hover:border-black"
                                        }`}
                                >
                                    {m === "best" ? "Best time" : "Pick each slot"}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-6 space-y-4">
                        {approved.length === 0 ? (
                            <p className="font-serif text-neutral-600">
                                No approved posts yet. Go back to review and approve at least one.
                            </p>
                        ) : (
                            approved.map(renderSlot)
                        )}
                    </div>
                </section>

                {/* Checks */}
                <aside className="h-fit border border-neutral-200 bg-white p-6 lg:p-8">
                    <h2 className="border-b border-neutral-200 pb-5 font-serif text-3xl text-black">Before you publish</h2>

                    <ul className={`mt-6 space-y-6 transition-opacity ${checking ? "opacity-60" : ""}`}>
                        {!checks && <li className="font-serif text-neutral-500">Running the checks…</li>}
                        {checks?.items.map((c) => {
                            const warn = !c.ok && c.key === "clashes";
                            const Icon = c.ok ? Check : warn ? AlertTriangle : X;
                            return (
                                <li key={c.key} className="flex gap-4">
                                    <Icon
                                        className={`mt-1 h-5 w-5 shrink-0 ${c.ok ? "text-[#C8102E]" : warn ? "text-amber-600" : "text-[#C8102E]"
                                            }`}
                                    />
                                    <div>
                                        <p className={`font-serif text-xl ${c.ok ? "text-black" : "text-[#C8102E]"}`}>
                                            {c.label}
                                        </p>
                                        <p className="mt-1 font-serif text-neutral-600">{c.detail}</p>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>

                    <label className="mt-8 flex cursor-pointer gap-4 border-t border-neutral-200 pt-6">
                        <input
                            type="checkbox"
                            checked={flow.autoPublish}
                            onChange={(e) => toggleAutoPublish(e.target.checked)}
                            className="mt-1.5 h-5 w-5 shrink-0 accent-[#C8102E]"
                        />
                        <span className="font-serif text-lg leading-relaxed text-neutral-700">
                            Publish automatically at each slot. Leave off and Postkaro will remind you to publish by hand.
                        </span>
                    </label>
                </aside>
            </div>

            {/* Footer */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <p className="font-serif text-lg text-neutral-600">
                    {checking || !checks
                        ? "Running the checks…"
                        : blocking
                            ? `Fix this first: ${blocking.label}.`
                            : "All checks passed."}
                </p>
                <button
                    type="button"
                    onClick={publish}
                    disabled={!canPublish}
                    className="flex items-center gap-2 border border-[#C8102E] bg-white px-8 py-3.5 font-serif text-xl text-[#C8102E] hover:bg-[#C8102E]/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {publishing ? "Publishing…" : "Publish campaign"}
                    {!publishing && <ChevronRight className="h-5 w-5" />}
                </button>
            </div>
        </>
    );
}