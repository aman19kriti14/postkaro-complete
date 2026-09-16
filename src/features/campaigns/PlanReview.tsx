import { useState } from "react";
import type { CampaignBrief, PlanItem, PostFormat } from "./types";

interface Props {
    brief: CampaignBrief;
    plan: PlanItem[];
    approved: Set<number>;
    onToggle: (index: number) => void;
    onApproveAll: () => void;
    onEdit: (item: PlanItem) => void;
    onRegenerate: () => void;
    regenerating: boolean;
    showVisuals: boolean;
    visualState: Record<number, "loading" | "done" | "failed">;
    onNewVisual: (item: PlanItem) => void;
}

const FORMAT_LABEL: Record<PostFormat, string> = {
    reel: "Reel",
    carousel: "Carousel",
    post: "Post",
    story: "Story",
};
const STAGE_LABEL: Record<string, string> = {
    tease: "Tease",
    explain: "Explain",
    proof: "Proof",
    convert: "Convert",
};
const LABELS: Record<string, string> = {
    sales: "Sales", awareness: "Awareness", launch: "Launch a product", followers: "Grow followers",
    light: "Light · 2 a week", steady: "Steady · 4 a week", heavy: "Heavy · daily",
    warm: "Warm", playful: "Playful", informative: "Informative", festive: "Festive",
    ai_all: "AI images and video", ai_images: "AI images only", my_photos: "Your photos", text_only: "Text only",
    photographic: "Photographic", warm_grainy: "Warm and grainy", editorial: "Editorial", illustrated: "Illustrated",
};

function dayLabel(date: string) {
    const d = new Date(`${date}T00:00:00`);
    return {
        day: d.toLocaleDateString("en-IN", { day: "2-digit" }),
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        weekday: d.toLocaleDateString("en-IN", { weekday: "short" }),
    };
}

