import { useRef, useState } from "react";
import { campaignsApi } from "./api";
import type { CampaignBrief } from "./types";
import { flowApi, flowError } from "./flowApi";
import type { CampaignFlow, FlowPost, PostPatch } from "./flowApi";

const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

const GOAL_LABEL: Record<string, string> = {
    awareness: "Awareness", sales: "Sales", launch: "Launch a product", followers: "Grow followers",
};
const CADENCE_LABEL: Record<string, string> = {
    light: "Light · 2 a week", steady: "Steady · 4 a week", heavy: "Heavy · daily",
};
const TONE_LABEL: Record<string, string> = {
    warm: "Warm", playful: "Playful", informative: "Informative", festive: "Festive",
};
const VISUALS_LABEL: Record<string, string> = {
    ai_all: "AI images and video", ai_images: "AI images only", my_photos: "Use my photos", text_only: "Text only",
};
const PLATFORM_LABEL: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
    youtube: "YouTube", twitter: "X", x: "X", whatsapp: "WhatsApp",
};
const LOOK_PROMPT: Record<string, string> = {
    photographic: "realistic photograph, natural light",
    warm_grainy: "warm film photograph, soft grain",
    editorial: "clean editorial magazine photograph",
    illustrated: "flat illustration, simple shapes",
};

const monthName = (m: string) => MONTHS[Number(m) - 1] ?? "";

const slotLabel = (p: FlowPost) =>
    p.date ? `${p.date.slice(8, 10)} ${monthName(p.date.slice(5, 7)).slice(0, 3)} · ${p.time ?? ""}` : "No slot yet";

const windowLabel = (a: string, b: string) =>
    a.slice(0, 7) === b.slice(0, 7)
        ? `${Number(a.slice(8, 10))}–${Number(b.slice(8, 10))} ${monthName(b.slice(5, 7))} ${b.slice(0, 4)}`
        : `${Number(a.slice(8, 10))} ${monthName(a.slice(5, 7))} – ${Number(b.slice(8, 10))} ${monthName(b.slice(5, 7))} ${b.slice(0, 4)}`;

const channelList = (list: string[]) => list.map((c) => PLATFORM_LABEL[c] ?? c).join(" · ");

const numberWord = (n: number) =>
    ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"][n] ?? String(n);

type VisualState = "loading" | "failed";

interface Props {
    flow: CampaignFlow;
    brief: CampaignBrief;
    onChange: (f: CampaignFlow) => void;
    onNext: () => void;
}

