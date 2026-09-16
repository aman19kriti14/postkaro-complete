import type { CampaignBrief } from "./types";

const GOALS = [
    { value: "awareness", label: "Awareness" },
    { value: "sales", label: "Sales" },
    { value: "launch", label: "Launch a product" },
    { value: "followers", label: "Grow followers" },
];
const CADENCES = [
    { value: "light", label: "Light · 2 a week", perWeek: 2 },
    { value: "steady", label: "Steady · 4 a week", perWeek: 4 },
    { value: "heavy", label: "Heavy · daily", perWeek: 7 },
];
const TONES = [
    { value: "warm", label: "Warm" },
    { value: "playful", label: "Playful" },
    { value: "informative", label: "Informative" },
    { value: "festive", label: "Festive" },
];
const VISUALS = [
    { value: "ai_all", label: "AI images and video" },
    { value: "ai_images", label: "AI images only" },
    { value: "my_photos", label: "Use my photos" },
    { value: "text_only", label: "Text only" },
];
const LOOKS = [
    { value: "photographic", label: "Photographic" },
    { value: "warm_grainy", label: "Warm and grainy" },
    { value: "editorial", label: "Editorial" },
    { value: "illustrated", label: "Illustrated" },
];
const PLATFORM_LABEL: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    twitter: "X",
    whatsapp: "WhatsApp",
};

