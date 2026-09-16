import { useEffect, useState } from "react";
import {
    PERIODS,
    CHANNEL_FILTERS,
    analyticsApi,
    type AnalyticsQuery,
    type AnalyticsStats,
    type CampaignOption,
    type PeriodKey,
    type ChannelFilter,
} from "./api";
import { compact, signedPct, signedInt } from "@/features/dashboard/format";

const btnBase = "h-11 px-5 rounded-[var(--radius-md)] border text-sm transition-colors cursor-pointer whitespace-nowrap";
const on = "border-primary-500 bg-primary-50 text-primary-500";
const off = "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300";

// ---------- period picker ----------

export function PeriodPicker({
    query,
    onChange,
}: {
    query: AnalyticsQuery;
    onChange: (q: AnalyticsQuery) => void;
}) {
    const [campaigns, setCampaigns] = useState<CampaignOption[] | null>(null);
    const [from, setFrom] = useState(query.from ?? "");
    const [to, setTo] = useState(query.to ?? "");

    // load campaigns the first time "This campaign" is picked
    useEffect(() => {
        if (query.period !== "campaign" || campaigns) return;
        analyticsApi
            .campaigns()
            .then((list) => {
                setCampaigns(list);
                if (!query.campaignId && list[0]) onChange({ ...query, campaignId: list[0].id });
            })
            .catch(() => setCampaigns([]));
    }, [query.period]); // eslint-disable-line react-hooks/exhaustive-deps

    const pick = (period: PeriodKey) => {
        if (period === "custom") {
            // don't fetch until both dates are set
            onChange({ ...query, period, from: from || undefined, to: to || undefined });
            return;
        }
        onChange({ ...query, period });
    };

    const applyCustom = () => {
        if (from && to && to >= from) onChange({ ...query, period: "custom", from, to });
    };

    return (
        <div className="flex flex-col items-start lg:items-end gap-3">
            <div className="flex flex-wrap gap-2">
                {PERIODS.map((p) => (
                    <button
                        key={p.key}
                        onClick={() => pick(p.key)}
                        className={`${btnBase} ${query.period === p.key ? on : off}`}
                    >
                        {p.label}
                    </button>
                ))}
            </div>

            {query.period === "campaign" && (
                <div>
                    {campaigns === null ? (
                        <p className="text-sm text-neutral-500">Loading campaigns…</p>
                    ) : campaigns.length === 0 ? (
                        <p className="text-sm text-neutral-500">No campaigns with dates yet.</p>
                    ) : (
                        <select
                            value={query.campaignId ?? ""}
                            onChange={(e) => onChange({ ...query, campaignId: e.target.value })}
                            className="h-11 min-w-56 rounded-[var(--radius-md)] border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus:outline-none focus:border-primary-500"
                        >
                            {campaigns.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    )}
                </div>
            )}

            {query.period === "custom" && (
                <div className="flex flex-wrap items-center gap-2">
                    <input
                        type="date"
                        value={from}
                        max={to || undefined}
                        onChange={(e) => setFrom(e.target.value)}
                        className="h-11 rounded-[var(--radius-md)] border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <span className="text-neutral-400">–</span>
                    <input
                        type="date"
                        value={to}
                        min={from || undefined}
                        onChange={(e) => setTo(e.target.value)}
                        className="h-11 rounded-[var(--radius-md)] border border-neutral-200 bg-white px-3 text-sm focus:outline-none focus:border-primary-500"
                    />
                    <button
                        onClick={applyCustom}
                        disabled={!from || !to || to < from}
                        className={`${btnBase} border-primary-500 text-primary-500 hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                        Apply
                    </button>
                </div>
            )}
        </div>
    );
}

// ---------- channel chips ----------

export function ChannelChips({
    value,
    onChange,
}: {
    value: ChannelFilter;
    onChange: (c: ChannelFilter) => void;
}) {
    return (
        <div className="flex flex-wrap gap-2">
            {CHANNEL_FILTERS.map((c) => (
                <button
                    key={c.key}
                    onClick={() => onChange(c.key)}
                    className={`${btnBase} ${value === c.key ? on : off}`}
                >
                    {c.label}
                </button>
            ))}
        </div>
    );
}

// ---------- stat cards ----------

export function StatCards({ stats, channel }: { stats: AnalyticsStats; channel: ChannelFilter }) {
    const followersApply = channel === "all" || channel === "instagram";

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
                label="Reach"
                value={compact(stats.reach)}
                sub={stats.reachChangePct === null ? null : `${signedPct(stats.reachChangePct)} vs previous`}
                up={(stats.reachChangePct ?? 0) > 0}
            />
            <Card
                label="Engagement"
                value={`${stats.engagementPct.toFixed(1)}%`}
                sub={stats.engagementChangePts === null ? null : `${signedPts(stats.engagementChangePts)} pts`}
                up={(stats.engagementChangePts ?? 0) > 0}
            />
            <Card
                label="Followers gained"
                value={!followersApply ? "—" : stats.followersGained === null ? "—" : signedIntPlain(stats.followersGained)}
                sub={
                    !followersApply
                        ? "Not tracked for this channel"
                        : stats.followersGained === null
                            ? "Tracking started, check back tomorrow"
                            : stats.followersChange === null
                                ? null
                                : `${signedInt(stats.followersChange)} vs previous`
                }
                up={(stats.followersChange ?? 0) > 0}
                muted={!followersApply || stats.followersGained === null}
            />
            <Card
                label="Saves"
                value={stats.saves.toLocaleString("en-IN")}
                sub={stats.savesChange === null ? null : `${signedInt(stats.savesChange)} vs previous`}
                up={(stats.savesChange ?? 0) > 0}
            />
        </div>
    );
}

function Card({
    label,
    value,
    sub,
    up,
    muted = false,
}: {
    label: string;
    value: string;
    sub: string | null;
    up: boolean;
    muted?: boolean;
}) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-5">
            <p className="text-xs font-medium tracking-[0.15em] uppercase text-neutral-500">{label}</p>
            <p className={`mt-3 text-4xl font-[var(--font-display)] ${muted ? "text-neutral-400" : "text-neutral-900"}`}>
                {value}
            </p>
            <p className={`mt-2 text-sm min-h-5 ${up && !muted ? "text-primary-500" : "text-neutral-500"}`}>
                {sub ?? "\u00A0"}
            </p>
        </div>
    );
}

// ---------- helpers ----------

/** 0.6 -> "+0.6", -1.2 -> "−1.2" */
function signedPts(v: number): string {
    if (v > 0) return `+${v.toFixed(1)}`;
    if (v < 0) return `−${Math.abs(v).toFixed(1)}`;
    return "0.0";
}

/** followers gained can be negative; show the sign only when it is */
function signedIntPlain(v: number): string {
    return v < 0 ? `−${Math.abs(v).toLocaleString("en-IN")}` : v.toLocaleString("en-IN");
}