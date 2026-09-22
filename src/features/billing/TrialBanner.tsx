import { useNavigate } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useBillingStore } from "@/stores/billing.store";


export function TrialBanner() {
    const navigate = useNavigate();
    const status = useBillingStore((s) => s.status);

    if (!status) return null;

    const expired = !status.active;
    const endingSoon = status.status === "TRIALING" && status.daysLeft <= 2;
    const lowCredits = status.active && status.totalCredits <= 20;

    if (!expired && !endingSoon && !lowCredits) return null;

    const { text, cta } = expired
        ? {
            text: "Your free trial has ended. You can still view everything, but creating and publishing are paused.",
            cta: "Choose a plan",
        }
        : endingSoon
            ? {
                text:
                    status.daysLeft > 0
                        ? `Your trial ends in ${status.daysLeft} day${status.daysLeft === 1 ? "" : "s"}.`
                        : "Your trial ends today.",
                cta: "See plans",
            }
            : {
                text: `Only ${status.totalCredits} credits left.`,
                cta: "Top up",
            };

    return (
        <div
            className={
                expired
                    ? "flex flex-wrap items-center gap-3 border-b border-[#C8102E]/30 bg-[#C8102E]/5 px-5 py-3"
                    : "flex flex-wrap items-center gap-3 border-b border-neutral-200 bg-neutral-50 px-5 py-3"
            }
        >
            <AlertCircle
                className={expired ? "h-4 w-4 shrink-0 text-[#C8102E]" : "h-4 w-4 shrink-0 text-neutral-500"}
            />
            <p className="flex-1 text-sm text-neutral-700">{text}</p>
            <button
                onClick={() => navigate("/billing")}
                className="rounded-md border border-[#C8102E] px-3 py-1.5 text-sm font-medium text-[#C8102E] transition hover:bg-[#C8102E] hover:text-white"
            >
                {cta}
            </button>
        </div>
    );
}