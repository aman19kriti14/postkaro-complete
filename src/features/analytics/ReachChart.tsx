import type { AnalyticsChart } from "./api";
import { compact } from "@/features/dashboard/format";

const BAR_AREA = 260; // px, tallest bar

export function ReachChart({ chart }: { chart: AnalyticsChart }) {
    const points = chart.points;
    const maxReach = Math.max(0, ...points.map((p) => p.reach));
    const maxEng = Math.max(0, ...points.map((p) => p.engagementPct));
    const empty = maxReach === 0;

    // daily 30-point charts would be too dense for labels on every bar
    const dense = points.length > 10;

    return (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-6 border-b border-neutral-100">
                <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">Reach over the period</h2>
                <div className="flex flex-wrap items-center gap-5 text-sm text-neutral-600">
                    <span className="flex items-center gap-2">
                        <span className="inline-block w-5 h-3 rounded-sm border border-primary-500 bg-primary-50" />
                        Reach
                    </span>
                    <span className="flex items-center gap-2">
                        <span className="inline-block w-5 h-0.5 bg-neutral-900" />
                        Engagement rate
                    </span>
                </div>
            </div>

            {empty ? (
                <div className="h-[260px] flex items-center justify-center text-center">
                    <p className="max-w-sm text-neutral-500">
                        No reach recorded for this period yet. Numbers appear once your published posts sync with
                        Instagram.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <div
                        className="flex items-end justify-around gap-2 min-w-full"
                        style={{ minWidth: points.length * (dense ? 28 : 64) }}
                    >
                        {points.map((p, i) => {
                            const barH = maxReach > 0 ? Math.max(p.reach > 0 ? 6 : 2, (p.reach / maxReach) * BAR_AREA) : 2;
                            // engagement tick scaled to the same area, independent of reach
                            const tickY = maxEng > 0 && p.reach > 0 ? (p.engagementPct / maxEng) * BAR_AREA : null;
                            // last bucket is the strongest shade, like the design
                            const isLast = i === points.length - 1;

                            return (
                                <div
                                    key={p.start}
                                    className="flex flex-1 flex-col items-center"
                                    title={`${p.label}: ${compact(p.reach)} reach · ${p.engagementPct.toFixed(1)}% eng.`}
                                >
                                    {!dense && (
                                        <span className="mb-3 text-sm tabular-nums text-neutral-600">
                                            {p.reach > 0 ? compact(p.reach) : "\u00A0"}
                                        </span>
                                    )}

                                    <div className="relative w-full flex justify-center" style={{ height: BAR_AREA }}>
                                        <div
                                            className={`absolute bottom-0 w-[40%] max-w-[76px] rounded-t-sm border border-primary-500 ${isLast ? "bg-primary-100" : "bg-primary-50"
                                                }`}
                                            style={{ height: barH }}
                                        />
                                        {tickY !== null && (
                                            <div
                                                className="absolute w-[48%] max-w-[88px] h-[3px] bg-neutral-900"
                                                style={{ bottom: tickY }}
                                            />
                                        )}
                                    </div>

                                    <span className="mt-3 text-sm text-neutral-500 whitespace-nowrap">
                                        {dense && i % 3 !== 0 ? "\u00A0" : p.label}
                                    </span>
                                    {!dense && (
                                        <span className="mt-2 text-sm tabular-nums text-neutral-900">
                                            {p.reach > 0 ? `${p.engagementPct.toFixed(1)}%` : "—"}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}