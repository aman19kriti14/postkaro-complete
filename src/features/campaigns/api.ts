import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";
import type { CampaignBrief, CampaignDetail, CampaignSummary, PlanItem } from "./types";

export { errorMessage } from "@/features/drafts/api";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

export const campaignsApi = {
    async list(): Promise<CampaignSummary[]> {
        const res = await axios.get(`${BASE}/v1/campaigns`, { headers: headers() });
        return res.data?.data ?? [];
    },
    async generateImage(prompt: string): Promise<string> {
        const res = await axios.post(
            `${BASE}/v1/posts/generate-image`,
            { prompt, size: "square" },
            { headers: headers() },
        );
        return res.data.data.url;
    },

    async get(id: string): Promise<CampaignDetail> {
        const res = await axios.get(`${BASE}/v1/campaigns/${id}`, { headers: headers() });
        return res.data.data;
    },

    async plan(brief: CampaignBrief): Promise<PlanItem[]> {
        const res = await axios.post(`${BASE}/v1/campaigns/plan`, brief, { headers: headers() });
        return res.data.data;
    },

    async create(brief: CampaignBrief, items: PlanItem[]): Promise<{ id: string; name: string }> {
        const res = await axios.post(
            `${BASE}/v1/campaigns`,
            { ...brief, items },
            { headers: headers() },
        );
        return res.data.data;
    },

    // Platforms the user has connected, e.g. ["instagram"]
    async connectedChannels(): Promise<string[]> {
        const res = await axios.get(`${BASE}/v1/auth/me`, { headers: headers() });
        const accounts: { platform: string }[] = res.data?.data?.connectedAccounts ?? [];
        return [...new Set(accounts.map((a) => a.platform))];
    },
    // Saves a draft's planned time; it stays a draft until scheduled
    async setPlannedTime(postId: string, at: Date): Promise<void> {
        await axios.put(
            `${BASE}/v1/posts/${postId}`,
            { plannedAt: at.toISOString() },
            { headers: headers() },
        );
    },
    // Scheduled -> Draft; keeps the time so it can be rescheduled
    async unschedulePost(postId: string): Promise<void> {
        await axios.post(`${BASE}/v1/posts/${postId}/unschedule`, {}, { headers: headers() });
    },

    // Drafts, scheduled and failed posts only; published ones are refused (409)
    async deletePost(postId: string): Promise<void> {
        await axios.delete(`${BASE}/v1/posts/${postId}`, { headers: headers() });
    },

    // Nothing else publishes; scheduled posts go back to Draft
    async stopCampaign(id: string): Promise<{ unscheduled: number; stillPublishing: number }> {
        const res = await axios.post(`${BASE}/v1/campaigns/${id}/stop`, {}, { headers: headers() });
        return res.data.data;
    },

    // Deletes the campaign and its unpublished posts; published posts are kept
    async deleteCampaign(id: string): Promise<{ deletedPosts: number; keptPublished: number }> {
        const res = await axios.delete(`${BASE}/v1/campaigns/${id}`, { headers: headers() });
        return res.data.data;
    },
};