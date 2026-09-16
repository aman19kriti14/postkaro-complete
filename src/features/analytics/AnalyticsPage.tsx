import { useEffect, useState } from "react";
import { analyticsApi, apiError, type AnalyticsData, type AnalyticsQuery } from "./api";
import { PeriodPicker, ChannelChips, StatCards } from "./AnalyticsTop";
import { ReachChart } from "./ReachChart";
import { TopPosts, ByChannel, DoMoreOf } from "./AnalyticsSections";

export function AnalyticsPage() {
    const [query, setQuery] = useState<AnalyticsQuery>({ period: "30d", channel: "all" });
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Wait until the chosen period has everything it needs
    const ready =
        (query.period !== "campaign" || !!query.campaignId) &&
        (query.period !== "custom" || (!!query.from && !!query.to));

    useEffect(() => {
        if (!ready) return;
        let cancelled = false;
        setLoading(true);
        setError(null);
        analyticsApi
            .get(query)
            .then((d) => !cancelled && setData(d))
            .catch((err) => !cancelled && setError(apiError(err)))
            .finally(() => !cancelled && setLoading(false));
        return () => {
            cancelled = true;
        };
    }, [query, ready]);

    return (
        <div className="p-6 sm:p-10 max-w-[1200px]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                    <p className="text-sm font-medium tracking-[0.18em] uppercase text-primary-500 min-h-5">
                        {data?.periodLabel ?? "\u00A0"}
                    </p>
                    <h1 className="mt-2 text-4xl sm:text-5xl font-[var(--font-display)] text-neutral-900">Analytics</h1>
                </div>
                <PeriodPicker query={query} onChange={setQuery} />
            </div>

            <div className="mt-8 mb-8 h-px bg-neutral-200" />

            <ChannelChips value={query.channel} onChange={(channel) => setQuery({ ...query, channel })} />

            {error && (
                <div className="mt-6 rounded-[var(--radius-md)] border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-primary-600">
                    {error}
                </div>
            )}

            {!data && loading && <AnalyticsSkeleton />}

            {data && (
                <div className={`transition-opacity ${loading ? "opacity-50" : ""}`}>
                    {!data.hasData && (
                        <div className="mt-8 rounded-[var(--radius-md)] border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-600">
                            No synced numbers for this period yet. Reach and engagement fill in a few hours after posts
                            publish on Instagram.
                        </div>
                    )}

                    <div className="mt-8">
                        <StatCards stats={data.stats} channel={query.channel} />
                    </div>

                    <div className="mt-8">
                        <ReachChart chart={data.chart} />
                    </div>

                    <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                        <TopPosts posts={data.topPosts} />
                        <ByChannel rows={data.byChannel} />
                    </div>

                    <div className="mt-8">
                        <DoMoreOf suggestions={data.suggestions} />
                    </div>
                </div>
            )}
        </div>
    );
}

function AnalyticsSkeleton() {
    const block = "bg-neutral-100 rounded-[var(--radius-md)] animate-pulse";
    return (
        <>
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`${block} h-32`} />
                ))}
            </div>
            <div className={`${block} mt-8 h-96`} />
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={`${block} h-96`} />
                <div className={`${block} h-72`} />
            </div>
        </>
    );
}