interface Props {
    value: CampaignBrief;
    onChange: (b: CampaignBrief) => void;
    connected: string[] | null; // null while loading
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// Same maths as the server, so the estimate matches the plan
export function estimatePosts(b: CampaignBrief): number {
    if (!b.startsOn || !b.endsOn) return 0;
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const start = new Date(`${b.startsOn}T00:00:00`);
    const end = new Date(`${b.endsOn}T00:00:00`);
    const from = start < tomorrow ? tomorrow : start;
    if (end < from) return 0;
    const days = Math.round((end.getTime() - from.getTime()) / 86_400_000) + 1;
    const perWeek = CADENCES.find((c) => c.value === b.cadence)?.perWeek ?? 4;
    return Math.min(30, Math.max(1, Math.round((days * perWeek) / 7)));
}

function Chips<T extends string>({
    options,
    selected,
    onToggle,
    label,
}: {
    options: { value: T; label: string }[];
    selected: (v: T) => boolean;
    onToggle: (v: T) => void;
    label: string;
}) {
    return (
        <fieldset>
            <legend className="mb-3 font-serif text-neutral-700">{label}</legend>
            <div className="flex flex-wrap gap-3">
                {options.map((o) => {
                    const on = selected(o.value);
                    return (
                        <button
                            key={o.value}
                            type="button"
                            aria-pressed={on}
                            onClick={() => onToggle(o.value)}
                            className={`border px-5 py-2.5 font-serif focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${on
                                    ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                    : "border-neutral-300 bg-white text-neutral-800 hover:border-black"
                                }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </fieldset>
    );
}

const inputCls =
    "mt-2 block w-full border border-neutral-300 bg-white px-4 py-3 font-serif text-black placeholder:text-neutral-400 focus:border-black focus:outline-none";

export function BriefForm({ value: b, onChange, connected }: Props) {
    const set = <K extends keyof CampaignBrief>(k: K, v: CampaignBrief[K]) => onChange({ ...b, [k]: v });
    const estimate = estimatePosts(b);
    const channelOptions = (connected ?? []).map((p) => ({ value: p, label: PLATFORM_LABEL[p] ?? p }));

    return (
        <div className="grid gap-8 lg:grid-cols-2">
            {/* The brief */}
            <section className="border border-neutral-200 bg-white p-8">
                <h2 className="border-b border-neutral-200 pb-5 font-serif text-3xl text-black">The brief</h2>

                <label className="mt-6 block font-serif text-neutral-700">
                    Campaign name
                    <input
                        className={inputCls}
                        value={b.name}
                        maxLength={120}
                        onChange={(e) => set("name", e.target.value)}
                        placeholder="Festive gifting boxes"
                    />
                </label>

                <label className="mt-6 block font-serif text-neutral-700">
                    What are you promoting, and why now?
                    <textarea
                        className={`${inputCls} min-h-36 resize-y leading-relaxed`}
                        value={b.brief}
                        onChange={(e) => set("brief", e.target.value)}
                        placeholder="Limited festive boxes with three blends and a brass strainer. Diwali gifting, orders close 24 October."
                    />
                </label>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <label className="block font-serif text-neutral-700">
                        Starts
                        <input
                            type="date"
                            className={inputCls}
                            value={b.startsOn}
                            min={todayIso()}
                            onChange={(e) => set("startsOn", e.target.value)}
                        />
                    </label>
                    <label className="block font-serif text-neutral-700">
                        Ends
                        <input
                            type="date"
                            className={inputCls}
                            value={b.endsOn}
                            min={b.startsOn || todayIso()}
                            onChange={(e) => set("endsOn", e.target.value)}
                        />
                    </label>
                </div>

                <label className="mt-6 block font-serif text-neutral-700">
                    Offer or call to action <span className="text-neutral-400">(optional)</span>
                    <input
                        className={inputCls}
                        value={b.offer}
                        maxLength={300}
                        onChange={(e) => set("offer", e.target.value)}
                        placeholder="Free shipping over ₹899"
                    />
                </label>
            </section>

            {/* How it should run */}
            <section className="space-y-7 border border-neutral-200 bg-white p-8">
                <h2 className="border-b border-neutral-200 pb-5 font-serif text-3xl text-black">How it should run</h2>

                <Chips label="Goal" options={GOALS} selected={(v) => b.goal === v} onToggle={(v) => set("goal", v)} />

                {connected === null ? (
                    <p className="text-sm text-neutral-500">Loading your channels…</p>
                ) : channelOptions.length === 0 ? (
                    <div>
                        <p className="font-serif text-neutral-700">Channels</p>
                        <p className="mt-2 text-sm text-neutral-600">
                            Connect at least one account before planning a campaign.{" "}
                            <a href="/connect-accounts" className="text-[#C8102E] underline underline-offset-4">
                                Connect an account
                            </a>
                        </p>
                    </div>
                ) : (
                    <Chips
                        label="Channels"
                        options={channelOptions}
                        selected={(v) => b.channels.includes(v)}
                        onToggle={(v) =>
                            set("channels", b.channels.includes(v) ? b.channels.filter((c) => c !== v) : [...b.channels, v])
                        }
                    />
                )}

                <Chips label="Cadence" options={CADENCES} selected={(v) => b.cadence === v} onToggle={(v) => set("cadence", v)} />
                <Chips label="Tone" options={TONES} selected={(v) => b.tone === v} onToggle={(v) => set("tone", v)} />

                <div className="border-t border-neutral-200 pt-7">
                    <Chips
                        label="Visuals: what should the AI make?"
                        options={VISUALS}
                        selected={(v) => b.visuals === v}
                        onToggle={(v) => set("visuals", v)}
                    />
                </div>

                {b.visuals !== "text_only" && (
                    <Chips label="Look and feel" options={LOOKS} selected={(v) => b.look === v} onToggle={(v) => set("look", v)} />
                )}

                <p className="border-t border-neutral-200 pt-6 font-serif leading-relaxed text-neutral-700">
                    {estimate > 0 && b.channels.length > 0
                        ? `PostKaro will plan about ${estimate} ${estimate === 1 ? "post" : "posts"} across ${b.channels.length} ${b.channels.length === 1 ? "channel" : "channels"
                        } for this window. You approve each one before it becomes a draft.`
                        : "Pick your dates and at least one channel to see how many posts this plans."}
                </p>
            </section>
        </div>
    );
}