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

// ---------- types (match BrandProfileDtos.java) ----------

export type BrandProfileStatus = "IDLE" | "RUNNING" | "READY" | "FAILED";

export interface StarterPrompt {
    title: string;
    prompt: string;
    format: "reel" | "carousel" | "post" | "story";
    pillar?: string;
    why?: string;
}

export interface TopPost {
    platform: string;
    format: string;
    text: string;
    likes: number;
    comments: number;
    shares: number;
    permalink: string | null;
}

export interface FormatStat {
    format: string;
    posts: number;
    avgLikes: number;
    avgComments: number;
}

export interface BrandAnalysis {
    businessSummary?: string;
    offerings?: string[];
    audience?: string;
    differentiators?: string[];
    contentPillars?: { name: string; description: string }[];
    voice?: { tone: string; description: string; wordsToUse: string[]; wordsToAvoid: string[] };
    languages?: string[];
    captionStyle?: { length: string; emojis: string; hashtags: string; callToAction: string };
    signatureHashtags?: string[];
    whatWorks?: string[];
    starterPrompts?: StarterPrompt[];
    detected?: { logoUrl?: string | null; colors?: string[]; ogImage?: string | null; websiteTitle?: string | null };
    topPosts?: TopPost[];
    formatStats?: FormatStat[];
    websiteError?: string;
}

export interface BrandProfile {
    status: BrandProfileStatus;
    statusMessage: string | null;
    websiteUrl: string | null;
    websitePagesRead: number;
    postsRead: number;
    analyzedAt: string | null;
    analysis: BrandAnalysis | null;
}

// ---------- calls ----------

export const brandProfileApi = {
    async get(): Promise<BrandProfile> {
        const res = await axios.get(`${BASE}/v1/brand-profile`, { headers: headers() });
        return unwrap<BrandProfile>(res.data);
    },

    /** Starts (or restarts) the analysis in the background. websiteUrl is optional. */
    async analyze(websiteUrl?: string): Promise<BrandProfile> {
        const res = await axios.post(
            `${BASE}/v1/brand-profile/analyze`,
            { websiteUrl: websiteUrl?.trim() || null },
            { headers: headers() },
        );
        return unwrap<BrandProfile>(res.data);
    },

    /** Copies findings into Settings › Brand. overwrite=false only fills empty fields. */
    async apply(overwrite: boolean): Promise<BrandProfile> {
        const res = await axios.post(`${BASE}/v1/brand-profile/apply`, { overwrite }, { headers: headers() });
        return unwrap<BrandProfile>(res.data);
    },
};

/** Where a starter prompt goes when the user clicks "Use this". */
export const createPostUrl = (p: StarterPrompt) =>
    `/create?prompt=${encodeURIComponent(p.prompt)}&format=${p.format}`;

export const apiError = (err: unknown, fallback = "Something went wrong") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;