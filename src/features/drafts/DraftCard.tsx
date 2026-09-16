import type { Draft } from "./types";

interface Props {
    draft: Draft;
    onContinue: (draft: Draft) => void;
    onSchedule: (draft: Draft) => void;
    scheduleSlot?: React.ReactNode; // popover renders here in step 5
}

const TYPE_LABEL: Record<Draft["contentType"], string> = {
    IMAGE: "Image",
    REEL: "Reel",
    CAROUSEL: "Carousel",
    TEXT: "Text post",
};

function timeAgo(iso: string): string {
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} ${hrs === 1 ? "hour" : "hours"} ago`;
    const days = Math.round(hrs / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function missing(d: Draft): string[] {
    const out: string[] = [];
    if (!d.hasVisual) out.push("Add a visual");
    if (!d.hasChannel) out.push("Pick a channel");
    if (!d.caption?.trim()) out.push("Write a caption");
    return out;
}

export function DraftCard({ draft, onContinue, onSchedule, scheduleSlot }: Props) {
    const todo = missing(draft);
    const ready = draft.readyToSchedule;
    const isVideo = draft.contentType === "REEL";

    return (
        <article
            className={`relative flex flex-col border bg-white ${ready ? "border-[#C8102E]" : "border-neutral-200"
                }`}
        >
            {/* Visual */}
            <div className="relative aspect-[4/5] overflow-hidden bg-[#C8102E]/[0.06]">
                {draft.hasVisual && draft.mediaUrl ? (
                    isVideo ? (
                        <video
                            src={draft.mediaUrl}
                            muted
                            playsInline
                            preload="metadata"
                            className="h-full w-full object-cover"
                        />
                    ) : (
                        <img
                            src={draft.mediaUrl}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover"
                        />
                    )
                ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                        <span className="text-xs tracking-widest text-[#C8102E] uppercase">
                            {TYPE_LABEL[draft.contentType]}
                        </span>
                        <span className="font-serif text-neutral-500">No visual yet</span>
                    </div>
                )}

                {draft.hasVisual && (
                    <span className="absolute top-3 left-3 bg-white/90 px-2 py-1 text-xs tracking-widest text-[#C8102E] uppercase">
                        {TYPE_LABEL[draft.contentType]}
                        {draft.mediaCount > 1 && ` · ${draft.mediaCount}`}
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col p-6">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="tracking-widest text-[#C8102E] uppercase">
                        {draft.fromAiStudio ? "AI studio" : "Manual"}
                    </span>
                    <span className="text-neutral-500">{timeAgo(draft.updatedAt)}</span>
                </div>

                <h3 className="mt-3 font-serif text-2xl leading-snug text-black">
                    {draft.title}
                </h3>

                {draft.caption && (
                    <p className="mt-2 line-clamp-2 font-serif leading-relaxed text-neutral-600">
                        {draft.caption}
                    </p>
                )}

                {draft.channels.length > 0 && (
                    <p className="mt-3 text-sm text-neutral-500 capitalize">
                        {draft.channels.join(", ")}
                    </p>
                )}

                {todo.length > 0 && (
                    <ul className="mt-4 flex flex-wrap gap-2">
                        {todo.map((t) => (
                            <li key={t} className="border border-neutral-300 px-2 py-1 text-xs text-neutral-700">
                                {t}
                            </li>
                        ))}
                    </ul>
                )}

                {/* Actions */}
                <div className="relative mt-auto flex gap-3 pt-6">
                    <button
                        type="button"
                        onClick={() => onContinue(draft)}
                        className="flex-1 border border-neutral-300 px-4 py-2.5 font-serif text-black hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                    >
                        Continue
                    </button>
                    <button
                        type="button"
                        onClick={() => onSchedule(draft)}
                        disabled={!ready}
                        title={ready ? undefined : todo.join(", ")}
                        className="flex-1 border border-[#C8102E] px-4 py-2.5 font-serif text-[#C8102E] hover:bg-[#C8102E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E] disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
                    >
                        Schedule
                    </button>
                    {scheduleSlot}
                </div>
            </div>
        </article>
    );
}