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

// ---------- types (match BrandDtos.java) ----------

export interface BrandSettings {
    workspaceName: string;
    logoUrl: string | null;
    colors: string[];
    headingFont: string | null;
    bodyFont: string | null;
    tone: string;
    languages: string[];
    voiceDescription: string | null;
    wordsToUse: string | null;
    wordsToAvoid: string | null;
    samplePosts: string[];
    updatedAt: string | null;
}

/** What "Save changes" sends: everything except the read-only fields */
export type BrandUpdate = Omit<BrandSettings, "workspaceName" | "updatedAt">;

export interface BrandOptions {
    tones: string[];
    languages: string[];
    fonts: string[];
}

// Display labels (backend sends lowercase keys)
export const TONE_LABELS: Record<string, string> = {
    warm: "Warm",
    playful: "Playful",
    informative: "Informative",
    festive: "Festive",
    plain: "Plain",
};

export const LANGUAGE_LABELS: Record<string, string> = {
    english: "English",
    hindi: "Hindi",
    hinglish: "Hinglish",
};

export const toUpdate = (b: BrandSettings): BrandUpdate => ({
    logoUrl: b.logoUrl,
    colors: b.colors,
    headingFont: b.headingFont,
    bodyFont: b.bodyFont,
    tone: b.tone,
    languages: b.languages,
    voiceDescription: b.voiceDescription,
    wordsToUse: b.wordsToUse,
    wordsToAvoid: b.wordsToAvoid,
    samplePosts: b.samplePosts,
});

// ---------- calls ----------

export const settingsApi = {
    async getBrand(): Promise<BrandSettings> {
        const res = await axios.get(`${BASE}/v1/settings/brand`, { headers: headers() });
        return unwrap<BrandSettings>(res.data);
    },

    async saveBrand(body: BrandUpdate): Promise<BrandSettings> {
        const res = await axios.put(`${BASE}/v1/settings/brand`, body, { headers: headers() });
        return unwrap<BrandSettings>(res.data);
    },

    async brandOptions(): Promise<BrandOptions> {
        const res = await axios.get(`${BASE}/v1/settings/brand/options`, { headers: headers() });
        return unwrap<BrandOptions>(res.data);
    },

    /**
     * Uploads the logo and returns its public URL.
     * ⚠️ ADAPT: point this at the upload endpoint your Create Post media uses.
     */
    /** Uploads the logo to Cloudinary via the backend; returns its permanent URL. */
    async uploadLogo(file: File): Promise<string> {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "logo");
        const res = await axios.post(`${BASE}/v1/uploads`, form, {
            // no Content-Type here: the browser sets the multipart boundary itself
            headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` },
            timeout: 60_000,
        });
        return unwrap<{ url: string }>(res.data).url;
    },
};

export const apiError = (err: unknown, fallback = "Something went wrong") =>
    axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;