import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Coins } from "lucide-react";
import { useBillingStore } from "@/stores/billing.store";


export function CreditBadge() {
    const navigate = useNavigate();
    const status = useBillingStore((s) => s.status);
    const refresh = useBillingStore((s) => s.refresh);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    if (!status) return null;

    const low = status.totalCredits <= 20;
    const trial = status.status === "TRIALING";

    return (
        <button
            onClick={() => navigate("/billing")}
            className="w-full rounded-lg border border-neutral-700 px-3 py-2.5 text-left transition hover:border-neutral-500"
        >
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-400">
                    <Coins className="h-3.5 w-3.5" />
                    Credits
                </span>
                <span
                    className={
                        low
                            ? "text-sm font-semibold text-[#C8102E]"
                            : "text-sm font-semibold text-white"
                    }
                >
                    {status.totalCredits}
                </span>
            </div>

            <p className="mt-1 text-[11px] text-neutral-500">
                {trial
                    ? status.daysLeft > 0
                        ? `Trial · ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"} left`
                        : "Trial ends today"
                    : status.active
                        ? `${status.plan.charAt(0) + status.plan.slice(1).toLowerCase()} plan`
                        : "Plan expired"}
            </p>
        </button>
    );
}