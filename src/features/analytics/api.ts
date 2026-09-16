import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

// Works whether the backend wraps responses ({ data: ... }) or not
const unwrap = <T,>(body: any): T => (body && "data" in body && body.data !== undefined ? body.data : body);

// ---------- filter options ----------

export type PeriodKey = "7d" | "30d" | "campaign" | "custom";

export const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: "7d", label: "Last 7 days" },
    { key: "30d", label: "Last 30 days" },
    { key: "campaign", label: "This campaign" },
    { key: "custom", label: "Custom" },
];

export const CHANNEL_FILTERS = [
    { key: "all", label: "All channels" },
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "youtube", label: "YouTube" },
    { key: "x", label: "X" },
] as const;

export type ChannelFilter = (typeof CHANNEL_FILTERS)[number]["key"];

// ---------- types (match AnalyticsDtos.java) ----------

export interface AnalyticsStats {
    reach: number;
    reachChangePct: number | null;
    engagementPct: number;
    engagementChangePts: number | null;
    followersGained: number | null;
    followersChange: number | null;
    saves: number;
    savesChange: number | null;
}

export interface ChartPoint {
    label: string;
    start: string; // yyyy-MM-dd
    end: string;
    reach: number;
    engagementPct: number;
}

export interface AnalyticsChart {
    bucket: "day" | "week";
    points: ChartPoint[];
}

export interface TopPost {
    postId: string;
    title: string;
    format: string | null;
    channels: string[];
    publishedAt: string;
    thumbnailUrl: string | null;
    reach: number;
    engagementPct: number;
    note: string | null;
}

export interface ChannelRow {
    channel: string;
    tracked: boolean;
    posts: number;
    reach: number;
    engagementPct: number;
    followersGained: number | null;
}

export interface Suggestion {
    kind: "FORMAT" | "TIMING" | "CHANNEL";
    text: string;
    brief: string;
}

export interface AnalyticsData {
    periodLabel: string;
    from: string;
    to: string;
    channel: string | null;
    stats: AnalyticsStats;
    chart: AnalyticsChart;
    topPosts: TopPost[];
    byChannel: ChannelRow[];
    suggestions: Suggestion[];
    hasData: boolean;
}

export interface AnalyticsQuery {
    period: PeriodKey;
    channel: ChannelFilter;
    campaignId?: string;
    from?: string; // yyyy-MM-dd
    to?: string;
}

export interface CampaignOption {
    id: string;
    name: string;
    startsOn: string | null;
}

// ---------- calls ----------

export const analyticsApi = {
    async get(q: AnalyticsQuery): Promise<AnalyticsData> {
        const params: Record<string, string> = { period: q.period, channel: q.channel };
        if (q.period === "campaign" && q.campaignId) params.campaignId = q.campaignId;
        if (q.period === "custom" && q.from && q.to) {
            params.from = q.from;
            params.to = q.to;
        }
        const res = await axios.get(`${BASE}/v1/analytics`, { params, headers: headers() });
        return unwrap<AnalyticsData>(res.data);
    },

    /** Campaigns for the "This campaign" picker (only ones with a start date) */
    async campaigns(): Promise<CampaignOption[]> {
        const res = await axios.get(`${BASE}/v1/campaigns`, { headers: headers() });
        const list = unwrap<any[]>(res.data) ?? [];
        return list
            .filter((c) => c.startsOn || c.startDate)
            .map((c) => ({ id: c.id, name: c.name, startsOn: c.startsOn ?? c.startDate ?? null }));
    },
};

export const apiError = (err: unknown, fallback = "Couldn't load analytics") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;