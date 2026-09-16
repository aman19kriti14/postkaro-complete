import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Input } from "@/components/ui/Input";

import { Button } from "@/components/ui/Button";
import axios from "axios";
import { Logo } from "@/{api,components/{ui,guards},config,features/Logo";
import { PhoneInput } from "@/{api,components/{ui,guards},config,features/PhoneInput";
import { Select } from "@/{api,components/{ui,guards},config,features/Select";
import { Textarea } from "@/{api,components/{ui,guards},config,features/Textarea";
import { PillGroup } from "@/{api,components/{ui,guards},config,features/PillGroup";

const USER_TYPES = [
    { value: "business_owner", label: "Business owner" },
    { value: "creator", label: "Creator" },
    { value: "individual", label: "Individual" },
];

const CATEGORIES = [
    { value: "food_beverage", label: "Food & beverage" },
    { value: "fashion_beauty", label: "Fashion & beauty" },
    { value: "fitness_wellness", label: "Fitness & wellness" },
    { value: "education_coaching", label: "Education & coaching" },
    { value: "real_estate", label: "Real estate" },
    { value: "technology_saas", label: "Technology & SaaS" },
    { value: "travel_hospitality", label: "Travel & hospitality" },
    { value: "personal_brand", label: "Personal brand" },
    { value: "other", label: "Other" },
];

const TEAM_SIZES = [
    { value: "solo", label: "Solo" },
    { value: "2-10", label: "2–10" },
    { value: "10-50", label: "10–50" },
    { value: "50+", label: "50+" },
];

type SourceTab = "website" | "describe";

