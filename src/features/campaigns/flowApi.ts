import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

export type CampaignGroup = "RUNNING" | "UPCOMING" | "UNFINISHED" | "CLOSED";

export interface CampaignListItem {
    id: string;
    name: string;
    group: CampaignGroup;
    startsOn: string | null;
    endsOn: string | null;
    channels: string[];
    currentStep: Step;
    total: number;
    published: number;
    scheduled: number;
    failed: number;
    reach: number | null;
    engagementRate: number | null;
    createdAt: string;
}

export type Step = 1 | 2 | 3 | 4;

export interface FlowPost {
    id: string;
    title: string | null;
    caption: string | null;
    format: string | null;   // reel, carousel, post
    stage: string | null;    // tease, explain, proof, convert
    channels: string[];
    date: string | null;     // yyyy-MM-dd (IST)
    time: string | null;     // HH:mm (IST)
    approved: boolean;
    visualUrl: string | null;
    status: string;
}

export interface CampaignFlow {
    id: string;
    name: string;
    brief: string | null;
    offer: string | null;
    goal: string | null;
    cadence: string | null;
    tone: string | null;
    visuals: string | null;
    look: string | null;
    channels: string[];
    startsOn: string | null;
    endsOn: string | null;
    status: "DRAFT" | "SCHEDULED" | "COMPLETED" | "ARCHIVED";
    currentStep: Step;
    autoPublish: boolean;
    posts: FlowPost[];
}

export type BriefPatch = Partial<Pick<CampaignFlow,
    "name" | "brief" | "offer" | "goal" | "cadence" | "tone" |
    "visuals" | "look" | "channels" | "startsOn" | "endsOn" | "autoPublish">>;

export type PostPatch = Partial<{
    title: string;
    caption: string;
    format: string;
    approved: boolean;
    channels: string[];
    date: string;
    time: string;
    visualUrl: string;
}>;

export interface Check {
    key: string;
    ok: boolean;
    label: string;
    detail: string;
}

export interface Checks {
    items: Check[];
    canPublish: boolean;
}

const url = (id: string, path = "") => `${BASE}/v1/campaigns/${id}${path}`;

export const flowApi = {
    async createDraft(): Promise<CampaignFlow> {
        const res = await axios.post(`${BASE}/v1/campaigns/drafts`, {}, { headers: headers() });
        return res.data.data;
    },

    async get(id: string): Promise<CampaignFlow> {
        const res = await axios.get(url(id, "/flow"), { headers: headers() });
        return res.data.data;
    },

    async saveBrief(id: string, patch: BriefPatch): Promise<CampaignFlow> {
        const res = await axios.patch(url(id, "/brief"), patch, { headers: headers() });
        return res.data.data;
    },

    async saveStep(id: string, step: Step): Promise<void> {
        await axios.patch(url(id, "/step"), { step }, { headers: headers() });
    },

    async generatePlan(id: string): Promise<CampaignFlow> {
        const res = await axios.post(url(id, "/generate-plan"), {}, { headers: headers() });
        return res.data.data;
    },

    async updatePost(id: string, postId: string, patch: PostPatch): Promise<FlowPost> {
        const res = await axios.patch(url(id, `/posts/${postId}`), patch, { headers: headers() });
        return res.data.data;
    },

    async approveAll(id: string): Promise<CampaignFlow> {
        const res = await axios.post(url(id, "/approve-all"), {}, { headers: headers() });
        return res.data.data;
    },

    async checks(id: string): Promise<Checks> {
        const res = await axios.get(url(id, "/checks"), { headers: headers() });
        return res.data.data;
    },

    async publish(id: string): Promise<CampaignFlow> {
        const res = await axios.post(url(id, "/publish"), {}, { headers: headers() });
        return res.data.data;
    },
    async overview(): Promise<CampaignListItem[]> {
        const res = await axios.get(`${BASE}/v1/campaigns/overview`, { headers: headers() });
        return res.data?.data ?? [];
    },

    async duplicate(id: string): Promise<CampaignFlow> {
        const res = await axios.post(url(id, "/duplicate"), {}, { headers: headers() });
        return res.data.data;
    },
};

export const flowError = (err: unknown, fallback = "Something went wrong") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;

