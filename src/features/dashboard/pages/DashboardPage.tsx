import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/stores/auth.store";
import {
    dashboardApi,
    apiError,
    type DashboardData,
    type UpNextStatus,
    type CampaignCardStatus,
} from "@/features/dashboard/api";
import {
    headerDate,
    greeting,
    slotLabel,
    channelLine,
    channelLabel,
    statusLabel,
    compact,
    signedPct,
    signedInt,
    dateRange,
    progressPct,
} from "@/features/dashboard/format";

// ⚠️ adjust to your router paths
const ROUTES = {
    calendar: "/calendar",
    campaigns: "/campaigns",
    campaign: (id: string) => `/campaigns/${id}`,
    analytics: "/analytics",
    post: (id: string) => `/create?draft=${id}`,
    create: "/create",
};

// ---------- small building blocks ----------

const card = "rounded-[var(--radius-lg)] border border-neutral-200 bg-white";

function Badge({ status }: { status: UpNextStatus | CampaignCardStatus }) {
    const accent = status === "SCHEDULED" || status === "LIVE";
    return (
        <span
            className={`inline-block text-[11px] font-medium tracking-[0.12em] uppercase px-2 py-0.5 rounded-[var(--radius-sm)] border ${accent ? "border-primary-500 text-primary-500" : "border-neutral-300 text-neutral-500"
                }`}
        >
            {statusLabel(status)}
        </span>
    );
}

function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
    return (
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
            <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">{title}</h2>
            {action && (
                <button
                    onClick={onAction}
                    className="text-sm font-medium text-primary-500 hover:text-primary-600 cursor-pointer"
                >
                    {action}
                </button>
            )}
        </div>
    );
}

function StatCard({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: string;
    sub: string | null;
    accent: boolean;
}) {
    return (
        <div className={`${card} p-5`}>
            <p className="text-xs font-medium tracking-[0.15em] uppercase text-neutral-500">{label}</p>
            <p className="mt-3 text-4xl font-[var(--font-display)] text-neutral-900">{value}</p>
            <p className={`mt-2 text-sm min-h-5 ${accent ? "text-primary-500" : "text-neutral-500"}`}>
                {sub ?? "\u00A0"}
            </p>
        </div>
    );
}

// ---------- page ----------

