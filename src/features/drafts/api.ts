import axios, { AxiosError } from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";
import type { ApiResponse } from "@/types/api";
import type { DraftSort, DraftsSummary, ScheduleResult } from "./types";

const BASE = env.API_BASE_URL;

const headers = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${tokenStore.getAccess() ?? ""}`,
});

export function errorMessage(err: unknown, fallback = "Something went wrong. Try again."): string {
    const e = err as AxiosError<{ message?: string }>;
    return e.response?.data?.message ?? fallback;
}

export const draftsApi = {
    async list(sort: DraftSort = "recent"): Promise<DraftsSummary> {
        const res = await axios.get(`${BASE}/v1/drafts`, {
            headers: headers(),
            params: { sort },
        });
        // Works whether or not the backend wraps it in ApiResponse
        return (res.data?.data ?? res.data) as DraftsSummary;
    },

    async schedule(id: string, scheduledAt: Date): Promise<ScheduleResult> {
        const res = await axios.post<ApiResponse<ScheduleResult>>(
            `${BASE}/v1/posts/${id}/schedule`,
            { scheduledAt: scheduledAt.toISOString() },
            { headers: headers() },
        );
        return res.data.data;
    },
};