export function ReviewStep({ flow, brief, onChange, onNext }: Props) {
    const [visual, setVisual] = useState<Record<string, VisualState>>({});
    const [editing, setEditing] = useState<string | null>(null);
    const [draft, setDraft] = useState({ title: "", caption: "" });
    const [busy, setBusy] = useState<null | "all" | "next">(null);
    const [error, setError] = useState<string | null>(null);

    // Always the latest flow, so parallel visual saves don't overwrite each other
    const flowRef = useRef(flow);
    flowRef.current = flow;

    const posts = flow.posts;
    const makesVisuals = brief.visuals !== "text_only";
    const approvedCount = posts.filter((p) => p.approved).length;
    const readyCount = posts.filter((p) => p.visualUrl).length;
    const generating = Object.values(visual).filter((s) => s === "loading").length;

    const replacePost = (updated: FlowPost) => {
        const f = flowRef.current;
        const next = { ...f, posts: f.posts.map((p) => (p.id === updated.id ? updated : p)) };
        flowRef.current = next;
        onChange(next);
    };

    async function patch(postId: string, body: PostPatch): Promise<boolean> {
        setError(null);
        try {
            replacePost(await flowApi.updatePost(flow.id, postId, body));
            return true;
        } catch (err) {
            setError(flowError(err, "Couldn't save that change"));
            return false;
        }
    }

    async function approveAll() {
        setBusy("all");
        setError(null);
        try {
            onChange(await flowApi.approveAll(flow.id));
        } catch (err) {
            setError(flowError(err, "Couldn't approve the posts"));
        } finally {
            setBusy(null);
        }
    }

    // ---------- visuals ----------

    const promptFor = (p: FlowPost) =>
        `${p.title ?? ""}. ${p.caption ?? ""} Context: ${brief.brief} Style: ${LOOK_PROMPT[brief.look] ?? "realistic photograph"
        }. No text or lettering in the image.`;

    async function generateVisual(p: FlowPost) {
        setVisual((s) => ({ ...s, [p.id]: "loading" }));
        let ok = false;
        try {
            const url = await campaignsApi.generateImage(promptFor(p));
            ok = await patch(p.id, { visualUrl: url });
        } catch {
            ok = false;
        }
        setVisual((s) => {
            const next = { ...s };
            if (ok) delete next[p.id];
            else next[p.id] = "failed";
            return next;
        });
    }

    async function generateAll() {
        const queue = posts.filter((p) => !p.visualUrl && visual[p.id] !== "loading");
        const worker = async () => {
            while (queue.length) {
                const next = queue.shift();
                if (next) await generateVisual(next);
            }
        };
        await Promise.all([worker(), worker(), worker()]); // three at a time
    }

    // ---------- editing ----------

    function startEdit(p: FlowPost) {
        setEditing(p.id);
        setDraft({ title: p.title ?? "", caption: p.caption ?? "" });
    }

    async function saveEdit(p: FlowPost) {
        const ok = await patch(p.id, { title: draft.title.trim(), caption: draft.caption.trim() });
        if (ok) setEditing(null);
    }

    async function next() {
        setBusy("next");
        try {
            await onNext();
        } finally {
            setBusy(null);
        }
    }

    const canSchedule = approvedCount > 0 && generating === 0 && busy === null;

    // ---------- render ----------

    return (
        <>
            <h1 className="font-serif text-5xl text-black">Review the plan.</h1>
            <p className="mb-8 mt-4 max-w-3xl font-serif text-lg leading-relaxed text-neutral-600">
                {numberWord(posts.length)} {posts.length === 1 ? "draft" : "drafts"} across your window. Approve what
                works, edit what does not{makesVisuals ? ", and generate the visuals before scheduling" : ""}.
            </p>

            {error && (
                <p role="alert" className="mb-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                    {error}
                </p>
            )}

            <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
                {/* The plan */}
                <section className="border border-neutral-200 bg-white p-6 lg:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-5">
                        <h2 className="font-serif text-3xl text-black">The plan</h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="font-serif text-neutral-600">
                                {approvedCount} of {posts.length} approved
                            </span>
                            {makesVisuals && (
                                <button
                                    type="button"
                                    onClick={generateAll}
                                    disabled={generating > 0 || readyCount === posts.length}
                                    className="border border-neutral-300 px-4 py-2 font-serif text-neutral-800 hover:border-black disabled:opacity-40"
                                >
                                    {generating > 0 ? `Generating… ${generating} left` : "Generate all visuals"}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={approveAll}
                                disabled={busy !== null || approvedCount === posts.length}
                                className="border border-[#C8102E] px-4 py-2 font-serif text-[#C8102E] hover:bg-[#C8102E]/5 disabled:opacity-40"
                            >
                                {busy === "all" ? "Approving…" : "Approve all"}
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                        {posts.map((p) => {
                            const state = visual[p.id];
                            const isEditing = editing === p.id;

                            return (
                                <article
                                    key={p.id}
                                    className={`flex flex-col border bg-white ${p.approved ? "border-[#C8102E]" : "border-neutral-200"
                                        }`}
                                >
                                    <div
                                        className={`flex items-center justify-between gap-3 border-b px-5 py-4 ${p.approved ? "border-[#C8102E]/20 bg-[#C8102E]/[0.03]" : "border-neutral-200"
                                            }`}
                                    >
                                        <span className="font-serif text-sm uppercase tracking-[0.2em] text-[#C8102E]">
                                            {p.stage ?? "post"}
                                        </span>
                                        <span className="font-serif text-neutral-600">{slotLabel(p)}</span>
                                    </div>

                                    {/* Visual */}
                                    <div
                                        className={`relative flex aspect-square items-center justify-center overflow-hidden ${p.approved ? "bg-[#C8102E]/[0.06]" : "bg-neutral-100"
                                            }`}
                                    >
                                        {p.visualUrl ? (
                                            <img src={p.visualUrl} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="text-center font-serif">
                                                <p className="text-sm uppercase tracking-[0.2em] text-neutral-600">
                                                    {p.format ?? "post"}
                                                </p>
                                                {state === "loading" ? (
                                                    <p className="mt-2 text-neutral-500">Generating…</p>
                                                ) : !makesVisuals ? (
                                                    <p className="mt-2 text-neutral-500">Text only</p>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => generateVisual(p)}
                                                        className="mt-2 text-neutral-700 underline-offset-4 hover:text-[#C8102E] hover:underline"
                                                    >
                                                        {state === "failed" ? "Failed — try again" : "Generate visual"}
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Body */}
                                    <div className="flex flex-1 flex-col p-5">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    value={draft.title}
                                                    maxLength={120}
                                                    onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                                                    className="border border-neutral-300 px-3 py-2 font-serif text-lg text-black focus:border-black focus:outline-none"
                                                    placeholder="Title"
                                                />
                                                <textarea
                                                    value={draft.caption}
                                                    onChange={(e) => setDraft((d) => ({ ...d, caption: e.target.value }))}
                                                    className="mt-3 min-h-28 resize-y border border-neutral-300 px-3 py-2 font-serif text-neutral-800 focus:border-black focus:outline-none"
                                                    placeholder="Caption"
                                                />
                                            </>
                                        ) : (
                                            <>
                                                <h3 className="font-serif text-2xl leading-snug text-black">
                                                    {p.title || "Untitled post"}
                                                </h3>
                                                {p.caption && (
                                                    <p className="mt-2 font-serif leading-relaxed text-neutral-700">{p.caption}</p>
                                                )}
                                            </>
                                        )}

                                        <p className="mt-3 font-serif text-neutral-600">{channelList(p.channels)}</p>

                                        <div className="mt-auto flex flex-wrap gap-3 pt-5">
                                            {isEditing ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => saveEdit(p)}
                                                        className="border border-[#C8102E] px-5 py-2 font-serif text-[#C8102E] hover:bg-[#C8102E]/5"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setEditing(null)}
                                                        className="border border-neutral-300 px-5 py-2 font-serif text-neutral-700 hover:border-black"
                                                    >
                                                        Cancel
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => patch(p.id, { approved: !p.approved })}
                                                        className={`border px-5 py-2 font-serif ${p.approved
                                                                ? "border-[#C8102E] bg-[#C8102E] text-white hover:bg-[#a50d26]"
                                                                : "border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5"
                                                            }`}
                                                    >
                                                        {p.approved ? "Approved" : "Approve"}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => startEdit(p)}
                                                        className="border border-neutral-300 px-5 py-2 font-serif text-neutral-700 hover:border-black"
                                                    >
                                                        Edit
                                                    </button>
                                                    {makesVisuals && p.visualUrl && (
                                                        <button
                                                            type="button"
                                                            onClick={() => generateVisual(p)}
                                                            disabled={state === "loading"}
                                                            className="px-2 py-2 font-serif text-neutral-600 underline-offset-4 hover:underline disabled:opacity-40"
                                                        >
                                                            {state === "loading" ? "Generating…" : "New visual"}
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                {/* Your brief */}
                <aside className="h-fit border border-neutral-200 bg-white p-6 lg:p-8">
                    <h2 className="border-b border-neutral-200 pb-5 font-serif text-3xl text-black">Your brief</h2>
                    <dl className="mt-6 space-y-6 font-serif">
                        {[
                            ["Goal", GOAL_LABEL[brief.goal] ?? brief.goal],
                            ["Window", brief.startsOn && brief.endsOn ? windowLabel(brief.startsOn, brief.endsOn) : "—"],
                            ["Channels", channelList(brief.channels) || "—"],
                            ["Cadence", CADENCE_LABEL[brief.cadence] ?? brief.cadence],
                            ["Tone", TONE_LABEL[brief.tone] ?? brief.tone],
                            ["Visuals", VISUALS_LABEL[brief.visuals] ?? brief.visuals],
                        ].map(([label, value]) => (
                            <div key={label}>
                                <dt className="text-sm uppercase tracking-[0.2em] text-neutral-500">{label}</dt>
                                <dd className="mt-1 text-xl text-black">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </aside>
            </div>

            {/* Footer */}
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
                <p className="font-serif text-lg text-neutral-600">
                    {approvedCount === 0
                        ? "Approve at least one post to schedule."
                        : `${approvedCount} approved${makesVisuals ? ` · ${readyCount} visuals ready` : ""}`}
                </p>
                <button
                    type="button"
                    onClick={next}
                    disabled={!canSchedule}
                    className="border border-[#C8102E] bg-white px-8 py-3.5 font-serif text-xl text-[#C8102E] hover:bg-[#C8102E]/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                    {generating > 0 ? "Waiting for visuals…" : "Schedule campaign ›"}
                </button>
            </div>
        </>
    );
}