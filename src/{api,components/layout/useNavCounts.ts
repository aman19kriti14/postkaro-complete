import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";

export interface NavCounts {
    drafts: number;
    scheduled: number;
}

export function useNavCounts(): NavCounts | null {
    const { pathname } = useLocation();
    const [counts, setCounts] = useState<NavCounts | null>(null);

    const load = useCallback(async () => {
        try {
            const res = await axios.get(`${env.API_BASE_URL}/v1/posts`, {
                headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` },
            });
            const posts: { status: string }[] = res.data?.data ?? res.data ?? [];
            setCounts({
                drafts: posts.filter((p) => p.status === "DRAFT").length,
                scheduled: posts.filter((p) => p.status === "SCHEDULED").length,
            });
        } catch {
            // Hide badges rather than show wrong numbers
            setCounts(null);
        }
    }, []);

    // Refresh on page change (e.g. after saving a draft in Create post)
    useEffect(() => { load(); }, [load, pathname]);

    // Refresh right after a draft is scheduled
    useEffect(() => {
        window.addEventListener("pk:drafts-changed", load);
        return () => window.removeEventListener("pk:drafts-changed", load);
    }, [load]);

    return counts;
}