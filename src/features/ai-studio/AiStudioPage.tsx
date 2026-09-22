import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { aiStudioApi, apiError, type GenerateInput, type Idea, type IdeaSet, type SavedSetSummary } from "./api";
import { IdeaComposer } from "./IdeaComposer";
import { IdeaGrid, type IdeaAction } from "./IdeaCard";
import { BrandPromptStrip } from "../brand-profile/BrandPromptStrip";

// ⚠️ adjust to your router
const ROUTES = {
    studio: "/ai-studio",
    // Create Post opened on an existing draft; `mode` pre-opens publish or the date picker
    editPost: (postId: string, mode?: "publish" | "schedule") =>
        `/create?draft=${postId}${mode ? `&mode=${mode}` : ""}`,
};

// Lets the sidebar list refresh after a save
const SETS_CHANGED = "ai-studio:sets-changed";
const notifySetsChanged = () => window.dispatchEvent(new Event(SETS_CHANGED));

export function AiStudioPage() {
    const navigate = useNavigate();
    const [params, setParams] = useSearchParams();
    const setId = params.get("set");
    const briefParam = params.get("brief");

    const [set, setSet] = useState<IdeaSet | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // ---------- load ----------

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        (setId ? aiStudioApi.getSet(setId) : aiStudioApi.latest())
            .then((s) => !cancelled && setSet(s))
            .catch((err) => !cancelled && setError(apiError(err, "Couldn't load ideas")))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [setId]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    // ---------- generate ----------

    const generate = async (input: GenerateInput) => {
        setGenerating(true);
        setError(null);
        try {
            const created = await aiStudioApi.generate(input);
            setSet(created);
            setParams({ set: created.id }, { replace: true });
        } catch (err) {
            setError(apiError(err, "Couldn't generate ideas. Try again."));
        } finally {
            setGenerating(false);
        }
    };

    // ---------- card actions ----------

    const replaceIdea = (updated: Idea) =>
        setSet((s) => {
            if (!s) return s;
            const ideas = s.ideas.map((i) => (i.id === updated.id ? updated : i));
            const dismissedCount = ideas.filter((i) => i.status === "DISMISSED").length;
            return { ...s, ideas, dismissedCount, keptCount: ideas.length - dismissedCount };
        });

    const onAction = useCallback(
        async (idea: Idea, action: IdeaAction) => {
            try {
                switch (action) {
                    case "dismiss":
                        replaceIdea(await aiStudioApi.dismiss(idea.id));
                        break;
                    case "visual":
                        replaceIdea(await aiStudioApi.makeVisual(idea.id));
                        break;
                    case "draft":
                    case "postNow":
                    case "schedule": {
                        const postId = idea.draftPostId ?? (await aiStudioApi.draft(idea.id));
                        const mode = action === "postNow" ? "publish" : action === "schedule" ? "schedule" : undefined;
                        navigate(ROUTES.editPost(postId, mode));
                        break;
                    }
                }
            } catch (err) {
                setToast(apiError(err));
            }
        },
        [navigate],
    );

    // ---------- header actions ----------

    const restore = async () => {
        if (!set) return;
        try {
            setSet(await aiStudioApi.restoreDismissed(set.id));
            notifySetsChanged();
        } catch (err) {
            setToast(apiError(err));
        }
    };

    const save = async (name: string) => {
        if (!set) return;
        try {
            setSet(await aiStudioApi.saveSet(set.id, name));
            notifySetsChanged();
            setToast("Saved");
        } catch (err) {
            setToast(apiError(err));
        }
    };

    // A brief handed over from Analytics wins over the last set's brief
    const composerInitial = useMemo(() => {
        if (briefParam) {
            return {
                brief: briefParam,
                sources: set?.sources,
                formats: set?.formats,
                channels: set?.channels,
            };
        }
        return set
            ? { brief: set.brief, sources: set.sources, formats: set.formats, channels: set.channels }
            : null;
    }, [briefParam, set?.id]);

    // ---------- render ----------

    return (
        <div className="p-6 sm:p-10 max-w-[1200px]">
            {/* Header */}
            <p className="text-sm font-medium tracking-[0.18em] uppercase text-primary-500 min-h-5">
                {set?.name ?? "\u00A0"}
            </p>
            <h1 className="mt-2 text-4xl sm:text-5xl font-[var(--font-display)] text-neutral-900">AI studio</h1>
            <p className="mt-4 max-w-3xl text-lg text-neutral-600">
                Generate ideas, keep the ones worth posting, and hand them to a draft. Nothing here is scheduled until
                you draft it.
            </p>

            <div className="mt-8 mb-8 h-px bg-neutral-200" />

            <BrandPromptStrip />

            <IdeaComposer
                initial={composerInitial}
                generating={generating}
                onGenerate={generate}
            />

            {error && (
                <div className="mt-6 rounded-[var(--radius-md)] border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-primary-600">
                    {error}
                </div>
            )}

            {/* Ideas */}
            <section className="mt-12">
                {generating ? (
                    <IdeasSkeleton label="Writing ideas…" />
                ) : loading ? (
                    <IdeasSkeleton />
                ) : !set ? (
                    <p className="text-neutral-500">
                        Describe what's happening this week and pick your formats. Ideas show up here.
                    </p>
                ) : (
                    <>
                        <IdeasHeader set={set} onRestore={restore} onSave={save} />
                        <IdeaGrid ideas={set.ideas} onAction={onAction} />
                    </>
                )}
            </section>

            {/* Mobile: saved sets live below the ideas (desktop shows them in the sidebar) */}
            <section className="mt-12 lg:hidden">
                <SavedIdeaSets />
            </section>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-[var(--radius-md)] bg-neutral-900 px-5 py-3 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

// ---------- "Ideas · 6 kept · 0 dismissed" row ----------

function IdeasHeader({
    set,
    onRestore,
    onSave,
}: {
    set: IdeaSet;
    onRestore: () => Promise<void>;
    onSave: (name: string) => Promise<void>;
}) {
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState(set.name);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setName(set.name);
        setNaming(false);
    }, [set.id, set.name]);

    const wrap = (fn: () => Promise<void>) => async () => {
        setBusy(true);
        try {
            await fn();
        } finally {
            setBusy(false);
        }
    };

    const btn =
        "h-11 px-5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 hover:border-neutral-300 transition-colors cursor-pointer disabled:cursor-default disabled:text-neutral-400 disabled:hover:border-neutral-200";

    return (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-baseline gap-4">
                <h2 className="text-4xl font-[var(--font-display)] text-neutral-900">Ideas</h2>
                <span className="text-base text-neutral-500">
                    {set.keptCount} kept · {set.dismissedCount} dismissed
                </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <button onClick={wrap(onRestore)} disabled={busy || set.dismissedCount === 0} className={btn}>
                    {set.dismissedCount === 0 ? "Nothing dismissed" : `Restore ${set.dismissedCount} dismissed`}
                </button>

                {naming ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            wrap(async () => {
                                await onSave(name);
                                setNaming(false);
                            })();
                        }}
                        className="flex gap-2"
                    >
                        <input
                            autoFocus
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={80}
                            className="h-11 w-52 rounded-[var(--radius-md)] border border-neutral-300 px-3 text-sm focus:outline-none focus:border-primary-500"
                        />
                        <button
                            type="submit"
                            disabled={busy || !name.trim()}
                            className="h-11 px-5 rounded-[var(--radius-md)] border border-primary-500 text-sm text-primary-500 hover:bg-primary-50 cursor-pointer disabled:opacity-50"
                        >
                            Save
                        </button>
                    </form>
                ) : (
                    <button onClick={() => setNaming(true)} className={btn}>
                        {set.saved ? "Rename set" : "Save this set"}
                    </button>
                )}
            </div>
        </div>
    );
}

