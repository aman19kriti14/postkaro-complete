import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Copy, Sparkles } from "lucide-react";
import { createPostUrl, type StarterPrompt } from "./api";

const FORMAT_LABEL: Record<string, string> = {
    reel: "Reel",
    carousel: "Carousel",
    post: "Post",
    story: "Story",
};

interface Props {
    prompts: StarterPrompt[];
    /** Show at most this many (e.g. 3 on AI Studio, all on the brand page) */
    limit?: number;
    /** Compact = 3 columns, smaller text (AI Studio strip) */
    compact?: boolean;
}

export function SuggestedPrompts({ prompts, limit, compact = false }: Props) {
    const shown = limit ? prompts.slice(0, limit) : prompts;
    if (shown.length === 0) return null;

    return (
        <div
            className={`grid grid-cols-1 gap-4 ${compact ? "md:grid-cols-3" : "md:grid-cols-2"}`}
        >
            {shown.map((p, i) => (
                <PromptCard key={`${p.title}-${i}`} prompt={p} compact={compact} />
            ))}
        </div>
    );
}

function PromptCard({ prompt, compact }: { prompt: StarterPrompt; compact: boolean }) {
    const navigate = useNavigate();
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(prompt.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            /* clipboard blocked — ignore */
        }
    };

    return (
        <article className="flex flex-col rounded-[var(--radius-lg)] border border-neutral-200 bg-white">
            <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-neutral-100">
                <span className="text-xs font-medium tracking-[0.18em] uppercase text-primary-500">
                    {FORMAT_LABEL[prompt.format] ?? prompt.format}
                </span>
                {prompt.pillar && (
                    <span className="text-xs text-neutral-500 truncate max-w-[60%] text-right">{prompt.pillar}</span>
                )}
            </header>

            <div className="flex flex-1 flex-col px-5 pt-4 pb-5">
                <h3
                    className={`leading-snug font-[var(--font-display)] text-neutral-900 ${compact ? "text-lg" : "text-xl"}`}
                >
                    {prompt.title}
                </h3>
                <p className={`mt-2 leading-relaxed text-neutral-600 ${compact ? "text-sm line-clamp-3" : "text-base"}`}>
                    {prompt.prompt}
                </p>

                {prompt.why && !compact && (
                    <p className="mt-3 pt-3 border-t border-neutral-100 flex gap-2 text-sm text-neutral-500">
                        <Sparkles className="w-4 h-4 mt-0.5 shrink-0 text-primary-500" />
                        {prompt.why}
                    </p>
                )}

                <div className="mt-auto pt-4 flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate(createPostUrl(prompt))}
                        className="h-10 px-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-50 transition-colors cursor-pointer"
                    >
                        Use this <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={copy}
                        title="Copy prompt"
                        className="h-10 w-10 inline-flex items-center justify-center rounded-[var(--radius-md)] border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                        {copied ? <Check className="w-4 h-4 text-success-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                </div>
            </div>
        </article>
    );
}