import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ImagePlus, Loader2, RefreshCw, Sparkles, SlidersHorizontal, X } from "lucide-react";
import { type LanguageCode, LANGUAGES } from "./languages";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
const token = () => localStorage.getItem("pk_access_token");
const auth = () => ({ Authorization: `Bearer ${token()}` });

const TONES = [
    { value: "warm", label: "Warm" },
    { value: "playful", label: "Playful" },
    { value: "informative", label: "Informative" },
    { value: "punchy", label: "Punchy" },
    { value: "storytelling", label: "Story" },
];

const ASPECTS = [
    { value: "1:1", label: "Square" },
    { value: "4:5", label: "Portrait" },
    { value: "9:16", label: "Story / Reel" },
];

const ANGLE_LABEL: Record<string, string> = {
    pain: "Relatable",
    story: "Story",
    bold: "Bold",
};

interface Channel {
    platform: string;
    name: string;
    selected: boolean;
}

interface Caption {
    angle: string;
    text: string;
}

interface BestTime {
    message: string;
    nextDate: string;
    nextTime: string;
}

// Remember the user's last choices so options stay out of the way
const PREFS_KEY = "pk_quick_prefs";
function loadPrefs(): { tone: string; language: LanguageCode; aspect: string } {
    try {
        const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}");
        return { tone: saved.tone ?? "warm", language: saved.language ?? "ENGLISH", aspect: saved.aspect ?? "4:5" };
    } catch {
        return { tone: "warm", language: "ENGLISH", aspect: "4:5" };
    }
}

function errorMessage(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") return "This is taking longer than usual. Try again in a minute.";
        return err.response?.data?.message ?? fallback;
    }
    return fallback;
}

