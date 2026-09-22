import { create } from "zustand";
import { fetchBillingStatus, type BillingStatus } from "@/features/billing/api";

interface BillingState {
    status: BillingStatus | null;
    isLoading: boolean;
    /** Set when the API returns 402 TRIAL_EXPIRED, so the app can show the lock screen. */
    locked: boolean;
    refresh: () => Promise<void>;
    setLocked: (locked: boolean) => void;
    /** Called after any credit-spending action so the badge stays accurate. */
    refreshQuietly: () => void;
}

export const useBillingStore = create<BillingState>((set, get) => ({
    status: null,
    isLoading: false,
    locked: false,

    refresh: async () => {
        set({ isLoading: true });
        try {
            const status = await fetchBillingStatus();
            set({ status, locked: !status.active, isLoading: false });
        } catch {
            set({ isLoading: false });
        }
    },

    setLocked: (locked) => set({ locked }),

    refreshQuietly: () => {
        void get().refresh();
    },
}));

/**
 * The axios interceptor dispatches these, since it can't import the store
 * without creating an import cycle.
 */
if (typeof window !== "undefined") {
    window.addEventListener("pk:trial-expired", () => {
        useBillingStore.getState().setLocked(true);
        void useBillingStore.getState().refresh();
    });
    window.addEventListener("pk:credits-changed", () => {
        void useBillingStore.getState().refresh();
    });
}