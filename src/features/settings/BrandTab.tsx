import { useEffect, useRef, useState } from "react";
import { ImagePlus, X, Plus } from "lucide-react";
import {
    settingsApi,
    apiError,
    TONE_LABELS,
    LANGUAGE_LABELS,
    type BrandOptions,
    type BrandSettings,
} from "./api";

interface Props {
    value: BrandSettings;
    options: BrandOptions;
    onChange: (next: BrandSettings) => void;
    onError: (msg: string | null) => void;
}

const card = "rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6 sm:p-8";
const inner = "rounded-[var(--radius-md)] border border-neutral-200 bg-white p-6";
const input =
    "w-full rounded-[var(--radius-md)] border border-neutral-200 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500";
const chip = (on: boolean) =>
    `h-11 px-5 rounded-[var(--radius-md)] border text-sm transition-colors cursor-pointer ${on
        ? "border-primary-500 bg-primary-50 text-primary-500"
        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
    }`;

const MAX_COLORS = 5;
const MAX_SAMPLES = 5;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function BrandTab({ value, options, onChange, onError }: Props) {
    const set = <K extends keyof BrandSettings>(key: K, v: BrandSettings[K]) => onChange({ ...value, [key]: v });

    useFontPreview(options.fonts);

    return (
        <div className="space-y-8">
            {/* ---------- Brand ---------- */}
            <section className={card}>
                <SectionHead
                    title="Brand"
                    text="Captions follow your voice below. Generated visuals use your colours."
                />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <LogoBox url={value.logoUrl} onChange={(u) => set("logoUrl", u)} onError={onError} />
                    <ColorsBox colors={value.colors} onChange={(c) => set("colors", c)} />
                    <TypeBox
                        fonts={options.fonts}
                        heading={value.headingFont}
                        body={value.bodyFont}
                        onHeading={(f) => set("headingFont", f)}
                        onBody={(f) => set("bodyFont", f)}
                    />
                </div>
            </section>

            {/* ---------- Voice ---------- */}
            <section className={card}>
                <SectionHead title="Voice" text="Used by the AI studio and caption writing." />

                <div className="space-y-8">
                    <Field label="Tone">
                        <div className="flex flex-wrap gap-2">
                            {options.tones.map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => set("tone", t)}
                                    className={chip(value.tone === t)}
                                >
                                    {TONE_LABELS[t] ?? t}
                                </button>
                            ))}
                        </div>
                    </Field>

                    <Field label="Languages">
                        <div className="flex flex-wrap gap-2">
                            {options.languages.map((l) => {
                                const on = value.languages.includes(l);
                                return (
                                    <button
                                        key={l}
                                        type="button"
                                        onClick={() => {
                                            if (on && value.languages.length === 1) return; // keep at least one
                                            const next = on
                                                ? value.languages.filter((x) => x !== l)
                                                : [...value.languages, l];
                                            set("languages", options.languages.filter((x) => next.includes(x)));
                                        }}
                                        aria-pressed={on}
                                        className={chip(on)}
                                    >
                                        {LANGUAGE_LABELS[l] ?? l}
                                    </button>
                                );
                            })}
                        </div>
                    </Field>

                    <Field label="How you sound">
                        <textarea
                            rows={3}
                            maxLength={2000}
                            value={value.voiceDescription ?? ""}
                            onChange={(e) => set("voiceDescription", e.target.value || null)}
                            placeholder="Warm and plain. Short sentences, no marketing language, never exclamation marks."
                            className={`${input} resize-y`}
                        />
                    </Field>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Field label="Words to use" hint="Separate with commas">
                            <input
                                maxLength={500}
                                value={value.wordsToUse ?? ""}
                                onChange={(e) => set("wordsToUse", e.target.value || null)}
                                placeholder="blend, counter, estate, brew"
                                className={input}
                            />
                        </Field>
                        <Field label="Words to avoid" hint="Separate with commas">
                            <input
                                maxLength={500}
                                value={value.wordsToAvoid ?? ""}
                                onChange={(e) => set("wordsToAvoid", e.target.value || null)}
                                placeholder="premium, luxury, game-changing"
                                className={input}
                            />
                        </Field>
                    </div>

                    <Field label="Approved sample posts — the studio matches these">
                        <SamplePosts posts={value.samplePosts} onChange={(p) => set("samplePosts", p)} />
                    </Field>
                </div>
            </section>

            {/* ---------- Used by ---------- */}
            <section className={card}>
                <SectionHead title="Used by" />
                <p className="text-neutral-700">
                    AI studio ideas and captions follow your voice. Generated visuals lean on your colours. Your logo
                    and fonts are used by poster layouts.
                </p>
            </section>
        </div>
    );
}

// ---------- logo ----------