export function QuickCreatePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const initial = loadPrefs();
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState(initial.tone);
    const [language, setLanguage] = useState<LanguageCode>(initial.language);
    const [aspect, setAspect] = useState(initial.aspect);
    const [showOptions, setShowOptions] = useState(false);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [bestTime, setBestTime] = useState<BestTime | null>(null);

    const [captions, setCaptions] = useState<Caption[]>([]);
    const [picked, setPicked] = useState<number | null>(null);
    const [caption, setCaption] = useState("");
    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const [loadingCaptions, setLoadingCaptions] = useState(false);
    const [loadingImage, setLoadingImage] = useState(false);
    const [captionError, setCaptionError] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);
    const [sending, setSending] = useState<"now" | "schedule" | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    // Own photo: used as is, or as the reference for an AI design
    const [photo, setPhoto] = useState<string | null>(null);
    const [photoMode, setPhotoMode] = useState<"design" | "asis">("design");
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        axios
            .get(`${apiBase}/v1/auth/me`, { headers: auth() })
            .then((res) => {
                const accounts = res.data.data.connectedAccounts || [];
                setChannels(
                    accounts.map((a: any) => ({
                        platform: a.platform,
                        name: a.platformDisplayName || a.platformUsername,
                        selected: true,
                    })),
                );
            })
            .catch(() => setChannels([]));

        axios
            .get(`${apiBase}/v1/posts/best-time`, { headers: auth() })
            .then((res) => setBestTime(res.data.data))
            .catch(() => setBestTime(null));
    }, []);

    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify({ tone, language, aspect }));
    }, [tone, language, aspect]);

    // Links like /create?draft=… and /create?date=… belong to the full editor
    if (searchParams.toString()) {
        return <Navigate to={`/create/advanced${location.search}`} replace />;
    }

    const selectedChannels = channels.filter((c) => c.selected);
    const busy = loadingCaptions || loadingImage || uploadingPhoto;
    const useAsIs = photo !== null && photoMode === "asis";
    const hasResult = captions.length > 0 || imageUrl !== null;
    const canSend = caption.trim() !== "" && selectedChannels.length > 0 && !busy && sending === null;

    async function generateCaptions() {
        setLoadingCaptions(true);
        setCaptionError(null);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-captions`,
                { prompt: prompt.trim(), tone, language, channels: selectedChannels.map((c) => c.platform) },
                { headers: auth(), timeout: 90_000 },
            );
            const list: Caption[] = res.data.data.captions ?? [];
            setCaptions(list);
            setPicked(list.length ? 0 : null);
            setCaption(list[0]?.text ?? "");
        } catch (err) {
            setCaptionError(errorMessage(err, "Couldn't write captions. Try again."));
        } finally {
            setLoadingCaptions(false);
        }
    }

    async function handlePhoto(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            setPhotoError("Upload a JPG, PNG or WebP photo.");
            return;
        }
        setUploadingPhoto(true);
        setPhotoError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("kind", "media");
            const res = await axios.post(`${apiBase}/v1/uploads`, form, { headers: auth(), timeout: 120_000 });
            const body = res.data?.data ?? res.data;
            setPhoto(body.url as string);
        } catch (err) {
            setPhotoError(errorMessage(err, "Couldn't upload that photo. Try again."));
        } finally {
            setUploadingPhoto(false);
        }
    }

    function removePhoto() {
        setPhoto(null);
        setPhotoMode("design");
        setPhotoError(null);
    }

    async function generateImage() {
        // "Use as is": no AI call, no credits
        if (useAsIs) {
            setImageError(null);
            setImageUrl(photo);
            return;
        }
        setLoadingImage(true);
        setImageError(null);
        try {
            const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-image`,
                {
                    prompt: prompt.trim(),
                    contentType: "product_promo",
                    aspectRatio: aspect,
                    language: langLabel,
                    productImageUrls: photo ? [photo] : [], // with a photo, AI designs around it
                    variations: 1,
                },
                { headers: auth(), timeout: 180_000 },
            );
            const data = res.data.data;
            const urls: string[] = data.urls ?? (data.url ? [data.url] : []);
            setImageUrl(urls[0] ?? null);
        } catch (err) {
            setImageError(errorMessage(err, "Couldn't make the image. Try again."));
        } finally {
            setLoadingImage(false);
        }
    }

    function handleCreate() {
        if (!prompt.trim() || busy) return;
        setCaptions([]);
        setPicked(null);
        setCaption("");
        setImageUrl(null);
        setSendError(null);
        // Both at once: the wait is the slower of the two, not the sum
        void generateCaptions();
        void generateImage();
    }

    function pickCaption(i: number) {
        setPicked(i);
        setCaption(captions[i]?.text ?? "");
    }

    function toggleChannel(platform: string) {
        setChannels((prev) => prev.map((c) => (c.platform === platform ? { ...c, selected: !c.selected } : c)));
    }

    async function saveDraft(): Promise<string> {
        const media = imageUrl ? [{ url: imageUrl, type: "image" }] : [];
        const res = await axios.post(
            `${apiBase}/v1/posts/draft`,
            {
                caption,
                prompt,
                tone,
                language,
                channels: selectedChannels.map((c) => c.platform),
                media,
                mediaUrl: media[0]?.url ?? null,
                mediaType: media[0]?.type ?? null,
            },
            { headers: auth() },
        );
        return res.data.data.id;
    }

    async function send(mode: "now" | "schedule") {
        if (!canSend) return;
        setSending(mode);
        setSendError(null);
        try {
            const id = await saveDraft();
            if (mode === "now") {
                await axios.post(`${apiBase}/v1/posts/${id}/publish`, null, { headers: auth() });
            } else {
                const when = bestTime
                    ? new Date(`${bestTime.nextDate}T${bestTime.nextTime}:00`)
                    : new Date(Date.now() + 24 * 60 * 60 * 1000);
                await axios.post(
                    `${apiBase}/v1/posts/${id}/schedule`,
                    { scheduledAt: when.toISOString() },
                    { headers: auth() },
                );
            }
            navigate("/dashboard");
        } catch (err) {
            setSendError(errorMessage(err, mode === "now" ? "Couldn't post. Try again." : "Couldn't schedule. Try again."));
        } finally {
            setSending(null);
        }
    }

    const chip = (active: boolean) =>
        `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
        }`;

    return (
        <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8 sm:py-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-serif text-3xl text-neutral-900">New post</h1>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/create/advanced${prompt.trim() ? `?prompt=${encodeURIComponent(prompt.trim())}` : ""}`)}
                        className="text-sm text-neutral-500 hover:text-neutral-900"
                    >
                        More options →
                    </button>
                    <div className="flex rounded-lg border border-neutral-200 p-1 text-sm">
                        <span className="rounded-md bg-neutral-900 px-4 py-1.5 text-white">Post</span>
                        <button
                            onClick={() => navigate("/create/reel")}
                            className="rounded-md px-4 py-1.5 text-neutral-500 hover:text-neutral-900"
                        >
                            Reel
                        </button>
                    </div>
                </div>
            </div>

            {/* Step 1 — the only thing the user has to do */}
            <div className="mt-6 rounded-xl border border-neutral-200 p-4 sm:p-5">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleCreate();
                    }}
                    rows={3}
                    placeholder="What's this post about? e.g. Monsoon blend is back — warm, malty, 149 rs this weekend"
                    className="w-full resize-none text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
                />

                <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhoto}
                    className="hidden"
                />

                {(photo || uploadingPhoto) && (
                    <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg bg-neutral-50 p-3">
                        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-200">
                            {uploadingPhoto ? (
                                <div className="flex h-full items-center justify-center">
                                    <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
                                </div>
                            ) : (
                                <>
                                    <img src={photo!} alt="Your photo" className="h-full w-full object-cover" />
                                    <button
                                        onClick={removePhoto}
                                        aria-label="Remove photo"
                                        className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                        {!uploadingPhoto && (
                            <div>
                                <div className="flex flex-wrap gap-2">
                                    <button onClick={() => setPhotoMode("design")} className={chip(photoMode === "design")}>
                                        AI design with my photo
                                    </button>
                                    <button onClick={() => setPhotoMode("asis")} className={chip(photoMode === "asis")}>
                                        Use my photo as is
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-neutral-500">
                                    {photoMode === "design"
                                        ? "Keeps your product and builds a post around it."
                                        : "Posts your photo unchanged. No image credits used."}
                                </p>
                            </div>
                        )}
                    </div>
                )}
                {photoError && <p className="mt-2 text-sm text-[#C8102E]">{photoError}</p>}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-4">
                        <button
                            onClick={() => fileInput.current?.click()}
                            disabled={busy}
                            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900 disabled:opacity-40"
                        >
                            <ImagePlus className="h-4 w-4" />
                            {photo ? "Change photo" : "Add your photo"}
                        </button>
                        <button
                            onClick={() => setShowOptions((v) => !v)}
                            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            {TONES.find((t) => t.value === tone)?.label} · {LANGUAGES.find((l) => l.code === language)?.label} ·{" "}
                            {ASPECTS.find((a) => a.value === aspect)?.label}
                        </button>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={!prompt.trim() || busy}
                        className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#a50d26] disabled:opacity-40"
                    >
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {busy ? "Creating…" : hasResult ? "Create again" : "Create"}
                    </button>
                </div>

                {showOptions && (
                    <div className="mt-4 space-y-3 border-t border-neutral-100 pt-4">
                        <div className="flex flex-wrap gap-2">
                            {TONES.map((t) => (
                                <button key={t.value} onClick={() => setTone(t.value)} className={chip(tone === t.value)}>
                                    {t.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                            {ASPECTS.map((a) => (
                                <button key={a.value} onClick={() => setAspect(a.value)} className={chip(aspect === a.value)}>
                                    {a.label}
                                </button>
                            ))}
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                className="rounded-full border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 outline-none"
                            >
                                {LANGUAGES.map((l) => (
                                    <option key={l.code} value={l.code}>
                                        {l.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* Step 2 — pick a caption, check the image */}
            {(hasResult || busy || captionError || imageError) && (
                <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
                    <div>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            Pick a caption
                        </p>

                        {loadingCaptions && (
                            <div className="space-y-3">
                                {[0, 1, 2].map((i) => (
                                    <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />
                                ))}
                            </div>
                        )}

                        {captionError && (
                            <div className="rounded-xl border border-[#C8102E]/30 p-4 text-sm text-[#C8102E]">
                                {captionError}{" "}
                                <button onClick={generateCaptions} className="underline">
                                    Retry
                                </button>
                            </div>
                        )}

                        <div className="space-y-3">
                            {captions.map((c, i) =>
                                picked === i ? (
                                    <div key={i} className="rounded-xl border-2 border-[#C8102E] p-4">
                                        <span className="text-xs font-semibold uppercase tracking-wide text-[#C8102E]">
                                            {ANGLE_LABEL[c.angle] ?? c.angle} · selected — edit freely
                                        </span>
                                        <textarea
                                            value={caption}
                                            onChange={(e) => setCaption(e.target.value)}
                                            rows={Math.max(5, caption.split("\n").length + 1)}
                                            className="mt-2 w-full resize-none text-[15px] leading-relaxed text-neutral-900 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <button
                                        key={i}
                                        onClick={() => pickCaption(i)}
                                        className="block w-full rounded-xl border border-neutral-200 p-4 text-left transition hover:border-neutral-400"
                                    >
                                        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                                            {ANGLE_LABEL[c.angle] ?? c.angle}
                                        </span>
                                        <p className="mt-2 line-clamp-4 whitespace-pre-line text-[15px] leading-relaxed text-neutral-700">
                                            {c.text}
                                        </p>
                                    </button>
                                ),
                            )}
                        </div>
                    </div>

                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">Image</p>
                            {imageUrl && !loadingImage && !useAsIs && (
                                <button
                                    onClick={generateImage}
                                    className="flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-900"
                                >
                                    <RefreshCw className="h-3.5 w-3.5" /> New image
                                </button>
                            )}
                        </div>

                        <div
                            className={`overflow-hidden rounded-xl bg-neutral-100 ${aspect === "9:16" ? "aspect-[9/16]" : aspect === "4:5" ? "aspect-[4/5]" : "aspect-square"
                                }`}
                        >
                            {loadingImage && (
                                <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-neutral-500">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    {photo ? "Designing around your photo…" : "Making your image…"}
                                </div>
                            )}
                            {!loadingImage && imageUrl && (
                                <img
                                    src={imageUrl}
                                    alt=""
                                    className={`h-full w-full ${useAsIs && imageUrl === photo ? "object-contain" : "object-cover"}`}
                                />
                            )}
                            {!loadingImage && imageError && (
                                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[#C8102E]">
                                    {imageError}
                                    <button onClick={generateImage} className="underline">
                                        Retry
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Step 3 — where and when */}
            {captions.length > 0 && (
                <div className="sticky bottom-0 mt-8 border-t border-neutral-200 bg-white py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {channels.length === 0 && (
                                <button onClick={() => navigate("/connect-accounts")} className="text-sm text-[#C8102E] underline">
                                    Connect a channel to post
                                </button>
                            )}
                            {channels.map((c) => (
                                <button key={c.platform} onClick={() => toggleChannel(c.platform)} className={chip(c.selected)}>
                                    {c.name}
                                </button>
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => send("schedule")}
                                disabled={!canSend}
                                title={bestTime?.message}
                                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 transition hover:border-neutral-500 disabled:opacity-40"
                            >
                                {sending === "schedule"
                                    ? "Scheduling…"
                                    : bestTime
                                        ? `Schedule · ${bestTime.nextTime}`
                                        : "Schedule for tomorrow"}
                            </button>
                            <button
                                onClick={() => send("now")}
                                disabled={!canSend}
                                className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-black disabled:opacity-40"
                            >
                                {sending === "now" ? "Posting…" : "Post now"}
                            </button>
                        </div>
                    </div>
                    {sendError && <p className="mt-2 text-sm text-[#C8102E]">{sendError}</p>}
                </div>
            )}
        </div>
    );
}