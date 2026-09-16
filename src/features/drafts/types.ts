export type DraftContentType = "IMAGE" | "REEL" | "CAROUSEL" | "TEXT";

export interface Draft {
    id: string;
    title: string;
    caption: string | null;
    contentType: DraftContentType;
    mediaUrl: string | null;
    mediaCount: number;
    fromAiStudio: boolean;
    channels: string[];
    hasVisual: boolean;
    hasChannel: boolean;
    readyToSchedule: boolean;
    updatedAt: string; // ISO
}

export interface DraftsSummary {
    total: number;
    almostReady: number;
    noVisual: number;
    noChannel: number;
    fromAiStudio: number;
    drafts: Draft[];
}

export type DraftSort = "recent" | "oldest" | "ready";

export type DraftFilter = "all" | "almostReady" | "noVisual" | "noChannel" | "fromAiStudio";

export interface ScheduleResult {
    id: string;
    status: string;
    scheduledAt: string;
}