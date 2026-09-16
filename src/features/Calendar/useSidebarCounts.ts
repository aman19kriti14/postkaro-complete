import { useCallback, useEffect, useState } from "react";
import { calendarApi } from "./api";
import type { SidebarCounts } from "./api";

const REFRESH_EVENT = "postkaro:counts-changed";

// Call this after anything that changes counts (approve, reschedule, save draft, new campaign)
export const refreshSidebarCounts = () => window.dispatchEvent(new Event(REFRESH_EVENT));

export function useSidebarCounts() {
    const [counts, setCounts] = useState<SidebarCounts | null>(null);

    const load = useCallback(async () => {
        try {
            setCounts(await calendarApi.sidebarCounts());
        } catch {
            // Badges are non-critical; keep the last known values
        }
    }, []);

    useEffect(() => {
        load();
        window.addEventListener(REFRESH_EVENT, load);
        window.addEventListener("focus", load);
        return () => {
            window.removeEventListener(REFRESH_EVENT, load);
            window.removeEventListener("focus", load);
        };
    }, [load]);

    return counts;
}