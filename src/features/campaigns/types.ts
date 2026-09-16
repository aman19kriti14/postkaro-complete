export type CampaignStatus = "upcoming" | "live" | "ended";
export type PostFormat = "reel" | "carousel" | "post" | "story";
export type PostStage = "tease" | "explain" | "proof" | "convert";

export interface CampaignCounts {
    total: number;
    needsWork: number;
    ready: number;
    scheduled: number;
    published: number;
}

export interface CampaignSummary {
    id: string;
    name: string;
    status: CampaignStatus;
    startsOn: string; // YYYY-MM-DD
    endsOn: string;
    channels: string[];
    counts: CampaignCounts;
}

export interface CampaignPost {
    id: string;
    title: string;
    hook: string;
    status: "DRAFT" | "SCHEDULED" | "PUBLISHED" | string;
    ready: boolean;
    format: PostFormat | null;
    stage: PostStage | null;
    channels: string[];
    scheduledAt: string | null;
    publishedAt: string | null;
    mediaUrl: string | null;
    mediaType: string | null;
}

export interface CampaignDetail extends CampaignSummary {
    brief: string;
    offer: string;
    goal: string;
    cadence: string;
    tone: string;
    visuals: string;
    look: string;
    posts: CampaignPost[];
}

export interface CampaignBrief {
    name: string;
    brief: string;
    offer: string;
    goal: string;
    cadence: string;
    tone: string;
    visuals: string;
    look: string;
    channels: string[];
    startsOn: string;
    endsOn: string;
}

export interface PlanItem {
    index: number;
    date: string; // YYYY-MM-DD
    time: string; // HH:mm, IST
    format: PostFormat;
    stage: PostStage;
    title: string;
    hook: string;
    channels: string[];
    mediaUrl?: string | null;
    mediaType?: string | null;
}