function LogoBox({
    url,
    onChange,
    onError,
}: {
    url: string | null;
    onChange: (u: string | null) => void;
    onError: (m: string | null) => void;
}) {
    const ref = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const pick = async (file: File | undefined) => {
        if (!file) return;
        if (!LOGO_TYPES.includes(file.type)) return onError("Logo must be PNG, JPG, WebP or SVG.");
        if (file.size > 10 * 1024 * 1024) return onError("Logo must be under 10 MB.");
        setUploading(true);
        onError(null);
        try {
            onChange(await settingsApi.uploadLogo(file));
        } catch (err) {
            onError(apiError(err, "Logo upload failed. Try again."));
        } finally {
            setUploading(false);
            if (ref.current) ref.current.value = "";
        }
    };

    return (
        <div className="relative">
            <input
                ref={ref}
                type="file"
                accept={LOGO_TYPES.join(",")}
                className="hidden"
                onChange={(e) => pick(e.target.files?.[0])}
            />
            {url ? (
                <div className={`${inner} h-full flex flex-col items-center justify-center gap-4`}>
                    <div className="h-24 w-full flex items-center justify-center bg-neutral-50 rounded-[var(--radius-sm)]">
                        <img src={url} alt="Logo" className="max-h-20 max-w-[80%] object-contain" />
                    </div>
                    <div className="flex gap-4 text-sm">
                        <button
                            type="button"
                            onClick={() => ref.current?.click()}
                            className="text-primary-500 cursor-pointer"
                            disabled={uploading}
                        >
                            {uploading ? "Uploading…" : "Replace"}
                        </button>
                        <button
                            type="button"
                            onClick={() => onChange(null)}
                            className="text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        >
                            Remove
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => ref.current?.click()}
                    disabled={uploading}
                    className="w-full h-full min-h-[200px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 bg-white flex flex-col items-center justify-center gap-2 text-neutral-600 hover:border-primary-400 hover:bg-primary-50/30 transition-colors cursor-pointer disabled:cursor-wait"
                >
                    <ImagePlus className="w-7 h-7" />
                    <span className="text-lg">{uploading ? "Uploading…" : "Upload logo"}</span>
                    <span className="text-sm text-neutral-500">SVG or PNG, transparent</span>
                </button>
            )}
        </div>
    );
}

// ---------- colours ----------

