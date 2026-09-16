import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { flowApi, flowError } from "./flowApi";
import type { CampaignGroup, CampaignListItem } from "./flowApi";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PLATFORM_LABEL: Record<string, string> = {
    instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn",
    youtube: "YouTube", twitter: "X", x: "X", whatsapp: "WhatsApp",
};

const GROUPS: { key: CampaignGroup; label: string }[] = [
    { key: "RUNNING", label: "Running" },
    { key: "UPCOMING", label: "Upcoming" },
    { key: "UNFINISHED", label: "Unfinished" },
    { key: "CLOSED", label: "Closed" },
];

type Filter = "ALL" | CampaignGroup;
type Sort = "newest" | "soonest" | "name";

const SORT_LABEL: Record<Sort, string> = {
    newest: "Newest first",
    soonest: "Starting soonest",
    name: "Name A–Z",
};

const part = (d: string) => ({
    day: Number(d.slice(8, 10)),
    month: MONTHS[Number(d.slice(5, 7)) - 1] ?? "",
    year: d.slice(0, 4),
});

function windowLabel(a: string | null, b: string | null) {
    if (!a || !b) return "Dates not set";
    const s = part(a);
    const e = part(b);
    if (s.year !== e.year) return `${s.day} ${s.month} ${s.year} – ${e.day} ${e.month} ${e.year}`;
    if (s.month !== e.month) return `${s.day} ${s.month} – ${e.day} ${e.month} ${e.year}`;
    return `${s.day}–${e.day} ${e.month} ${e.year}`;
}

