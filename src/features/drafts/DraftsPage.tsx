import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { draftsApi, errorMessage } from "./api";
import { DraftCard } from "./DraftCard";
import { SchedulePopover } from "./SchedulePopover";
import type { Draft, DraftFilter, DraftSort, DraftsSummary } from "./types";

// Change this to your Create Post route

const CREATE_POST_PATH = "/create";

const FILTERS: { key: DraftFilter; label: string; count: (s: DraftsSummary) => number }[] = [
    { key: "all", label: "All", count: (s) => s.total },
    { key: "almostReady", label: "Almost ready", count: (s) => s.almostReady },
    { key: "noVisual", label: "No visual", count: (s) => s.noVisual },
    { key: "noChannel", label: "No channel", count: (s) => s.noChannel },
    { key: "fromAiStudio", label: "From AI studio", count: (s) => s.fromAiStudio },
];

const SORTS: { key: DraftSort; label: string }[] = [
    { key: "recent", label: "Last edited" },
    { key: "oldest", label: "Oldest first" },
    { key: "ready", label: "Ready first" },
];

function matches(d: Draft, f: DraftFilter): boolean {
    switch (f) {
        case "almostReady": return d.readyToSchedule;
        case "noVisual": return !d.hasVisual;
        case "noChannel": return !d.hasChannel;
        case "fromAiStudio": return d.fromAiStudio;
        default: return true;
    }
}

// Recompute counts locally after a draft leaves the list
function summarize(drafts: Draft[]): DraftsSummary {
    return {
        total: drafts.length,
        almostReady: drafts.filter((d) => d.readyToSchedule).length,
        noVisual: drafts.filter((d) => !d.hasVisual).length,
        noChannel: drafts.filter((d) => !d.hasChannel).length,
        fromAiStudio: drafts.filter((d) => d.fromAiStudio).length,
        drafts,
    };
}

export default function DraftsPage() {
    const navigate = useNavigate();
    const [data, setData] = useState<DraftsSummary | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sort, setSort] = useState<DraftSort>("recent");
    const [filter, setFilter] = useState<DraftFilter>("all");
    const [openId, setOpenId] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setData(await draftsApi.list(sort));
        } catch (err) {
            setError(errorMessage(err, "Couldn't load your drafts."));
        }
    }, [sort]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 4000);
        return () => clearTimeout(t);
    }, [notice]);

    const handleContinue = (d: Draft) => navigate(`${CREATE_POST_PATH}?draft=${d.id}`);

    const handleScheduled = (id: string, at: Date) => {
        setOpenId(null);
        setData((prev) => (prev ? summarize(prev.drafts.filter((d) => d.id !== id)) : prev));
        // Let the sidebar badge refresh (step 7 listens for this)
        window.dispatchEvent(new Event("pk:drafts-changed"));
        setNotice(
            `Scheduled for ${at.toLocaleString("en-IN", {
                weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
            })}. It's on your calendar now.`,
        );
    };

    const visible = useMemo(
        () => (data ? data.drafts.filter((d) => matches(d, filter)) : []),
        [data, filter],
    );

    // On "All", split into two groups like the mockup; other filters show one list
    const groups = useMemo(() => {
        if (filter !== "all") return [{ title: null as string | null, items: visible }];
        return [
            { title: "Almost ready", items: visible.filter((d) => d.readyToSchedule) },
            { title: "Needs work", items: visible.filter((d) => !d.readyToSchedule) },
        ].filter((g) => g.items.length > 0);
    }, [visible, filter]);

    const renderCard = (d: Draft) => (
        <DraftCard
            key={d.id}
            draft={d}
            onContinue={handleContinue}
            onSchedule={() => setOpenId(d.id)}
            scheduleSlot={
                openId === d.id && (
                    <SchedulePopover draft={d} onClose={() => setOpenId(null)} onScheduled={handleScheduled} />
                )
            }
        />
    );

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
            {/* Header */}
            <header className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-200 pb-8">
                <div>
                    {data && (
                        <p className="text-sm tracking-[0.2em] text-[#C8102E] uppercase">
                            {data.total - data.almostReady} unfinished · {data.almostReady} ready to schedule
                        </p>
                    )}
                    <h1 className="mt-2 font-serif text-5xl text-black">Drafts</h1>
                </div>

                <label className="flex items-center gap-2 border border-neutral-300 px-4 py-2.5 font-serif text-black focus-within:border-black">
                    <span>Sort:</span>
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value as DraftSort)}
                        className="bg-transparent font-serif focus:outline-none"
                    >
                        {SORTS.map((s) => (
                            <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                    </select>
                </label>
            </header>

            {/* Filters */}
            {data && data.total > 0 && (
                <nav aria-label="Filter drafts" className="mt-8 flex flex-wrap gap-3">
                    {FILTERS.map((f) => {
                        const active = f.key === filter;
                        const n = f.count(data);
                        return (
                            <button
                                key={f.key}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setFilter(f.key)}
                                className={`border px-5 py-2.5 font-serif ${active
                                    ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                    : "border-neutral-300 text-neutral-800 hover:border-black"
                                    }`}
                            >
                                {f.label} <span className="ml-2 opacity-70">{n}</span>
                            </button>
                        );
                    })}
                </nav>
            )}

            {/* Notice after scheduling */}
            {notice && (
                <p role="status" className="mt-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                    {notice}
                </p>
            )}

            {/* States */}
            {error && (
                <div className="mt-10 border border-neutral-300 p-6">
                    <p className="text-black">{error}</p>
                    <button type="button" onClick={load} className="mt-3 text-sm text-[#C8102E] underline underline-offset-4">
                        Try again
                    </button>
                </div>
            )}

            {!data && !error && (
                <div className="mt-10 grid gap-8 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="aspect-[4/6] animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                    ))}
                </div>
            )}

            {data && data.total === 0 && (
                <div className="mt-16 max-w-md">
                    <p className="font-serif text-2xl text-black">No drafts right now.</p>
                    <p className="mt-2 text-neutral-600">
                        Posts you save without publishing show up here, so you can finish and schedule them later.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate(CREATE_POST_PATH)}
                        className="mt-6 border border-[#C8102E] px-5 py-2.5 font-serif text-[#C8102E] hover:bg-[#C8102E]/5"
                    >
                        + Create post
                    </button>
                </div>
            )}

            {data && data.total > 0 && visible.length === 0 && (
                <p className="mt-10 text-neutral-600">No drafts match this filter.</p>
            )}

            {/* Groups */}
            {groups.map((g) => (
                <section key={g.title ?? "list"} className="mt-10">
                    {g.title && (
                        <div className="mb-6 flex items-center gap-4">
                            <h2 className="font-serif text-3xl text-black">{g.title}</h2>
                            <span className="h-px flex-1 bg-neutral-200" />
                            <span className="text-sm text-neutral-600">
                                {g.items.length} {g.items.length === 1 ? "draft" : "drafts"}
                            </span>
                        </div>
                    )}
                    <div className="grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
                        {g.items.map(renderCard)}
                    </div>
                </section>
            ))}
        </div>
    );
}