export function DashboardPage() {
    const navigate = useNavigate();
    const storeName = useAuthStore((s) => s.user?.fullName?.split(" ")[0]);

    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setData(await dashboardApi.get());
        } catch (err) {
            setError(apiError(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const firstName = data?.firstName ?? storeName ?? "there";

    return (
        <div className="p-6 sm:p-10 max-w-[1200px]">
            {/* Header — renders instantly, no need to wait for the API */}
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-medium tracking-[0.15em] uppercase text-primary-500">
                        {headerDate()}
                    </p>
                    <h1 className="mt-2 text-4xl sm:text-5xl font-[var(--font-display)] text-neutral-900">
                        {greeting()}, {firstName}.
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => navigate(`${ROUTES.calendar}?view=week`)}
                        className="h-11 px-5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                        This week
                    </button>
                    <button
                        onClick={() => navigate(ROUTES.calendar)}
                        className="h-11 px-5 rounded-[var(--radius-md)] border border-primary-500 bg-white text-sm text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
                    >
                        Open calendar
                    </button>
                </div>
            </div>

            <div className="mt-8 h-px bg-neutral-200" />

            {error && (
                <div className={`${card} mt-8 p-5 flex items-center justify-between`}>
                    <p className="text-sm text-neutral-700">{error}</p>
                    <button onClick={load} className="text-sm font-medium text-primary-500 cursor-pointer">
                        Try again
                    </button>
                </div>
            )}

            {loading && !data && <DashboardSkeleton />}

            {data && (
                <>
                    {/* Stats */}
                    <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <StatCard
                            label="Scheduled"
                            value={String(data.stats.scheduledNext7Days)}
                            sub="next 7 days"
                            accent={false}
                        />
                        <StatCard
                            label="Published"
                            value={String(data.stats.publishedThisMonth)}
                            sub={`${signedInt(data.stats.publishedDelta)} vs last month`}
                            accent={data.stats.publishedDelta > 0}
                        />
                        <StatCard
                            label="Reach"
                            value={compact(data.stats.reach)}
                            sub={data.stats.reachChangePct === null ? null : signedPct(data.stats.reachChangePct)}
                            accent={(data.stats.reachChangePct ?? 0) > 0}
                        />
                        <StatCard
                            label="Engagement"
                            value={`${data.stats.engagementPct.toFixed(1)}%`}
                            sub={data.stats.engagementChange === null ? null : signedPct(data.stats.engagementChange)}
                            accent={(data.stats.engagementChange ?? 0) > 0}
                        />
                    </div>

                    {/* Two columns */}
                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        {/* Up next */}
                        <div className={`${card} p-6`}>
                            <SectionHeader title="Up next" action="See queue" onAction={() => navigate(ROUTES.calendar)} />

                            {data.upNext.length === 0 ? (
                                <EmptyLine
                                    text="Nothing scheduled yet."
                                    action="Create a post"
                                    onAction={() => navigate(ROUTES.create)}
                                />
                            ) : (
                                <div className="space-y-6">
                                    {data.upNext.map((item) => {
                                        const slot = slotLabel(item.scheduledAt);
                                        return (
                                            <button
                                                key={item.id}
                                                onClick={() => navigate(ROUTES.post(item.id))}
                                                className="w-full flex gap-5 text-left cursor-pointer group"
                                            >
                                                <div className="w-14 shrink-0 text-center">
                                                    <p className="text-xl font-[var(--font-display)] text-neutral-900 tabular-nums">
                                                        {slot.time}
                                                    </p>
                                                    <p className="text-[11px] tracking-[0.12em] text-neutral-500">
                                                        {slot.day}
                                                    </p>
                                                </div>
                                                <div className="flex-1 min-w-0 pl-5 border-l border-neutral-200">
                                                    <p className="text-base text-neutral-900 group-hover:text-primary-500 transition-colors">
                                                        {item.title}
                                                    </p>
                                                    <div className="mt-2 flex flex-wrap items-center gap-3">
                                                        <span className="text-sm text-neutral-500">
                                                            {channelLine(item.channels, item.format)}
                                                        </span>
                                                        <Badge status={item.status} />
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* What's working */}
                        <div className={`${card} p-6`}>
                            <SectionHeader title="What's working" action="Analytics" onAction={() => navigate(ROUTES.analytics)} />
                            <WeekBars week={data.whatsWorking.week} />

                            <div className="mt-6 pt-5 border-t border-neutral-100 space-y-4">
                                {!data.whatsWorking.topByReach && !data.whatsWorking.topByEngagement ? (
                                    <p className="text-sm text-neutral-500">
                                        Your top posts show up here once Instagram insights sync.
                                    </p>
                                ) : (
                                    <>
                                        {data.whatsWorking.topByReach && (
                                            <TopRow
                                                title={data.whatsWorking.topByReach.title}
                                                metric={`${compact(data.whatsWorking.topByReach.reach)} reach`}
                                            />
                                        )}
                                        {data.whatsWorking.topByEngagement && (
                                            <TopRow
                                                title={data.whatsWorking.topByEngagement.title}
                                                metric={`${data.whatsWorking.topByEngagement.engagementPct.toFixed(1)}% eng.`}
                                            />
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Active campaigns */}
                    <div className={`${card} mt-8 p-6`}>
                        <SectionHeader
                            title="Active campaigns"
                            action="All campaigns"
                            onAction={() => navigate(ROUTES.campaigns)}
                        />

                        {data.campaigns.length === 0 ? (
                            <EmptyLine
                                text="No active campaigns."
                                action="Plan a campaign"
                                onAction={() => navigate(ROUTES.campaigns)}
                            />
                        ) : (
                            <div className="space-y-4">
                                {data.campaigns.map((c) => (
                                    <div
                                        key={c.id}
                                        className="rounded-[var(--radius-md)] border border-neutral-200 p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-5 items-center"
                                    >
                                        <div className="min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <h3 className="text-xl font-[var(--font-display)] text-neutral-900">
                                                    {c.name}
                                                </h3>
                                                <Badge status={c.status} />
                                            </div>
                                            <p className="mt-1 text-sm text-neutral-500">
                                                {[dateRange(c.startsOn, c.endsOn), ...[...c.channels].sort().map(channelLabel)].join(" · ")}
                                            </p>
                                        </div>

                                        <div>
                                            <div className="h-1 rounded-full bg-neutral-100 overflow-hidden">
                                                <div
                                                    className="h-full bg-primary-500 transition-all"
                                                    style={{ width: `${progressPct(c.readyPosts, c.totalPosts)}%` }}
                                                />
                                            </div>
                                            <p className="mt-2 text-sm text-neutral-500">
                                                {c.totalPosts === 0
                                                    ? "No posts yet"
                                                    : `${c.readyPosts} of ${c.totalPosts} posts ready`}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => navigate(ROUTES.campaign(c.id))}
                                            className="h-11 px-6 rounded-[var(--radius-md)] border border-primary-500 text-sm text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer justify-self-start md:justify-self-end"
                                        >
                                            Open
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}

// ---------- sections ----------

function WeekBars({ week }: { week: DashboardData["whatsWorking"]["week"] }) {
    const max = Math.max(...week.map((d) => d.reach), 0);
    return (
        <div className="h-56 flex items-end justify-between gap-3 px-2">
            {week.map((d) => {
                // empty days show a thin baseline, like the design
                const h = max > 0 && d.reach > 0 ? Math.max(6, (d.reach / max) * 180) : 3;
                return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-3" title={`${compact(d.reach)} reach`}>
                        <div className="w-full max-w-[52px] bg-primary-500 rounded-t-sm" style={{ height: `${h}px` }} />
                        <span className="text-sm text-neutral-500">{d.label}</span>
                    </div>
                );
            })}
        </div>
    );
}

function TopRow({ title, metric }: { title: string; metric: string }) {
    return (
        <div className="flex items-center justify-between gap-4">
            <span className="text-base text-neutral-900 truncate">{title}</span>
            <span className="text-base text-primary-500 shrink-0">{metric}</span>
        </div>
    );
}

function EmptyLine({ text, action, onAction }: { text: string; action: string; onAction: () => void }) {
    return (
        <div className="py-6 flex items-center justify-between">
            <p className="text-sm text-neutral-500">{text}</p>
            <button onClick={onAction} className="text-sm font-medium text-primary-500 cursor-pointer">
                {action}
            </button>
        </div>
    );
}

function DashboardSkeleton() {
    const block = "bg-neutral-100 rounded-[var(--radius-md)] animate-pulse";
    return (
        <>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`${block} h-32`} />
                ))}
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${block} h-96`} />
                <div className={`${block} h-96`} />
            </div>
            <div className={`${block} mt-8 h-72`} />
        </>
    );
}