// ---------- saved sets list (used in sidebar + mobile) ----------

export function SavedIdeaSets({ variant = "light" }: { variant?: "light" | "dark" }) {
    const [params] = useSearchParams();
    const activeId = params.get("set");
    const [sets, setSets] = useState<SavedSetSummary[]>([]);

    useEffect(() => {
        const load = () => aiStudioApi.savedSets().then(setSets).catch(() => setSets([]));
        load();
        window.addEventListener(SETS_CHANGED, load);
        return () => window.removeEventListener(SETS_CHANGED, load);
    }, []);

    if (sets.length === 0) return null;

    const dark = variant === "dark";

    return (
        <div>
            <p
                className={`px-1 mb-3 text-xs font-medium tracking-[0.18em] uppercase ${dark ? "text-primary-400" : "text-primary-500"
                    }`}
            >
                Saved idea sets
            </p>
            <ul className="space-y-1">
                {sets.map((s) => {
                    const active = s.id === activeId;
                    return (
                        <li key={s.id}>
                            <Link
                                to={`${ROUTES.studio}?set=${s.id}`}
                                className={`block rounded-[var(--radius-md)] px-4 py-3 border-l-2 transition-colors ${active
                                    ? dark
                                        ? "border-primary-500 bg-white/10"
                                        : "border-primary-500 bg-primary-50"
                                    : dark
                                        ? "border-transparent hover:bg-white/5"
                                        : "border-transparent hover:bg-neutral-50"
                                    }`}
                            >
                                <p className={`truncate ${dark ? "text-white" : "text-neutral-900"}`}>{s.name}</p>
                                <p className={`text-sm ${dark ? "text-neutral-400" : "text-neutral-500"}`}>
                                    {s.ideaCount} ideas · {relativeDay(s.updatedAt)}
                                </p>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

// ---------- helpers ----------

function IdeasSkeleton({ label }: { label?: string }) {
    return (
        <div>
            {label && <p className="mb-6 text-neutral-500">{label}</p>}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-80 rounded-[var(--radius-lg)] bg-neutral-100 animate-pulse" />
                ))}
            </div>
        </div>
    );
}

function relativeDay(iso: string): string {
    const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
    if (days <= 0) return "today";
    if (days === 1) return "yesterday";
    if (days < 7) return `${days} days ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}