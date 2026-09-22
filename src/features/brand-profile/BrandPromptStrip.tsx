import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Store } from "lucide-react";
import { brandProfileApi, type BrandProfile } from "./api";
import { SuggestedPrompts } from "./SuggestedPrompts";

/**
 * Top of AI Studio:
 * - READY   → 3 starter prompts from the user's brand + "See all"
 * - RUNNING → quiet "learning your brand" line
 * - else    → nudge to set it up (ideas get much better with it)
 */
export function BrandPromptStrip() {
    const [profile, setProfile] = useState<BrandProfile | null>(null);

    useEffect(() => {
        brandProfileApi
            .get()
            .then(setProfile)
            .catch(() => setProfile(null)); // strip is optional — never break AI Studio
    }, []);

    if (!profile) return null;

    const prompts = profile.analysis?.starterPrompts ?? [];

    if (profile.status === "RUNNING") {
        return (
            <div className="mb-8 flex items-center gap-3 text-sm text-neutral-600">
                <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                Learning your brand — personalised suggestions will show here shortly.
            </div>
        );
    }

    if (prompts.length === 0) {
        return (
            <Link
                to="/brand-profile"
                className="mb-8 flex items-center gap-4 rounded-[var(--radius-lg)] border border-dashed border-neutral-300 bg-white p-5 hover:border-primary-500 transition-colors"
            >
                <Store className="w-5 h-5 text-primary-500 shrink-0" />
                <div className="flex-1">
                    <p className="text-neutral-900 font-medium">Teach PostKaro your brand</p>
                    <p className="text-sm text-neutral-600">
                        Add your website — ideas and captions will use your real products and voice.
                    </p>
                </div>
                <span className="text-sm text-primary-500">Set up →</span>
            </Link>
        );
    }

    return (
        <section className="mb-10">
            <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">Suggested for you</h2>
                    <p className="mt-1 text-sm text-neutral-500">From your website and what works on your posts.</p>
                </div>
                <Link to="/brand-profile" className="text-sm text-primary-500 hover:underline whitespace-nowrap">
                    See all {prompts.length} →
                </Link>
            </div>
            <SuggestedPrompts prompts={prompts} limit={3} compact />
        </section>
    );
}