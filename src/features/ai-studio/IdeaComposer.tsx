import { useEffect, useState } from "react";
import { SOURCES, FORMATS, CHANNELS, type GenerateInput } from "./api";

interface Props {
    /** Prefill from the set being viewed (latest or a saved one) */
    initial?: Partial<GenerateInput> | null;
    generating: boolean;
    onGenerate: (input: GenerateInput) => void;
}

const DEFAULTS: GenerateInput = {
    brief: "",
    sources: ["brand_voice", "past_top_posts"],
    formats: ["reel", "carousel"],
    channels: ["instagram"],
};

export function IdeaComposer({ initial, generating, onGenerate }: Props) {
    const [brief, setBrief] = useState(DEFAULTS.brief);
    const [sources, setSources] = useState<string[]>(DEFAULTS.sources);
    const [formats, setFormats] = useState<string[]>(DEFAULTS.formats);
    const [channels, setChannels] = useState<string[]>(DEFAULTS.channels);

    // When a different set is opened, load its settings into the form
    useEffect(() => {
        if (!initial) return;
        setBrief(initial.brief ?? "");
        if (initial.sources) setSources(initial.sources);
        if (initial.formats?.length) setFormats(initial.formats);
        if (initial.channels?.length) setChannels(initial.channels);
    }, [initial]);

    const canGenerate = brief.trim().length > 0 && formats.length > 0 && channels.length > 0 && !generating;

    const submit = () => {
        if (!canGenerate) return;
        onGenerate({ brief: brief.trim(), sources, formats, channels });
    };

    return (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6 sm:p-8">
            <label htmlFor="brief" className="block text-base text-neutral-800">
                What should we post about?
            </label>
            <textarea
                id="brief"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                }}
                maxLength={1000}
                rows={3}
                placeholder="Something for the rain this week — the monsoon blend and the Bandra counter"
                className="mt-3 w-full rounded-[var(--radius-md)] border border-neutral-200 px-4 py-3 text-lg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500 resize-y"
            />

            <div className="mt-6 space-y-4">
                <ChipRow
                    label="Draws from"
                    options={SOURCES}
                    selected={sources}
                    onChange={setSources}
                    allowEmpty
                />
                <ChipRow label="Formats" options={FORMATS} selected={formats} onChange={setFormats} />
                <ChipRow label="Channels" options={CHANNELS} selected={channels} onChange={setChannels} />
            </div>

            <div className="mt-6 pt-6 border-t border-neutral-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <p className="text-sm text-neutral-500">{summary(sources)}</p>
                <button
                    onClick={submit}
                    disabled={!canGenerate}
                    className="h-12 px-8 shrink-0 rounded-[var(--radius-md)] border border-primary-500 bg-white text-lg font-[var(--font-display)] text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? "Generating…" : "Generate ideas"}
                </button>
            </div>
        </div>
    );
}

// ---------- chip row ----------

function ChipRow({
    label,
    options,
    selected,
    onChange,
    allowEmpty = false,
}: {
    label: string;
    options: readonly { key: string; label: string }[];
    selected: string[];
    onChange: (next: string[]) => void;
    allowEmpty?: boolean;
}) {
    const toggle = (key: string) => {
        const on = selected.includes(key);
        if (on && !allowEmpty && selected.length === 1) return; // keep at least one
        // keep the order of the option list
        const next = on ? selected.filter((k) => k !== key) : [...selected, key];
        onChange(options.map((o) => o.key).filter((k) => next.includes(k)));
    };

    return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
            <span className="w-28 shrink-0 text-sm text-neutral-600">{label}</span>
            <div className="flex flex-wrap gap-2">
                {options.map((o) => {
                    const on = selected.includes(o.key);
                    return (
                        <button
                            key={o.key}
                            type="button"
                            onClick={() => toggle(o.key)}
                            aria-pressed={on}
                            className={`h-10 px-4 rounded-[var(--radius-md)] border text-sm transition-colors cursor-pointer ${on
                                    ? "border-primary-500 bg-primary-50 text-primary-500"
                                    : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                                }`}
                        >
                            {o.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ---------- footer line ----------

function summary(sources: string[]): string {
    const names = SOURCES.filter((s) => sources.includes(s.key)).map((s) => s.label.toLowerCase());
    const from = names.length === 0 ? "Writing from your brief only" : `Writing from ${joinList(names)}`;
    return `${from}. Ideas stay unscheduled until you draft one.`;
}

function joinList(items: string[]): string {
    if (items.length <= 1) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}