export function OnboardingPage() {
    const navigate = useNavigate();

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [userType, setUserType] = useState("");
    const [brandName, setBrandName] = useState("");
    const [category, setCategory] = useState("");
    const [sourceTab, setSourceTab] = useState<SourceTab>("website");
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [description, setDescription] = useState("");
    const [teamSize, setTeamSize] = useState("");
    const [referralCode, setReferralCode] = useState("");
    const [showReferral, setShowReferral] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [apiError, setApiError] = useState("");
    const [loading, setLoading] = useState(false);

    function validate(): boolean {
        const errs: Record<string, string> = {};

        if (!name.trim()) errs.name = "Name is required";
        if (!phone.trim()) errs.phone = "Mobile number is required";
        else if (!/^\d{10}$/.test(phone.replace(/\s/g, ""))) errs.phone = "Enter a valid 10-digit number";
        if (!userType) errs.userType = "Select what describes you";
        if (!brandName.trim()) errs.brandName = "Brand or business name is required";
        if (!category) errs.category = "Select a category";

        if (sourceTab === "website" && !websiteUrl.trim()) {
            errs.websiteUrl = "Enter a website or social link";
        }
        if (sourceTab === "describe" && !description.trim()) {
            errs.description = "Tell us what your brand does";
        }

        if (!teamSize) errs.teamSize = "Select your team size";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setApiError("");
        console.log("1 - submit clicked");

        if (!validate()) {
            console.log("2 - validation failed", errors);
            return;
        }

        console.log("3 - validation passed");
        setLoading(true);
        try {
            const payload = {
                name: name.trim(),
                phone: phone.replace(/\s/g, ""),
                userType,
                brandName: brandName.trim(),
                category,
                sourceType: sourceTab,
                websiteUrl: sourceTab === "website" ? websiteUrl.trim() : null,
                description: sourceTab === "describe" ? description.trim() : null,
                teamSize,
                referralCode: referralCode.trim() || null,
            };
            console.log("PAYLOAD:", payload);
            const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
            await axios.post(`${apiBase}/v1/onboarding/profile`, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('pk_access_token')
                }
            });
            console.log("4 - API success, navigating...");
            navigate("/connect-accounts");
            console.log("5 - navigate called");
        } catch (err: any) {
            console.log("6 - API error", err.response?.status, err.response?.data);
        } finally {
            setLoading(false);
        }
    }
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-neutral-100">
                <Logo variant="light" height={32} />
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-500">
                    Step 2 of 3 — About you
                </span>
            </header>

            {/* Content */}
            <main className="max-w-[720px] mx-auto px-6 py-10 sm:py-14">
                <h1 className="text-3xl sm:text-4xl font-[var(--font-display)] text-neutral-900 leading-tight">
                    Tell us who you are and what you sell.
                </h1>
                <p className="mt-3 text-neutral-500 text-[15px] leading-relaxed">
                    Postkaro reads your website or description once and uses it to write in your voice.
                    <br />
                    Two minutes now saves you every brief later.
                </p>

                {apiError && (
                    <div className="mt-6 p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
                        {apiError}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="mt-10 space-y-8" noValidate>
                    {/* Row: Name + Phone */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Input
                            label="Your name"
                            placeholder="Aarav Mehta"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            error={errors.name}
                        />
                        <PhoneInput
                            label="Mobile number"
                            placeholder="98765 43210"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            error={errors.phone}
                        />
                    </div>

                    {/* User type pills */}
                    <PillGroup
                        label="What best describes you?"
                        options={USER_TYPES}
                        value={userType}
                        onChange={setUserType}
                        error={errors.userType}
                    />

                    {/* Row: Brand name + Category */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <Input
                            label="Brand or business name"
                            placeholder="Chai Patti Co."
                            value={brandName}
                            onChange={(e) => setBrandName(e.target.value)}
                            error={errors.brandName}
                        />
                        <Select
                            label="Category"
                            placeholder="Select an option"
                            options={CATEGORIES}
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            error={errors.category}
                        />
                    </div>

                    {/* Source section */}
                    <div className="border border-neutral-200 rounded-[var(--radius-lg)] p-6 space-y-5">
                        <div>
                            <h3 className="text-lg font-[var(--font-display)] text-neutral-900">
                                Where should we learn about you?
                            </h3>
                            <p className="mt-1 text-sm text-neutral-500">
                                Pick one. You can add the other later.
                            </p>
                        </div>

                        {/* Tab toggle */}
                        <div className="inline-flex border border-neutral-200 rounded-[var(--radius-md)] overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setSourceTab("website")}
                                className={`px-5 py-2 text-sm font-medium transition-colors cursor-pointer ${sourceTab === "website"
                                    ? "bg-primary-50 text-primary-500"
                                    : "bg-white text-neutral-500 hover:text-neutral-700"
                                    }`}
                            >
                                Website or social link
                            </button>
                            <button
                                type="button"
                                onClick={() => setSourceTab("describe")}
                                className={`px-5 py-2 text-sm font-medium transition-colors cursor-pointer border-l border-neutral-200 ${sourceTab === "describe"
                                    ? "bg-primary-50 text-primary-500"
                                    : "bg-white text-neutral-500 hover:text-neutral-700"
                                    }`}
                            >
                                Describe it myself
                            </button>
                        </div>

                        {sourceTab === "website" ? (
                            <Input
                                label="Website or social link"
                                placeholder="https://chaipatti.co or @chaipatti on Instagram"
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                error={errors.websiteUrl}
                            />
                        ) : (
                            <Textarea
                                label="What does your brand do?"
                                placeholder="We roast single-estate Assam tea in Guwahati and sell it online to home brewers. Warm, a little cheeky, never salesy."
                                hint="Two or three sentences is plenty: what you sell, who buys it, how you sound."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                error={errors.description}
                            />
                        )}
                    </div>

                    {/* Team size */}
                    <PillGroup
                        label="Team size"
                        options={TEAM_SIZES}
                        value={teamSize}
                        onChange={setTeamSize}
                        error={errors.teamSize}
                    />

                    {/* Divider */}
                    <div className="h-px bg-neutral-100" />

                    {/* Referral */}
                    {!showReferral ? (
                        <button
                            type="button"
                            onClick={() => setShowReferral(true)}
                            className="text-sm font-medium text-primary-500 hover:text-primary-600 cursor-pointer"
                        >
                            Have a referral code?
                        </button>
                    ) : (
                        <Input
                            label="Referral code"
                            placeholder="Enter code"
                            value={referralCode}
                            onChange={(e) => setReferralCode(e.target.value)}
                        />
                    )}

                    {/* Submit */}
                    <div className="flex items-center gap-4">
                        <Button type="submit" size="lg" variant="outline" isLoading={loading}>
                            {loading ? "Setting up…" : "Claim your 7-day free trial"}
                        </Button>
                        <span className="text-sm text-neutral-400">No card required. Cancel any time.</span>
                    </div>
                </form>
            </main>
        </div>
    );
}