function ColorsBox({ colors, onChange }: { colors: string[]; onChange: (c: string[]) => void }) {
    const DEFAULTS = ["#C8102E", "#121212", "#F3F2F2", "#E8B04B", "#2F5D50"];

    const update = (i: number, hex: string) => onChange(colors.map((c, j) => (j === i ? hex.toUpperCase() : c)));
    const remove = (i: number) => onChange(colors.filter((_, j) => j !== i));
    const add = () => {
        const next = DEFAULTS.find((d) => !colors.includes(d)) ?? "#888888";
        onChange([...colors, next]);
    };

    return (
        <div className={inner}>
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-neutral-500">Colors</p>
            <div className="mt-4 flex flex-wrap gap-4">
                {colors.map((c, i) => (
                    <div key={i} className="group relative flex flex-col items-center gap-2">
                        {/* the native colour input IS the swatch, so a click always opens the picker */}
                        <input
                            type="color"
                            value={c.toLowerCase()}
                            onChange={(e) => update(i, e.target.value)}
                            title="Click to change colour"
                            className="block w-14 h-14 p-0 rounded-[var(--radius-sm)] border border-neutral-200 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[var(--radius-sm)] [&::-moz-color-swatch]:border-none"
                        />

                        <HexInput value={c} onChange={(hex) => update(i, hex)} />

                        <button
                            type="button"
                            onClick={() => remove(i)}
                            aria-label={`Remove ${c}`}
                            className="absolute -top-2 -right-2 z-10 w-5 h-5 rounded-full bg-neutral-900 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                ))}
                {colors.length < MAX_COLORS && (
                    <button
                        type="button"
                        onClick={add}
                        aria-label="Add colour"
                        className="w-14 h-14 rounded-[var(--radius-sm)] border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 hover:border-primary-400 hover:text-primary-500 cursor-pointer"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                )}
            </div>
        </div>
    );
}

/** Editable hex code; only applies once it's a valid #RRGGBB. */
function HexInput({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
    const [text, setText] = useState(value);
    useEffect(() => setText(value), [value]);

    return (
        <input
            value={text}
            maxLength={7}
            spellCheck={false}
            onChange={(e) => {
                let v = e.target.value.trim();
                if (v && !v.startsWith("#")) v = "#" + v;
                setText(v.toUpperCase());
                if (/^#[0-9A-Fa-f]{6}$/.test(v)) onChange(v);
            }}
            onBlur={() => setText(value)}
            className="w-20 text-center text-xs tabular-nums text-neutral-700 bg-transparent border-b border-transparent hover:border-neutral-200 focus:border-primary-500 focus:outline-none"
        />
    );
}

// ---------- type ----------

function TypeBox({
    fonts,
    heading,
    body,
    onHeading,
    onBody,
}: {
    fonts: string[];
    heading: string | null;
    body: string | null;
    onHeading: (f: string | null) => void;
    onBody: (f: string | null) => void;
}) {
    const select =
        "w-full h-10 rounded-[var(--radius-md)] border border-neutral-200 bg-white px-3 text-sm text-neutral-800 focus:outline-none focus:border-primary-500";

    return (
        <div className={inner}>
            <p className="text-xs font-medium tracking-[0.18em] uppercase text-neutral-500">Type</p>
            <p
                className="mt-3 text-3xl text-neutral-900 truncate"
                style={{ fontFamily: heading ? `"${heading}", serif` : undefined }}
            >
                {heading ?? "Heading font"}
            </p>
            <p
                className="mt-1 text-base text-neutral-700"
                style={{ fontFamily: body ? `"${body}", serif` : undefined }}
            >
                {body ? `${body} for body copy` : "Body font"}
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <select
                    value={heading ?? ""}
                    onChange={(e) => onHeading(e.target.value || null)}
                    className={select}
                    aria-label="Heading font"
                >
                    <option value="">Heading…</option>
                    {fonts.map((f) => (
                        <option key={f} value={f}>
                            {f}
                        </option>
                    ))}
                </select>
                <select
                    value={body ?? ""}
                    onChange={(e) => onBody(e.target.value || null)}
                    className={select}
                    aria-label="Body font"
                >
                    <option value="">Body…</option>
                    {fonts.map((f) => (
                        <option key={f} value={f}>
                            {f}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

/** Loads the font list from Google Fonts once, so the preview shows real fonts. */
function useFontPreview(fonts: string[]) {
    useEffect(() => {
        if (!fonts.length || document.getElementById("pk-font-preview")) return;
        const families = fonts.map((f) => `family=${f.replace(/ /g, "+")}`).join("&");
        const link = document.createElement("link");
        link.id = "pk-font-preview";
        link.rel = "stylesheet";
        link.href = `https://fonts.googleapis.com/css2?${families}&display=swap`;
        document.head.appendChild(link);
    }, [fonts]);
}

// ---------- sample posts ----------

function SamplePosts({ posts, onChange }: { posts: string[]; onChange: (p: string[]) => void }) {
    const [adding, setAdding] = useState(false);
    const [text, setText] = useState("");

    const add = () => {
        const t = text.trim();
        if (!t) return;
        onChange([...posts, t]);
        setText("");
        setAdding(false);
    };

    return (
        <div className="space-y-3">
            {posts.map((p, i) => (
                <div key={i} className="flex items-start gap-4 rounded-[var(--radius-md)] border border-neutral-200 p-5">
                    <span className="text-sm tabular-nums text-primary-500 pt-0.5">
                        {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="flex-1 text-base text-neutral-900 whitespace-pre-wrap">{p}</p>
                    <button
                        type="button"
                        onClick={() => onChange(posts.filter((_, j) => j !== i))}
                        className="h-10 px-4 shrink-0 rounded-[var(--radius-md)] border border-neutral-200 text-sm text-neutral-700 hover:border-neutral-300 cursor-pointer"
                    >
                        Remove
                    </button>
                </div>
            ))}

            {adding ? (
                <div className="rounded-[var(--radius-md)] border border-neutral-300 p-4 space-y-3">
                    <textarea
                        autoFocus
                        rows={3}
                        maxLength={2200}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste a caption you've posted and liked."
                        className={`${input} resize-y`}
                    />
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={add}
                            disabled={!text.trim()}
                            className="h-10 px-5 rounded-[var(--radius-md)] border border-primary-500 text-sm text-primary-500 hover:bg-primary-50 cursor-pointer disabled:opacity-50"
                        >
                            Add
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setAdding(false);
                                setText("");
                            }}
                            className="h-10 px-4 text-sm text-neutral-500 hover:text-neutral-800 cursor-pointer"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : posts.length < MAX_SAMPLES ? (
                <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="h-11 px-5 rounded-[var(--radius-md)] border border-dashed border-neutral-300 text-sm text-neutral-700 hover:border-primary-400 hover:text-primary-500 cursor-pointer"
                >
                    Add a sample post
                </button>
            ) : (
                <p className="text-sm text-neutral-500">Up to {MAX_SAMPLES} sample posts. Remove one to add another.</p>
            )}
        </div>
    );
}

// ---------- small bits ----------

function SectionHead({ title, text }: { title: string; text?: string }) {
    return (
        <div className="pb-5 mb-6 border-b border-neutral-100">
            <h2 className="text-3xl font-[var(--font-display)] text-neutral-900">{title}</h2>
            {text && <p className="mt-2 text-neutral-600">{text}</p>}
        </div>
    );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div>
            <div className="mb-3 flex items-baseline justify-between gap-3">
                <span className="text-sm text-neutral-600">{label}</span>
                {hint && <span className="text-xs text-neutral-400">{hint}</span>}
            </div>
            {children}
        </div>
    );
}