import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";

export { errorMessage as apiErrorMessage } from "@/features/drafts/api";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

export type PostStatus = "DRAFT" | "NEEDS_REVIEW" | "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED";

export interface CalendarPost {
    postId: string;
    title: string;
    captionPreview: string | null;
    thumbnailUrl: string | null;
    format: string | null;
    stage: string | null;
    channel: string;
    status: PostStatus;
    date: string; // ISO with +05:30
    campaignId: string | null;
    draggable: boolean;
}

export interface CampaignBand {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export interface CadenceGap {
    startDate: string;
    endDate: string;
    days: number;
    channel: string | null;
}

export interface CalendarSummary {
    total: number;
    published: number;
    scheduled: number;
    needsReview: number;
    drafts: number;
    failed: number;
    cadenceGaps: number;
}

export interface CalendarData {
    from: string;
    to: string;
    summary: CalendarSummary;
    posts: CalendarPost[];
    campaigns: CampaignBand[];
    cadenceGaps: CadenceGap[];
}

export interface SidebarCounts {
    calendar: number;
    campaigns: number;
    drafts: number;
    needsReview: number;
}

export const calendarApi = {
    async getMonth(month: string, channel?: string, minGapDays = 3): Promise<CalendarData> {
        const params: Record<string, string | number> = { month, minGapDays };
        if (channel && channel !== "all") params.channel = channel;
        const res = await axios.get(`${BASE}/v1/calendar`, { params, headers: headers() });
        return res.data.data;
    },

    async reschedule(postId: string, date: string, time?: string): Promise<void> {
        await axios.patch(
            `${BASE}/v1/calendar/posts/${postId}/reschedule`,
            { date, time: time ?? null },
            { headers: headers() },
        );
    },

    async approve(postId: string): Promise<void> {
        await axios.post(`${BASE}/v1/calendar/posts/${postId}/approve`, {}, { headers: headers() });
    },

    async sidebarCounts(): Promise<SidebarCounts> {
        const res = await axios.get(`${BASE}/v1/sidebar/counts`, { headers: headers() });
        return res.data.data;
    },
};

// Keeps CalendarPage's existing apiError(err, fallback) calls working
export const apiError = (err: unknown, fallback = "Something went wrong") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;