const compact = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K` : String(n);

function progress(c: CampaignListItem): { ratio: number; text: string } {
    if (c.group === "UNFINISHED") {
        return {
            ratio: c.currentStep / 4,
            text: `Step ${c.currentStep} of 4${c.total > 0 ? ` · ${c.total} posts planned` : ""}`,
        };
    }
    const ratio = c.total > 0 ? c.published / c.total : 0;
    if (c.group === "UPCOMING") return { ratio: 0, text: `${c.total} ${c.total === 1 ? "post" : "posts"} scheduled` };
    if (c.total > 0 && c.published === c.total) return { ratio: 1, text: `All ${c.total} posts published` };
    const failed = c.failed > 0 ? ` · ${c.failed} failed` : "";
    return { ratio, text: `${c.published} of ${c.total} published${failed}` };
}

export default function CampaignsPage() {
    const navigate = useNavigate();
    const [items, setItems] = useState<CampaignListItem[] | null>(null);
    const [filter, setFilter] = useState<Filter>("ALL");
    const [sort, setSort] = useState<Sort>("newest");
    const [busyId, setBusyId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        flowApi
            .overview()
            .then(setItems)
            .catch((err) => {
                setItems([]);
                setError(flowError(err, "Couldn't load campaigns"));
            });
    }, []);

    const counts = useMemo(() => {
        const out: Record<Filter, number> = { ALL: 0, RUNNING: 0, UPCOMING: 0, UNFINISHED: 0, CLOSED: 0 };
        for (const c of items ?? []) {
            out.ALL++;
            out[c.group]++;
        }
        return out;
    }, [items]);

    const sorted = useMemo(() => {
        const list = [...(items ?? [])];
        if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
        else if (sort === "soonest")
            list.sort((a, b) => (a.startsOn ?? "9999").localeCompare(b.startsOn ?? "9999"));
        else list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return list;
    }, [items, sort]);

    const sections = GROUPS
        .filter((g) => filter === "ALL" || filter === g.key)
        .map((g) => ({ ...g, list: sorted.filter((c) => c.group === g.key) }))
        .filter((s) => s.list.length > 0);

    const cycleSort = () =>
        setSort((s) => (s === "newest" ? "soonest" : s === "soonest" ? "name" : "newest"));

    async function duplicate(id: string) {
        setBusyId(id);
        setError(null);
        try {
            const copy = await flowApi.duplicate(id);
            navigate(`/campaigns/${copy.id}/build`);
        } catch (err) {
            setError(flowError(err, "Couldn't duplicate this campaign"));
            setBusyId(null);
        }
    }

    const summary = [
        counts.RUNNING && `${counts.RUNNING} running`,
        counts.UPCOMING && `${counts.UPCOMING} upcoming`,
        counts.UNFINISHED && `${counts.UNFINISHED} unfinished`,
    ].filter(Boolean).join(" · ");

    const primaryBtn =
        "border border-[#C8102E] px-6 py-3 font-serif text-lg text-[#C8102E] hover:bg-[#C8102E]/5 disabled:opacity-40";
    const secondaryBtn =
        "border border-neutral-300 px-6 py-3 font-serif text-lg text-neutral-800 hover:border-black disabled:opacity-40";

    return (
        <div className="min-h-screen bg-neutral-100 px-6 py-10 lg:px-10">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 pb-8">
                <div>
                    {summary && (
                        <p className="font-serif text-sm uppercase tracking-[0.2em] text-[#C8102E]">{summary}</p>
                    )}
                    <h1 className="mt-2 font-serif text-5xl text-black">Campaigns</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={cycleSort} className={`${secondaryBtn} bg-white`}>
                        Sort: {SORT_LABEL[sort]}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/campaigns/new")}
                        className={`${primaryBtn} flex items-center gap-2 bg-white`}
                    >
                        <Plus className="h-5 w-5" />
                        New campaign
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-8 flex flex-wrap gap-3">
                {([{ key: "ALL", label: "All" }, ...GROUPS] as { key: Filter; label: string }[]).map((f) => (
                    <button
                        key={f.key}
                        type="button"
                        onClick={() => setFilter(f.key)}
                        aria-pressed={filter === f.key}
                        className={`border px-6 py-3 font-serif text-lg ${filter === f.key
                                ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                : "border-neutral-300 text-neutral-700 hover:border-black"
                            }`}
                    >
                        {f.label}&nbsp;&nbsp;<span className="text-neutral-500">{counts[f.key]}</span>
                    </button>
                ))}
            </div>

            {error && (
                <p role="alert" className="mt-6 border-l-2 border-[#C8102E] bg-white px-4 py-3 text-sm text-black">
                    {error}
                </p>
            )}

            {/* Lists */}
            {items === null ? (
                <p className="mt-10 font-serif text-neutral-600">Loading campaigns…</p>
            ) : sections.length === 0 ? (
                <div className="mt-10 border border-neutral-200 bg-white p-10 text-center">
                    <p className="font-serif text-2xl text-black">
                        {filter === "ALL" ? "No campaigns yet" : "Nothing here"}
                    </p>
                    <p className="mt-2 font-serif text-neutral-600">
                        Set a brief and Postkaro drafts the posts for you.
                    </p>
                    <button type="button" onClick={() => navigate("/campaigns/new")} className={`${primaryBtn} mt-6`}>
                        Start a campaign
                    </button>
                </div>
            ) : (
                sections.map((s) => (
                    <section key={s.key} className="mt-10">
                        <div className="mb-5 flex items-center gap-5">
                            <h2 className="font-serif text-3xl text-black">{s.label}</h2>
                            <div className="h-px flex-1 bg-neutral-300" />
                            <span className="font-serif text-lg text-neutral-600">
                                {s.list.length} {s.list.length === 1 ? "campaign" : "campaigns"}
                            </span>
                        </div>

                        <div className="space-y-5">
                            {s.list.map((c) => {
                                const p = progress(c);
                                const channels = c.channels.map((ch) => PLATFORM_LABEL[ch] ?? ch).join(" · ");
                                const live = c.group === "RUNNING";

                                return (
                                    <article
                                        key={c.id}
                                        className="grid items-center gap-6 border border-neutral-200 bg-white p-7 lg:grid-cols-[1.3fr_1fr_auto_auto]"
                                    >
                                        {/* Name + meta */}
                                        <div>
                                            <h3 className="font-serif text-3xl text-black">{c.name}</h3>
                                            <span
                                                className={`mt-3 inline-block border px-3 py-1 font-serif text-sm uppercase tracking-[0.15em] ${live
                                                        ? "border-[#C8102E] text-[#C8102E]"
                                                        : "border-neutral-300 text-neutral-600"
                                                    }`}
                                            >
                                                {s.label}
                                            </span>
                                            <p className="mt-3 font-serif text-lg leading-relaxed text-neutral-700">
                                                {windowLabel(c.startsOn, c.endsOn)}
                                                {channels && ` · ${channels}`}
                                            </p>
                                        </div>

                                        {/* Progress */}
                                        <div>
                                            <div className="h-1.5 w-full bg-neutral-200">
                                                <div
                                                    className="h-full bg-[#9B1B30]"
                                                    style={{ width: `${Math.round(p.ratio * 100)}%` }}
                                                />
                                            </div>
                                            <p className="mt-3 font-serif text-lg text-neutral-700">{p.text}</p>
                                        </div>

                                        {/* Metrics */}
                                        <div className="flex gap-8">
                                            {c.group === "UNFINISHED" ? (
                                                <span />
                                            ) : (
                                                [
                                                    ["Reach", c.reach != null ? compact(c.reach) : "—"],
                                                    ["Engagement", c.engagementRate != null ? `${c.engagementRate.toFixed(1)}%` : "—"],
                                                ].map(([label, value]) => (
                                                    <div key={label}>
                                                        <p className="font-serif text-sm uppercase tracking-[0.2em] text-neutral-600">
                                                            {label}
                                                        </p>
                                                        <p className="mt-1 font-serif text-3xl tabular-nums text-neutral-800">
                                                            {value}
                                                        </p>
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex flex-wrap gap-3">
                                            {c.group === "UNFINISHED" ? (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/campaigns/${c.id}/build`)}
                                                    className={primaryBtn}
                                                >
                                                    Resume · Step {c.currentStep}
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/campaigns/${c.id}`)}
                                                    className={primaryBtn}
                                                >
                                                    {c.group === "CLOSED" ? "View report" : "Open campaign"}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => duplicate(c.id)}
                                                disabled={busyId !== null}
                                                className={secondaryBtn}
                                            >
                                                {busyId === c.id ? "Duplicating…" : "Duplicate"}
                                            </button>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                ))
            )}
        </div>
    );
}