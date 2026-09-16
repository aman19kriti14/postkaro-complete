import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { campaignsApi, errorMessage } from "./api";
import type { CampaignStatus, CampaignSummary } from "./types";

const STATUS_LABEL: Record<CampaignStatus, string> = {
    live: "Live",
    upcoming: "Upcoming",
    ended: "Ended",
};

const STATUS_ORDER: Record<CampaignStatus, number> = { live: 0, upcoming: 1, ended: 2 };

function formatRange(startsOn: string, endsOn: string): string {
    const s = new Date(`${startsOn}T00:00:00`);
    const e = new Date(`${endsOn}T00:00:00`);
    const sameYear = s.getFullYear() === e.getFullYear();
    const sameMonth = sameYear && s.getMonth() === e.getMonth();
    const month = (d: Date) => d.toLocaleDateString("en-IN", { month: "short" });
    if (sameMonth) return `${s.getDate()}–${e.getDate()} ${month(e)} ${e.getFullYear()}`;
    if (sameYear) return `${s.getDate()} ${month(s)} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`;
    return `${s.getDate()} ${month(s)} ${s.getFullYear()} – ${e.getDate()} ${month(e)} ${e.getFullYear()}`;
}

export default function CampaignsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<CampaignSummary[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function load() {
        setError(null);
        try {
            const list = await campaignsApi.list();
            list.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
            setItems(list);
        } catch (err) {
            setError(errorMessage(err, "Couldn't load your campaigns."));
        }
    }

    useEffect(() => { load(); }, []);

    const liveCount = items?.filter((c) => c.status === "live").length ?? 0;

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
            <header className="flex flex-wrap items-end justify-between gap-6 border-b border-neutral-200 pb-8">
                <div>
                    {items && items.length > 0 && (
                        <p className="text-sm tracking-[0.2em] text-[#C8102E] uppercase">
                            {liveCount} live · {items.length} total
                        </p>
                    )}
                    <h1 className="mt-2 font-serif text-5xl text-black">Campaigns</h1>
                </div>
                <button
                    type="button"
                    onClick={() => navigate("/campaigns/new")}
                    className="border border-[#C8102E] px-5 py-2.5 font-serif text-[#C8102E] hover:bg-[#C8102E]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C8102E]"
                >
                    + New campaign
                </button>
            </header>

            {error && (
                <div className="mt-10 border border-neutral-300 p-6">
                    <p className="text-black">{error}</p>
                    <button type="button" onClick={load} className="mt-3 text-sm text-[#C8102E] underline underline-offset-4">
                        Try again
                    </button>
                </div>
            )}

            {!items && !error && (
                <div className="mt-10 space-y-4" aria-busy="true">
                    {[0, 1, 2].map((i) => (
                        <div key={i} className="h-28 animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                    ))}
                </div>
            )}

            {items && items.length === 0 && (
                <div className="mt-16 max-w-md">
                    <p className="font-serif text-2xl text-black">No campaigns yet.</p>
                    <p className="mt-2 text-neutral-600">
                        Describe what you're promoting and the dates. PostKaro plans the posts across that window,
                        and you approve each one before it becomes a draft.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate("/campaigns/new")}
                        className="mt-6 border border-[#C8102E] px-5 py-2.5 font-serif text-[#C8102E] hover:bg-[#C8102E]/5"
                    >
                        + New campaign
                    </button>
                </div>
            )}

            {items && items.length > 0 && (
                <ul className="mt-10 space-y-4">
                    {items.map((c) => {
                        const done = c.counts.scheduled + c.counts.published;
                        const pct = c.counts.total ? Math.round((done / c.counts.total) * 100) : 0;
                        const live = c.status === "live";

                        return (
                            <li key={c.id}>
                                <Link
                                    to={`/campaigns/${c.id}`}
                                    className={`block border bg-white p-6 hover:border-black focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${live ? "border-[#C8102E]" : "border-neutral-200"
                                        }`}
                                >
                                    <div className="flex flex-wrap items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-sm text-neutral-500">{formatRange(c.startsOn, c.endsOn)}</span>
                                                <span
                                                    className={`border px-2 py-0.5 text-xs ${live
                                                            ? "border-[#C8102E] text-[#C8102E]"
                                                            : "border-neutral-300 text-neutral-600"
                                                        }`}
                                                >
                                                    {STATUS_LABEL[c.status]}
                                                </span>
                                            </div>
                                            <h2 className="mt-2 font-serif text-3xl text-black">{c.name}</h2>
                                            <p className="mt-1 text-sm text-neutral-500 capitalize">{c.channels.join(", ")}</p>
                                        </div>

                                        <dl className="grid grid-cols-3 gap-6 text-right">
                                            <div>
                                                <dt className="text-xs text-neutral-500">Need work</dt>
                                                <dd className="font-serif text-2xl text-black">{c.counts.needsWork}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-neutral-500">Ready</dt>
                                                <dd className="font-serif text-2xl text-black">{c.counts.ready}</dd>
                                            </div>
                                            <div>
                                                <dt className="text-xs text-neutral-500">Scheduled</dt>
                                                <dd className="font-serif text-2xl text-black">{done}</dd>
                                            </div>
                                        </dl>
                                    </div>

                                    <div className="mt-5 flex items-center gap-4">
                                        <div
                                            className="h-1 flex-1 bg-neutral-200"
                                            role="progressbar"
                                            aria-valuenow={pct}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-label={`${done} of ${c.counts.total} posts scheduled or published`}
                                        >
                                            <div className="h-1 bg-[#C8102E]" style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-sm text-neutral-600">
                                            {done} of {c.counts.total} posts out
                                        </span>
                                    </div>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}