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

// ---------- types (match DashboardResponse.java) ----------

export interface DashboardStats {
  scheduledNext7Days: number;
  publishedThisMonth: number;
  publishedDelta: number;
  reach: number;
  reachChangePct: number | null;
  engagementPct: number;
  engagementChange: number | null;
}

export type UpNextStatus = "SCHEDULED" | "NEEDS_REVIEW" | "DRAFT";

export interface UpNextItem {
  id: string;
  title: string;
  scheduledAt: string; // ISO instant (UTC)
  channels: string[];
  format: string | null;
  status: UpNextStatus;
}

export interface DayReach {
  date: string; // yyyy-MM-dd
  label: string; // M, T, W...
  reach: number;
}

export interface TopPost {
  postId: string;
  title: string;
  reach: number;
  engagementPct: number;
}

export interface WhatsWorking {
  week: DayReach[];
  topByReach: TopPost | null;
  topByEngagement: TopPost | null;
}

export type CampaignCardStatus = "LIVE" | "SCHEDULED" | "DRAFT";

export interface CampaignCard {
  id: string;
  name: string;
  status: CampaignCardStatus;
  startsOn: string | null;
  endsOn: string | null;
  channels: string[];
  readyPosts: number;
  totalPosts: number;
}

export interface DashboardData {
  firstName: string;
  stats: DashboardStats;
  upNext: UpNextItem[];
  whatsWorking: WhatsWorking;
  campaigns: CampaignCard[];
}

// ---------- calls ----------

export const dashboardApi = {
  async get(): Promise<DashboardData> {
    const res = await axios.get(`${BASE}/v1/dashboard`, { headers: headers() });
    return unwrap<DashboardData>(res.data);
  },
};

export const apiError = (err: unknown, fallback = "Couldn't load your dashboard") =>
  axios.isAxiosError(err) ? (err.response?.data?.message ?? fallback) : fallback;