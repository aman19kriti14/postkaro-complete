import { useState } from "react";
import { TrendingUp, Loader2 } from "lucide-react";
import type { Idea } from "./api";
import { channelLabel } from "@/features/dashboard/format";

export type IdeaAction = "postNow" | "schedule" | "draft" | "visual" | "dismiss";

const FORMAT_LABELS: Record<string, string> = {
    reel: "Reel",
    carousel: "Carousel",
    post: "Single post",
    story: "Story",
};

// ---------- grid ----------

export function IdeaGrid({
    ideas,
    onAction,
}: {
    ideas: Idea[];
    onAction: (idea: Idea, action: IdeaAction) => Promise<void>;
}) {
    const visible = ideas.filter((i) => i.status !== "DISMISSED");

    if (visible.length === 0) {
        return (
            <div className="rounded-[var(--radius-lg)] border border-dashed border-neutral-300 p-10 text-center">
                <p className="text-neutral-500">No ideas showing. Restore dismissed ones or generate a new set.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visible.map((idea) => (
                <IdeaCard key={idea.id} idea={idea} onAction={onAction} />
            ))}
        </div>
    );
}

// ---------- card ----------

function IdeaCard({ idea, onAction }: { idea: Idea; onAction: (idea: Idea, action: IdeaAction) => Promise<void> }) {
    const [busy, setBusy] = useState<IdeaAction | null>(null);
    const drafted = idea.status === "DRAFTED";

    const run = async (action: IdeaAction) => {
        if (busy) return;
        setBusy(action);
        try {
            await onAction(idea, action);
        } finally {
            setBusy(null);
        }
    };

    return (
        <article className="flex flex-col rounded-[var(--radius-lg)] border border-neutral-200 bg-white">
            {/* Top strip: format + channels */}
            <header className="flex items-center justify-between gap-3 px-6 py-4 border-b border-neutral-100">
                <span className="text-xs font-medium tracking-[0.18em] uppercase text-primary-500">
                    {FORMAT_LABELS[idea.format] ?? idea.format}
                </span>
                <span className="text-sm text-neutral-600 text-right">
                    {idea.channels.map(channelLabel).join(" · ")}
                </span>
            </header>

            <div className="flex flex-1 flex-col px-6 pt-5 pb-6">
                {idea.visualUrl && (
                    <img
                        src={idea.visualUrl}
                        alt=""
                        className={`mb-4 w-full rounded-[var(--radius-md)] object-cover bg-neutral-100 ${idea.format === "reel" || idea.format === "story" ? "aspect-[4/5]" : "aspect-square"
                            }`}
                    />
                )}

                <div className="flex items-start justify-between gap-3">
                    <h3 className="text-2xl leading-snug font-[var(--font-display)] text-neutral-900">{idea.title}</h3>
                    {drafted && (
                        <span className="mt-1 shrink-0 text-[11px] tracking-[0.12em] uppercase px-2 py-0.5 rounded-[var(--radius-sm)] border border-neutral-300 text-neutral-500">
                            Drafted
                        </span>
                    )}
                </div>
                <p className="mt-2 text-base leading-relaxed text-neutral-600">{idea.description}</p>

                {/* Insight line: only present when backed by real data */}
                {idea.insight && (
                    <p className="mt-4 pt-4 border-t border-neutral-100 flex gap-3 text-base text-primary-500">
                        <TrendingUp className="w-4 h-4 mt-1 shrink-0" />
                        <span>{idea.insight}</span>
                    </p>
                )}

                {/* push actions to the bottom so cards line up */}
                <div className="mt-auto pt-5 space-y-3">
                    <div className="grid grid-cols-[auto_auto_auto] gap-3 justify-start">
                        <ActionButton primary busy={busy === "postNow"} disabled={!!busy} onClick={() => run("postNow")}>
                            Post now
                        </ActionButton>
                        <ActionButton busy={busy === "schedule"} disabled={!!busy} onClick={() => run("schedule")}>
                            Schedule
                        </ActionButton>
                        <ActionButton busy={busy === "draft"} disabled={!!busy} onClick={() => run("draft")}>
                            {drafted ? "Open draft" : "Draft"}
                        </ActionButton>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <ActionButton busy={busy === "visual"} disabled={!!busy} onClick={() => run("visual")}>
                            {busy === "visual" ? "Making…" : idea.visualUrl ? "New visual" : "Make visual"}
                        </ActionButton>
                        {!drafted && (
                            <ActionButton busy={busy === "dismiss"} disabled={!!busy} onClick={() => run("dismiss")}>
                                Dismiss
                            </ActionButton>
                        )}
                    </div>
                </div>
            </div>
        </article>
    );
}

// ---------- button ----------

function ActionButton({
    children,
    onClick,
    primary = false,
    busy = false,
    disabled = false,
}: {
    children: React.ReactNode;
    onClick: () => void;
    primary?: boolean;
    busy?: boolean;
    disabled?: boolean;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`h-11 px-4 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] border text-sm whitespace-nowrap transition-colors cursor-pointer disabled:cursor-not-allowed ${primary
                    ? "border-primary-500 bg-primary-50 text-primary-500 hover:bg-primary-100"
                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                } ${disabled && !busy ? "opacity-60" : ""}`}
        >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {children}
        </button>
    );
}