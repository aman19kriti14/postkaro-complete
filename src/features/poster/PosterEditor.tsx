import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { X, Loader2, Sparkles, RotateCcw } from "lucide-react";
import { tokenStore } from "@/api/client";
import { env } from "@/config/env";
import { settingsApi } from "@/features/settings/api";
import { LAYOUTS, SIZES, type LayoutKey, type PosterSize } from "./layouts";
import { loadFontForLanguage } from "./fonts";

import {
    renderPoster,
    exportPoster,
    type PosterBrand,
    type BlockRect,
    type BlockKey,
    type PosterPositions,
} from "./renderPoster";
import { LanguageCode } from "../posts/pages/languages";

interface Props {
    open: boolean;
    /** current post image, used as the poster background (optional) */
    backgroundUrl: string | null;
    /** prefill for the headline, e.g. the post prompt */
    initialHeadline?: string;
    /** language for AI copy and script font */
    language?: LanguageCode;
    onClose: () => void;
    /** called with the uploaded poster URL */
    onUse: (url: string) => void;
}

const chip = (on: boolean) =>
    `h-10 px-4 rounded-[var(--radius-md)] border text-sm transition-colors cursor-pointer ${on
        ? "border-primary-500 bg-primary-50 text-primary-500"
        : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
    }`;
const input =
    "w-full rounded-[var(--radius-md)] border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-primary-500";