function formatRange(s: string, e: string) {
    const f = (x: string) =>
        new Date(`${x}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    return `${f(s)} – ${f(e)}`;
}

const fieldCls =
    "mt-1 block w-full border border-neutral-300 bg-white px-3 py-2 text-sm text-black focus:border-black focus:outline-none";

function EditRow({ item, onSave, onCancel }: { item: PlanItem; onSave: (i: PlanItem) => void; onCancel: () => void }) {
    const [draft, setDraft] = useState(item);
    const set = <K extends keyof PlanItem>(k: K, v: PlanItem[K]) => setDraft({ ...draft, [k]: v });

    return (
        <div className="grid gap-3 p-5 sm:grid-cols-2">
            <label className="text-xs text-neutral-500 sm:col-span-2">
                Title
                <input className={fieldCls} value={draft.title} onChange={(e) => set("title", e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500 sm:col-span-2">
                What the post says or shows
                <textarea
                    className={`${fieldCls} min-h-20 resize-y`}
                    value={draft.hook}
                    onChange={(e) => set("hook", e.target.value)}
                />
            </label>
            <label className="text-xs text-neutral-500">
                Date
                <input type="date" className={fieldCls} value={draft.date} onChange={(e) => set("date", e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
                Time (IST)
                <input type="time" className={fieldCls} value={draft.time} onChange={(e) => set("time", e.target.value)} />
            </label>
            <label className="text-xs text-neutral-500">
                Format
                <select
                    className={fieldCls}
                    value={draft.format}
                    onChange={(e) => set("format", e.target.value as PostFormat)}
                >
                    {Object.entries(FORMAT_LABEL).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                    ))}
                </select>
            </label>
            <div className="flex items-end justify-end gap-2">
                <button type="button" onClick={onCancel} className="border border-neutral-300 px-4 py-2 text-sm hover:border-black">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => onSave(draft)}
                    disabled={!draft.title.trim() || !draft.date}
                    className="bg-[#C8102E] px-4 py-2 text-sm text-white hover:bg-[#a90d26] disabled:opacity-40"
                >
                    Save changes
                </button>
            </div>
        </div>
    );
}

export function PlanReview({
    brief, plan, approved, onToggle, onApproveAll, onEdit, onRegenerate, regenerating,
    showVisuals, visualState, onNewVisual,
}: Props) {
    const [editing, setEditing] = useState<number | null>(null);

    const byFormat = plan.reduce<Record<string, number>>((acc, p) => {
        acc[p.format] = (acc[p.format] ?? 0) + 1;
        return acc;
    }, {});
    const byStage = plan.reduce<Record<string, number>>((acc, p) => {
        acc[p.stage] = (acc[p.stage] ?? 0) + 1;
        return acc;
    }, {});
    const max = Math.max(1, ...Object.values(byFormat));

    return (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
            {/* The plan */}
            <section className="border border-neutral-200 bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
                    <div>
                        <h2 className="font-serif text-3xl text-black">Review the plan</h2>
                        <p className="mt-1 text-sm text-neutral-600">
                            {approved.size} of {plan.length} approved
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={onRegenerate}
                            disabled={regenerating}
                            className="border border-neutral-300 px-4 py-2.5 font-serif hover:border-black disabled:opacity-40"
                        >
                            {regenerating ? "Regenerating…" : "Regenerate plan"}
                        </button>
                        <button
                            type="button"
                            onClick={onApproveAll}
                            disabled={approved.size === plan.length}
                            className="border border-[#C8102E] px-4 py-2.5 font-serif text-[#C8102E] hover:bg-[#C8102E]/5 disabled:opacity-40"
                        >
                            Approve all
                        </button>
                    </div>
                </div>

                <ul className="mt-6 space-y-4">
                    {plan.map((item) => {
                        const on = approved.has(item.index);
                        const d = dayLabel(item.date);
                        const vs = visualState[item.index];
                        const needsImage = showVisuals && !item.mediaUrl;

                        return (
                            <li
                                key={item.index}
                                className={`border ${on ? "border-[#C8102E] bg-[#C8102E]/[0.03]" : "border-neutral-200"}`}
                            >
                                {editing === item.index ? (
                                    <EditRow
                                        item={item}
                                        onCancel={() => setEditing(null)}
                                        onSave={(next) => {
                                            onEdit(next);
                                            setEditing(null);
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                                        {showVisuals && (
                                            <div className="relative h-28 w-28 shrink-0 overflow-hidden bg-neutral-100">
                                                {item.mediaUrl ? (
                                                    <img src={item.mediaUrl} alt={`Visual for ${item.title}`} className="h-full w-full object-cover" />
                                                ) : vs === "failed" ? (
                                                    <div className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center">
                                                        <span className="text-xs text-neutral-600">Couldn't make this image</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => onNewVisual(item)}
                                                            className="text-xs text-[#C8102E] underline underline-offset-2"
                                                        >
                                                            Try again
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div
                                                        role="status"
                                                        className="flex h-full items-center justify-center animate-pulse bg-neutral-200 text-xs text-neutral-500 motion-reduce:animate-none"
                                                    >
                                                        Making image…
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <div className="w-20 shrink-0">
                                            <p className="font-serif text-2xl text-black">
                                                {d.day} {d.month}
                                            </p>
                                            <p className="text-sm text-neutral-500">
                                                {d.weekday}, {item.time}
                                            </p>
                                        </div>

                                        <span className="w-fit shrink-0 border border-[#C8102E]/40 px-2.5 py-1 text-xs tracking-widest text-[#C8102E] uppercase">
                                            {FORMAT_LABEL[item.format]}
                                        </span>

                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-serif text-xl text-black">{item.title || "Untitled post"}</h3>
                                            {item.hook && <p className="mt-1 font-serif text-neutral-600">{item.hook}</p>}
                                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                                                <span className="capitalize">{item.channels.join(", ")}</span>
                                                <span className="border border-neutral-300 px-2 py-0.5 text-xs tracking-widest uppercase">
                                                    {STAGE_LABEL[item.stage] ?? item.stage}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                aria-pressed={on}
                                                onClick={() => onToggle(item.index)}
                                                disabled={!item.title.trim() || needsImage}
                                                title={needsImage ? "Wait for the image first" : undefined}
                                                className={`border px-4 py-2 font-serif disabled:opacity-40 ${on
                                                    ? "border-[#C8102E] bg-[#C8102E]/10 text-[#C8102E]"
                                                    : "border-[#C8102E] text-[#C8102E] hover:bg-[#C8102E]/5"
                                                    }`}
                                            >
                                                {on ? "Approved" : "Approve"}
                                            </button>
                                            {showVisuals && item.mediaUrl && (
                                                <button
                                                    type="button"
                                                    onClick={() => onNewVisual(item)}
                                                    disabled={vs === "loading"}
                                                    className="border border-neutral-300 px-4 py-2 font-serif hover:border-black disabled:opacity-40"
                                                >
                                                    {vs === "loading" ? "Making…" : "New image"}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>

            {/* Side panel */}
            <aside className="space-y-6">
                <section className="border border-neutral-200 bg-white p-6">
                    <h2 className="border-b border-neutral-200 pb-4 font-serif text-2xl text-black">Your brief</h2>
                    <dl className="mt-4 space-y-4 text-sm">
                        {[
                            ["Goal", LABELS[brief.goal]],
                            ["Window", formatRange(brief.startsOn, brief.endsOn)],
                            ["Channels", brief.channels.map((c) => c[0]!.toUpperCase() + c.slice(1)).join(", ")],
                            ["Cadence", LABELS[brief.cadence]],
                            ["Tone", LABELS[brief.tone]],
                            [
                                "Visuals",
                                brief.visuals === "text_only"
                                    ? LABELS[brief.visuals]
                                    : `${LABELS[brief.visuals]}, ${LABELS[brief.look]?.toLowerCase()}`,
                            ],
                        ].map(([k, v]) => (
                            <div key={k}>
                                <dt className="text-xs text-neutral-500">{k}</dt>
                                <dd className="font-serif text-base text-black">{v}</dd>
                            </div>
                        ))}
                    </dl>
                </section>

                <section className="border border-neutral-200 bg-white p-6">
                    <h2 className="border-b border-neutral-200 pb-4 font-serif text-2xl text-black">Balance of the plan</h2>
                    <ul className="mt-4 space-y-4">
                        {Object.entries(byFormat).map(([f, n]) => (
                            <li key={f}>
                                <div className="flex justify-between font-serif text-black">
                                    <span>{FORMAT_LABEL[f as PostFormat]}s</span>
                                    <span>
                                        {n} {n === 1 ? "post" : "posts"}
                                    </span>
                                </div>
                                <div className="mt-1.5 h-1 bg-neutral-200">
                                    <div className="h-1 bg-[#C8102E]" style={{ width: `${(n / max) * 100}%` }} />
                                </div>
                            </li>
                        ))}
                    </ul>
                    <p className="mt-5 border-t border-neutral-200 pt-4 text-sm text-neutral-600">
                        {["tease", "explain", "proof", "convert"]
                            .filter((s) => byStage[s])
                            .map((s) => `${byStage[s]} ${STAGE_LABEL[s]!.toLowerCase()}`)
                            .join(", ")}
                    </p>
                </section>
            </aside>
        </div>
    );
}