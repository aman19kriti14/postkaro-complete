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

// ---------- option lists (keys must match the backend) ----------

export const SOURCES = [
    { key: "brand_voice", label: "Brand voice" },
    { key: "past_top_posts", label: "Past top posts" },
    { key: "product_list", label: "Product list", soon: true },
    { key: "uploaded_photos", label: "Uploaded photos", soon: true },
] as const;

export const FORMATS = [
    { key: "reel", label: "Reels" },
    { key: "carousel", label: "Carousels" },
    { key: "post", label: "Single posts" },
    { key: "story", label: "Stories" },
] as const;

export const CHANNELS = [
    { key: "instagram", label: "Instagram" },
    { key: "facebook", label: "Facebook" },
    { key: "linkedin", label: "LinkedIn" },
    { key: "youtube", label: "YouTube" },
    { key: "x", label: "X" },
] as const;

export type SourceKey = (typeof SOURCES)[number]["key"];
export type FormatKey = (typeof FORMATS)[number]["key"];
export type ChannelKey = (typeof CHANNELS)[number]["key"];

// ---------- types (match AiStudioDtos.java) ----------

export type IdeaStatus = "ACTIVE" | "DISMISSED" | "DRAFTED";

export interface Idea {
    id: string;
    format: FormatKey;
    channels: string[];
    title: string;
    description: string;
    insight: string | null;
    status: IdeaStatus;
    draftPostId: string | null;
    visualUrl: string | null;
}

export interface IdeaSet {
    id: string;
    name: string;
    brief: string;
    sources: string[];
    formats: string[];
    channels: string[];
    saved: boolean;
    keptCount: number;
    dismissedCount: number;
    ideas: Idea[];
    createdAt: string;
}

export interface SavedSetSummary {
    id: string;
    name: string;
    ideaCount: number;
    updatedAt: string;
}

export interface GenerateInput {
    brief: string;
    sources: string[];
    formats: string[];
    channels: string[];
}

// ---------- calls ----------

const url = (path: string) => `${BASE}/v1/ai-studio${path}`;

export const aiStudioApi = {
    async generate(input: GenerateInput): Promise<IdeaSet> {
        // generation can take 10–20s
        const res = await axios.post(url("/generate"), input, { headers: headers(), timeout: 60_000 });
        return unwrap<IdeaSet>(res.data);
    },

    /** null when the user has never generated */
    async latest(): Promise<IdeaSet | null> {
        const res = await axios.get(url("/latest"), { headers: headers() });
        return res.status === 204 || !res.data ? null : unwrap<IdeaSet>(res.data);
    },

    async savedSets(): Promise<SavedSetSummary[]> {
        const res = await axios.get(url("/sets"), { headers: headers() });
        return unwrap<SavedSetSummary[]>(res.data) ?? [];
    },

    async getSet(id: string): Promise<IdeaSet> {
        const res = await axios.get(url(`/sets/${id}`), { headers: headers() });
        return unwrap<IdeaSet>(res.data);
    },

    async saveSet(id: string, name?: string): Promise<IdeaSet> {
        const res = await axios.post(url(`/sets/${id}/save`), { name: name ?? null }, { headers: headers() });
        return unwrap<IdeaSet>(res.data);
    },

    async restoreDismissed(id: string): Promise<IdeaSet> {
        const res = await axios.post(url(`/sets/${id}/restore`), {}, { headers: headers() });
        return unwrap<IdeaSet>(res.data);
    },

    async dismiss(ideaId: string): Promise<Idea> {
        const res = await axios.post(url(`/ideas/${ideaId}/dismiss`), {}, { headers: headers() });
        return unwrap<Idea>(res.data);
    },

    async draft(ideaId: string): Promise<string> {
        const res = await axios.post(url(`/ideas/${ideaId}/draft`), {}, { headers: headers() });
        return unwrap<{ postId: string }>(res.data).postId;
    },

    async makeVisual(ideaId: string): Promise<Idea> {
        // fal.ai can take a while
        const res = await axios.post(url(`/ideas/${ideaId}/visual`), {}, { headers: headers(), timeout: 90_000 });
        return unwrap<Idea>(res.data);
    },
};

export const apiError = (err: unknown, fallback = "Something went wrong") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;