async function uploadPoster(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append("file", new File([blob], "poster.jpg", { type: "image/jpeg" }));
    form.append("kind", "media");
    const res = await axios.post(`${env.API_BASE_URL}/v1/uploads`, form, {
        headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` },
        timeout: 60_000,
    });
    const body = res.data?.data ?? res.data;
    return body.url as string;
}

export function PosterEditor({
    open,
    backgroundUrl,
    initialHeadline = "",
    language = "ENGLISH",
    onClose,
    onUse,
}: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const [brand, setBrand] = useState<PosterBrand | null>(null);
    const [size, setSize] = useState<PosterSize>("portrait");
    const [layout, setLayout] = useState<LayoutKey>(backgroundUrl ? "bottom" : "center");
    const [usePhoto, setUsePhoto] = useState(!!backgroundUrl);
    const [headline, setHeadline] = useState(initialHeadline.slice(0, 80));
    const [subline, setSubline] = useState("");
    const [cta, setCta] = useState("");
    const [showLogo, setShowLogo] = useState(true);

    const [scriptFont, setScriptFont] = useState<string | null>(null);
    const [positions, setPositions] = useState<PosterPositions>({});
    const [writing, setWriting] = useState(false);

    const [rendering, setRendering] = useState(false);
    const [saving, setSaving] = useState(false);
    const [warning, setWarning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // block rects from the last render, for hit-testing drags
    const rectsRef = useRef<BlockRect[]>([]);
    const dragRef = useRef<{ key: BlockKey; dxFrac: number; dyFrac: number } | null>(null);
    const [dragging, setDragging] = useState<BlockKey | null>(null);

    // brand settings (fonts, colours, logo)
    useEffect(() => {
        if (!open || brand) return;
        settingsApi
            .getBrand()
            .then((b) =>
                setBrand({ logoUrl: b.logoUrl, colors: b.colors, headingFont: b.headingFont, bodyFont: b.bodyFont }),
            )
            .catch(() => setBrand({ logoUrl: null, colors: [], headingFont: null, bodyFont: null }));
    }, [open, brand]);

    // load the Noto face for the selected script before drawing
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        loadFontForLanguage(language)
            .then((f) => !cancelled && setScriptFont(f))
            .catch(() => !cancelled && setScriptFont(null));
        return () => {
            cancelled = true;
        };
    }, [open, language]);

    // changing size or layout invalidates dragged positions
    useEffect(() => {
        setPositions({});
    }, [size, layout]);

    // redraw shortly after the user stops typing
    useEffect(() => {
        if (!open || !brand || !canvasRef.current) return;
        const t = setTimeout(async () => {
            setRendering(true);
            try {
                const res = await renderPoster(canvasRef.current!, {
                    size,
                    layout,
                    backgroundUrl: usePhoto ? backgroundUrl : null,
                    headline,
                    subline,
                    cta,
                    showLogo,
                    brand,
                    scriptFont,
                    positions,
                });
                rectsRef.current = res.rects;
                setWarning(res.warning);
            } catch (e: any) {
                setError(e?.message ?? "Couldn't draw the poster");
            } finally {
                setRendering(false);
            }
        }, dragging ? 0 : 250);
        return () => clearTimeout(t);
    }, [open, brand, size, layout, usePhoto, backgroundUrl, headline, subline, cta, showLogo, scriptFont, positions, dragging]);

    // close on Escape
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && !saving && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, saving, onClose]);

    if (!open) return null;

    const canUse = !!brand && !rendering && !saving && (headline.trim() || subline.trim());

    // ---- AI copy ----

    const writeCopy = async () => {
        if (!headline.trim() && !initialHeadline.trim()) return;
        setWriting(true);
        setError(null);
        try {
            const res = await axios.post(
                `${env.API_BASE_URL}/v1/posts/generate-poster-copy`,
                { topic: headline.trim() || initialHeadline.trim(), language },
                { headers: { Authorization: `Bearer ${tokenStore.getAccess() ?? ""}` } },
            );
            const copy = res.data?.data ?? res.data;
            if (copy.headline) setHeadline(copy.headline.slice(0, 80));
            if (copy.subhead) setSubline(copy.subhead.slice(0, 140));
            if (copy.cta) setCta(copy.cta.slice(0, 30));
            setPositions({}); // new text lengths make old positions meaningless
        } catch (e: any) {
            setError(e?.response?.data?.message ?? "Couldn't write the copy. Try again.");
        } finally {
            setWriting(false);
        }
    };

    // ---- dragging ----

    /** pointer position as a fraction of the canvas, accounting for CSS scaling */
    const pointerFrac = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const el = e.currentTarget;
        const r = el.getBoundingClientRect();
        return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
    };

    const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const f = pointerFrac(e);
        const px = f.x * canvas.width;
        const py = f.y * canvas.height;

        // last drawn wins, so the topmost block is picked up
        const hit = [...rectsRef.current]
            .reverse()
            .find((r) => px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h);
        if (!hit) return;

        e.currentTarget.setPointerCapture(e.pointerId);
        dragRef.current = {
            key: hit.key,
            dxFrac: f.x - hit.anchorX / canvas.width,
            dyFrac: f.y - hit.y / canvas.height,
        };
        setDragging(hit.key);
    };

    const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
        const d = dragRef.current;
        if (!d) return;
        const f = pointerFrac(e);
        setPositions((prev) => ({
            ...prev,
            [d.key]: {
                x: Math.min(1, Math.max(0, f.x - d.dxFrac)),
                y: Math.min(1, Math.max(0, f.y - d.dyFrac)),
            },
        }));
    };

    const endDrag = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!dragRef.current) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        dragRef.current = null;
        setDragging(null);
    };

    // ---- save ----

    const use = async () => {
        if (!canvasRef.current || !canUse) return;
        setSaving(true);
        setError(null);
        try {
            const blob = await exportPoster(canvasRef.current);
            onUse(await uploadPoster(blob));
            onClose();
        } catch (e: any) {
            setError(e?.response?.data?.message ?? e?.message ?? "Couldn't save the poster. Try again.");
        } finally {
            setSaving(false);
        }
    };

    const moved = Object.keys(positions).length > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => !saving && onClose()}>
            <div
                className="w-full max-w-5xl max-h-[92vh] overflow-auto rounded-[var(--radius-lg)] bg-white shadow-xl"
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-label="Make a poster"
            >
                {/* header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                    <div>
                        <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">Make a poster</h2>
                        <p className="text-sm text-neutral-500">Drag any text on the poster to move it.</p>
                    </div>
                    <button onClick={onClose} disabled={saving} aria-label="Close" className="p-2 text-neutral-500 hover:text-neutral-900 cursor-pointer">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 p-6">
                    {/* preview */}
                    <div className="flex flex-col items-center justify-center rounded-[var(--radius-md)] bg-neutral-100 p-4 min-h-[420px]">
                        <div className="relative">
                            <canvas
                                ref={canvasRef}
                                onPointerDown={onPointerDown}
                                onPointerMove={onPointerMove}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                className={`block max-h-[70vh] max-w-full h-auto w-auto shadow-md touch-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
                                style={{ aspectRatio: `${SIZES[size].w} / ${SIZES[size].h}` }}
                            />
                            {(!brand || rendering) && !dragging && (
                                <div className="absolute top-2 right-2 rounded-full bg-white/90 p-1.5">
                                    <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
                                </div>
                            )}
                        </div>
                        {warning && <p className="mt-3 text-sm text-primary-600">{warning}</p>}
                        {moved && (
                            <button
                                onClick={() => setPositions({})}
                                className="mt-3 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 cursor-pointer"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset positions
                            </button>
                        )}
                    </div>

                    {/* controls */}
                    <div className="space-y-5">
                        <button
                            onClick={writeCopy}
                            disabled={writing || (!headline.trim() && !initialHeadline.trim())}
                            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-md)] border border-primary-500 px-4 text-sm text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {writing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {writing ? "Writing…" : "Write with AI"}
                        </button>

                        <Field label="Headline">
                            <textarea
                                rows={2}
                                maxLength={80}
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                placeholder="Monsoon blend is back"
                                className={`${input} resize-none`}
                            />
                        </Field>
                        <Field label="Subline" optional>
                            <textarea
                                rows={2}
                                maxLength={140}
                                value={subline}
                                onChange={(e) => setSubline(e.target.value)}
                                placeholder="Malty, a little smoky. Till 30 Sep."
                                className={`${input} resize-none`}
                            />
                        </Field>
                        <Field label="Button" optional>
                            <input
                                maxLength={30}
                                value={cta}
                                onChange={(e) => setCta(e.target.value)}
                                placeholder="Order on WhatsApp"
                                className={input}
                            />
                        </Field>

                        <Field label="Size">
                            <div className="flex flex-wrap gap-2">
                                {(Object.keys(SIZES) as PosterSize[]).map((s) => (
                                    <button key={s} type="button" onClick={() => setSize(s)} className={chip(size === s)}>
                                        {SIZES[s].label}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <Field label="Layout">
                            <div className="grid grid-cols-2 gap-2">
                                {LAYOUTS.map((l) => (
                                    <button key={l.key} type="button" onClick={() => setLayout(l.key)} className={`${chip(layout === l.key)} text-left`}>
                                        {l.label}
                                    </button>
                                ))}
                            </div>
                        </Field>

                        <div className="space-y-2">
                            <Toggle
                                label={backgroundUrl ? "Use the post image as background" : "No post image yet: plain background"}
                                checked={usePhoto}
                                disabled={!backgroundUrl}
                                onChange={setUsePhoto}
                            />
                            <Toggle
                                label={brand?.logoUrl ? "Show logo" : "No logo in Settings yet"}
                                checked={showLogo && !!brand?.logoUrl}
                                disabled={!brand?.logoUrl}
                                onChange={setShowLogo}
                            />
                        </div>

                        {error && <p className="text-sm text-primary-600">{error}</p>}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={use}
                                disabled={!canUse}
                                className="h-11 px-6 rounded-[var(--radius-md)] border border-primary-500 bg-primary-50 text-sm text-primary-500 hover:bg-primary-100 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                            >
                                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                                {saving ? "Saving…" : "Use poster"}
                            </button>
                            <button onClick={onClose} disabled={saving} className="h-11 px-4 text-sm text-neutral-500 hover:text-neutral-800 cursor-pointer">
                                Cancel
                            </button>
                        </div>
                        <p className="text-xs text-neutral-400">
                            Check the text before posting. Brand fonts and colours come from Settings → Brand.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: React.ReactNode }) {
    return (
        <div>
            <p className="mb-2 text-sm text-neutral-700">
                {label}
                {optional && <span className="ml-1 text-neutral-400">(optional)</span>}
            </p>
            {children}
        </div>
    );
}

function Toggle({
    label,
    checked,
    disabled,
    onChange,
}: {
    label: string;
    checked: boolean;
    disabled?: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <label className={`flex items-center gap-3 text-sm ${disabled ? "text-neutral-400" : "text-neutral-700 cursor-pointer"}`}>
            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange(e.target.checked)}
                className="w-4 h-4 accent-[var(--color-primary-500,#C8102E)]"
            />
            {label}
        </label>
    );
}