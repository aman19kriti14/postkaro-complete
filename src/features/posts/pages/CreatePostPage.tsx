import { useState, useEffect, type ChangeEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import axios from "axios";
import { PosterEditor } from "@/features/poster/PosterEditor";

import { type LanguageCode, LANGUAGES } from "./languages";
import { Logo } from "@/{api,components/{ui,guards},config,features/Logo";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

const TONES = [
    { value: "warm", label: "Warm" },
    { value: "playful", label: "Playful" },
    { value: "informative", label: "Informative" },
    { value: "punchy", label: "Short and punchy" },
    { value: "storytelling", label: "Storytelling" },
];

const SCHEDULE_OPTIONS = [
    { value: "best", label: "Best time" },
    { value: "pick", label: "Pick a slot" },
    { value: "now", label: "Post now" },
];

const REFINE_ACTIONS = [
    { key: "shorter", label: "Make it shorter" },
    { key: "hashtags", label: "Add hashtags" },
    { key: "playful", label: "More playful" },
];

const tileClass =
    "w-[140px] h-[140px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

// What kind of visual to make — sent to the backend prompt enhancer
const CONTENT_TYPES = [
    { value: "product_promo", label: "Product" },
    { value: "offer", label: "Offer / sale" },
    { value: "announcement", label: "Announcement" },
    { value: "event", label: "Event" },
    { value: "festive", label: "Festive" },
    { value: "educational", label: "Tip / fact" },
    { value: "infographic", label: "Infographic" },
    { value: "testimonial", label: "Testimonial" },
];

const ASPECTS = [
    { value: "1:1", label: "Square", hint: "Feed" },
    { value: "4:5", label: "Portrait", hint: "Feed, more space" },
    { value: "9:16", label: "Tall", hint: "Story / Reel" },
];

const MAX_SLIDES = 10;

// Every image/video made or uploaded in this session. Nothing is thrown away on regenerate.
interface MediaItem {
    url: string;
    type: "image" | "video";
    source: "ai" | "upload" | "poster" | "draft";
}

interface ChannelOption {
    id: string;
    platform: string;
    name: string;
    detail: string;
    letter: string;
    selected: boolean;
}

export function CreatePostPage() {
    const navigate = useNavigate();
    const token = () => localStorage.getItem("pk_access_token");

    // Draft being edited (opened from Drafts with ?draft=<id>)
    const [searchParams] = useSearchParams();
    const draftId = searchParams.get("draft");
    const mode = searchParams.get("mode");
    const [loadingDraft, setLoadingDraft] = useState(!!draftId);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draftChannels, setDraftChannels] = useState<string[] | null>(null);

    // Form state
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState("warm");
    const [language, setLanguage] = useState<LanguageCode>("ENGLISH");
    const [caption, setCaption] = useState("");
    const [channels, setChannels] = useState<ChannelOption[]>([]);
    const [scheduleType, setScheduleType] = useState("best");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [postId, setPostId] = useState<string | null>(null);

    // Media state
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<string | null>(null);
    const [imagePrompt, setImagePrompt] = useState("");
    const [posterOpen, setPosterOpen] = useState(false);
    const [gallery, setGallery] = useState<MediaItem[]>([]);
    const [contentType, setContentType] = useState("product_promo");
    const [aspect, setAspect] = useState("1:1");
    const [productRefs, setProductRefs] = useState<string[]>([]); // product photos the AI must keep
    const [uploading, setUploading] = useState<"media" | "product" | null>(null);
    const [mediaError, setMediaError] = useState<string | null>(null);

    // Carousel: an ordered list of slides picked from the gallery (Instagram allows 2–10)
    const [postMode, setPostMode] = useState<"single" | "carousel">("single");
    const [slides, setSlides] = useState<MediaItem[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [slideCount, setSlideCount] = useState(5);
    const [generatingCarousel, setGeneratingCarousel] = useState(false);

    // Loading states
    const [generating, setGenerating] = useState(false);
    const [refining, setRefining] = useState<string | null>(null);
    const [generatingImage, setGeneratingImage] = useState(false);
    const [generatingVideo, setGeneratingVideo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [publishing, setPublishing] = useState(false);

    // Load connected accounts
    useEffect(() => {
        async function loadChannels() {
            try {
                const res = await axios.get(`${apiBase}/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token()}` },
                });
                const accounts = res.data.data.connectedAccounts || [];

                const platformMap: Record<string, { detail: string; letter: string }> = {
                    instagram: { detail: "Feed + Reels", letter: "I" },
                    facebook: { detail: "Page posts", letter: "F" },
                    linkedin: { detail: "Profile / Company", letter: "L" },
                    youtube: { detail: "Shorts", letter: "Y" },
                    twitter: { detail: "Posts", letter: "X" },
                    whatsapp: { detail: "Status + Broadcasts", letter: "W" },
                };

                const mapped: ChannelOption[] = accounts.map((a: any) => ({
                    id: a.id,
                    platform: a.platform,
                    name: a.platformDisplayName || a.platformUsername,
                    detail: platformMap[a.platform]?.detail || "",
                    letter: platformMap[a.platform]?.letter || a.platform[0].toUpperCase(),
                    selected: true,
                }));

                setChannels(mapped);
            } catch {
                // ignore
            }
        }
        loadChannels();
    }, []);

    // Set default schedule
    useEffect(() => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setScheduleDate(tomorrow.toISOString().split("T")[0] ?? "");
        setScheduleTime("11:30");
    }, []);

    // Opened from AI studio: preselect "Post now" or "Pick a slot"
    useEffect(() => {
        if (mode === "publish") setScheduleType("now");
        else if (mode === "schedule") setScheduleType("pick");
    }, [mode]);

    // Load an existing draft when opened from Drafts
    useEffect(() => {
        if (!draftId) return;
        async function loadDraft() {
            try {
                const res = await axios.get(`${apiBase}/v1/posts/${draftId}`, {
                    headers: { Authorization: `Bearer ${token()}` },
                });
                const p = res.data.data;
                setPostId(p.id);
                setPrompt(p.prompt ?? "");
                setTone(p.tone ?? "warm");
                setLanguage((p.language as LanguageCode) ?? "ENGLISH");
                setCaption(p.caption ?? "");
                const items: MediaItem[] = (p.media ?? [])
                    .filter((m: any) => m?.url)
                    .map((m: any) => ({ url: m.url, type: m.type === "video" ? "video" : "image", source: "draft" }));
                const first = items[0];
                if (first) {
                    setMediaUrl(first.url);
                    setMediaType(first.type);
                    setGallery(items);
                    if (items.length > 1) {
                        setPostMode("carousel");
                        setSlides(items);
                    }
                }
                setDraftChannels(p.channels ?? []);
            } catch {
                setLoadError("Couldn't open this draft. It may have been scheduled or deleted.");
            } finally {
                setLoadingDraft(false);
            }
        }
        loadDraft();
    }, [draftId]);

    // Once channels and the draft are both loaded, select the draft's channels
    useEffect(() => {
        if (!draftChannels || channels.length === 0) return;
        setChannels((prev) => prev.map((c) => ({ ...c, selected: draftChannels.includes(c.platform) })));
        setDraftChannels(null); // apply once, then let the user change them
    }, [draftChannels, channels.length]);

    const selectedChannels = channels.filter((c) => c.selected);
    const carouselNotReady = postMode === "carousel" && slides.length < 2;
    const charCount = caption.length;
    const firstChannel = selectedChannels.length > 0 ? selectedChannels[0]! : null;

    function toggleChannel(id: string) {
        setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
    }

    // ─── AI Caption ────────────────────────────────────────

    async function handleGenerate() {
        if (!prompt.trim()) return;
        setGenerating(true);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-caption`,
                {
                    caption,
                    prompt,
                    tone,
                    language,
                    channels: selectedChannels.map((c) => c.platform),
                    mediaUrl,
                    mediaType,
                },
                { headers: { Authorization: `Bearer ${token()}` } },
            );
            setCaption(res.data.data.caption);
        } catch (err) {
            console.error("Generate failed:", err);
        } finally {
            setGenerating(false);
        }
    }

    async function handleRefine(action: string) {
        if (!caption.trim()) return;
        setRefining(action);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/refine-caption`,
                { caption, action, language },
                { headers: { Authorization: `Bearer ${token()}` } },
            );
            setCaption(res.data.data.caption);
        } catch (err) {
            console.error("Refine failed:", err);
        } finally {
            setRefining(null);
        }
    }

    // ─── AI Media ──────────────────────────────────────────

    function errorMessage(err: unknown, fallback: string) {
        if (axios.isAxiosError(err)) {
            if (err.code === "ECONNABORTED") return "This is taking longer than usual. Try again in a minute.";
            return err.response?.data?.message ?? fallback;
        }
        return fallback;
    }

    // Adds to the gallery (newest first) and selects it. Older items stay.
    // In carousel mode, new items also become the next slide.
    function addToGallery(item: MediaItem) {
        setGallery((prev) => [item, ...prev.filter((g) => g.url !== item.url)]);
        setMediaUrl(item.url);
        setMediaType(item.type);
        if (postMode === "carousel") {
            setSlides((prev) =>
                prev.some((s) => s.url === item.url) || prev.length >= MAX_SLIDES ? prev : [...prev, item],
            );
        }
    }

    function selectMedia(item: MediaItem) {
        setMediaUrl(item.url);
        setMediaType(item.type);
        if (postMode === "carousel") toggleSlide(item);
    }

    // ─── Carousel slides ───────────────────────────────────

    function toggleSlide(item: MediaItem) {
        setSlides((prev) => {
            if (prev.some((s) => s.url === item.url)) return prev.filter((s) => s.url !== item.url);
            if (prev.length >= MAX_SLIDES) return prev;
            return [...prev, item];
        });
    }

    function moveSlide(index: number, dir: -1 | 1) {
        setSlides((prev) => {
            const target = index + dir;
            if (target < 0 || target >= prev.length) return prev;
            const next = [...prev];
            const a = next[index]!;
            next[index] = next[target]!;
            next[target] = a;
            return next;
        });
    }

    function switchMode(mode: "single" | "carousel") {
        setPostMode(mode);
        setPreviewIndex(0);
        // Starting a carousel: begin with whatever is currently selected
        if (mode === "carousel" && slides.length === 0 && mediaUrl && mediaType) {
            setSlides([{ url: mediaUrl, type: mediaType === "video" ? "video" : "image", source: "ai" }]);
        }
    }

    function removeFromGallery(url: string) {
        setSlides((prev) => prev.filter((s) => s.url !== url));
        const next = gallery.filter((g) => g.url !== url);
        setGallery(next);
        if (mediaUrl === url) {
            const fallback = next[0];
            setMediaUrl(fallback ? fallback.url : null);
            setMediaType(fallback ? fallback.type : null);
        }
    }

    async function handleGenerateImage() {
        const brief = imagePrompt.trim() || prompt.trim();
        if (!brief) return;
        setGeneratingImage(true);
        setMediaError(null);
        try {
            const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-image`,
                {
                    prompt: brief,
                    contentType,
                    aspectRatio: aspect,
                    language: langLabel,
                    productImageUrls: productRefs,
                    variations: 1,
                },
                // 2K generation + prompt enhancing takes 30–90s
                { headers: { Authorization: `Bearer ${token()}` }, timeout: 180_000 },
            );
            const data = res.data.data;
            const urls: string[] = data.urls ?? (data.url ? [data.url] : []);
            // add oldest-first so the first result ends up selected
            [...urls].reverse().forEach((url) => addToGallery({ url, type: "image", source: "ai" }));
            if (!caption.trim() && data.caption) setCaption(data.caption);
        } catch (err) {
            console.error("Image generation failed:", err);
            setMediaError(errorMessage(err, "Couldn't make the image. Try again."));
        } finally {
            setGeneratingImage(false);
        }
    }

    async function handleGenerateVideo() {
        if (!prompt.trim()) return;
        setGeneratingVideo(true);
        setMediaError(null);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-video`,
                { prompt: prompt.trim() },
                { headers: { Authorization: `Bearer ${token()}` }, timeout: 300_000 },
            );
            addToGallery({ url: res.data.data.url, type: "video", source: "ai" });
        } catch (err) {
            console.error("Video generation failed:", err);
            setMediaError(errorMessage(err, "Couldn't make the video. Try again."));
        } finally {
            setGeneratingVideo(false);
        }
    }

    // One idea → a matching set of slides (cover, content, call to action)
    async function handleGenerateCarousel() {
        const brief = imagePrompt.trim() || prompt.trim();
        if (!brief) return;
        setGeneratingCarousel(true);
        setMediaError(null);
        try {
            const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-carousel`,
                {
                    prompt: brief,
                    slides: slideCount,
                    aspectRatio: aspect === "1:1" ? "1:1" : "4:5", // carousels can't be 9:16
                    language: langLabel,
                    productImageUrls: productRefs,
                },
                // planning + one image per slide takes 1–2 minutes
                { headers: { Authorization: `Bearer ${token()}` }, timeout: 300_000 },
            );
            const data = res.data.data;
            const items: MediaItem[] = (data.urls ?? []).map((url: string) => ({ url, type: "image", source: "ai" }));
            if (items.length === 0) throw new Error("No slides returned");

            // Keep older versions in the gallery; the new set replaces the current slides
            setGallery((prev) => [...items, ...prev.filter((g) => !items.some((i) => i.url === g.url))]);
            setSlides(items);
            setPreviewIndex(0);
            setMediaUrl(items[0]!.url);
            setMediaType("image");
            if (!caption.trim() && data.caption) setCaption(data.caption);
        } catch (err) {
            console.error("Carousel generation failed:", err);
            setMediaError(errorMessage(err, "Couldn't make the carousel. Try again."));
        } finally {
            setGeneratingCarousel(false);
        }
    }

    // POST /v1/uploads → Cloudinary URL
    async function uploadFile(file: File): Promise<{ url: string; type: "image" | "video" }> {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "media");
        const res = await axios.post(`${apiBase}/v1/uploads`, form, {
            // no Content-Type: the browser sets the multipart boundary itself
            headers: { Authorization: `Bearer ${token()}` },
            timeout: 120_000,
        });
        const body = res.data?.data ?? res.data; // endpoint returns { url, type } unwrapped
        return { url: body.url, type: body.type === "video" ? "video" : "image" };
    }

    async function handleUpload(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = ""; // allow picking the same file again
        if (!file) return;
        setUploading("media");
        setMediaError(null);
        try {
            const { url, type } = await uploadFile(file);
            addToGallery({ url, type, source: "upload" });
        } catch (err) {
            console.error("Upload failed:", err);
            setMediaError(errorMessage(err, "Upload failed. Try again."));
        } finally {
            setUploading(null);
        }
    }

    async function handleProductUpload(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []).slice(0, 3 - productRefs.length);
        e.target.value = "";
        if (files.length === 0) return;
        setUploading("product");
        setMediaError(null);
        try {
            for (const file of files) {
                if (!file.type.startsWith("image/")) continue;
                const { url } = await uploadFile(file);
                setProductRefs((prev) => (prev.length >= 3 ? prev : [...prev, url]));
            }
        } catch (err) {
            console.error("Product photo upload failed:", err);
            setMediaError(errorMessage(err, "Upload failed. Try again."));
        } finally {
            setUploading(null);
        }
    }

    // ─── Save / Schedule / Publish ─────────────────────────

    // Creates the draft the first time, updates the same post after that
    async function persistDraft(): Promise<string> {
        // Carousel → ordered slide list. Single → just the selected item.
        const media: { url: string; type: string }[] =
            postMode === "carousel"
                ? slides.map((s) => ({ url: s.url, type: s.type }))
                : mediaUrl
                    ? [{ url: mediaUrl, type: mediaType ?? "image" }]
                    : [];
        const body = {
            caption,
            prompt,
            tone,
            language,
            channels: selectedChannels.map((c) => c.platform),
            media,
            // kept for older backends that only read a single item
            mediaUrl: media[0]?.url ?? null,
            mediaType: media[0]?.type ?? null,
        };
        const headers = { Authorization: `Bearer ${token()}` };

        if (postId) {
            await axios.put(`${apiBase}/v1/posts/${postId}`, body, { headers });
            return postId;
        }

        const res = await axios.post(`${apiBase}/v1/posts/draft`, body, { headers });
        const id: string = res.data.data.id;
        setPostId(id);
        return id;
    }

    async function handleSaveDraft() {
        setSaving(true);
        try {
            await persistDraft();
        } catch (err) {
            console.error("Save draft failed:", err);
        } finally {
            setSaving(false);
        }
    }

    async function handleSchedule() {
        setScheduling(true);
        try {
            const currentPostId = await persistDraft();

            const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}:00`).toISOString();
            await axios.post(
                `${apiBase}/v1/posts/${currentPostId}/schedule`,
                { scheduledAt },
                { headers: { Authorization: `Bearer ${token()}` } },
            );

            navigate("/dashboard");
        } catch (err) {
            console.error("Schedule failed:", err);
        } finally {
            setScheduling(false);
        }
    }

    async function handlePublishNow() {
        setPublishing(true);
        try {
            const currentPostId = await persistDraft();

            await axios.post(`${apiBase}/v1/posts/${currentPostId}/publish`, null, {
                headers: { Authorization: `Bearer ${token()}` },
            });

            navigate("/dashboard");
        } catch (err) {
            console.error("Publish failed:", err);
        } finally {
            setPublishing(false);
        }
    }

    // ─── Draft loading states ──────────────────────────────

    if (loadingDraft) {
        return (
            <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
                Opening draft…
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-3 text-center px-6">
                <p className="text-neutral-800">{loadError}</p>
                <button
                    onClick={() => navigate("/drafts")}
                    className="text-sm text-primary-500 underline underline-offset-4"
                >
                    Back to drafts
                </button>
            </div>
        );
    }

    // ─── Render ────────────────────────────────────────────

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-neutral-100">
                <div className="flex items-center gap-4">
                    <Logo variant="light" height={28} markOnly />
                    <div>
                        <h1 className="text-lg font-semibold text-neutral-900">{draftId ? "Edit draft" : "New post"}</h1>
                        <p className="text-xs text-neutral-400">{postId ? "Draft · saved" : "Draft · not saved yet"}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="h-9 px-4 text-sm font-medium text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    >
                        Discard
                    </button>
                    <Button variant="secondary" size="sm" onClick={handleSaveDraft} isLoading={saving}>
                        Save draft
                    </Button>
                    {scheduleType === "now" ? (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePublishNow}
                            isLoading={publishing}
                            disabled={!caption.trim() || selectedChannels.length === 0 || carouselNotReady}
                            title={carouselNotReady ? "A carousel needs at least 2 slides" : undefined}
                        >
                            {publishing ? "Publishing…" : "Post now"}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSchedule}
                            isLoading={scheduling}
                            disabled={!caption.trim() || selectedChannels.length === 0 || carouselNotReady}
                            title={carouselNotReady ? "A carousel needs at least 2 slides" : undefined}
                        >
                            {scheduling ? "Scheduling…" : "Schedule post"}
                        </Button>
                    )}
                </div>
            </header>

            {/* Content */}
            <div className="flex-1 flex">
                {/* Left column — Editor */}
                <div className="flex-1 border-r border-neutral-100 p-6 sm:p-10 overflow-auto">
                    <div className="max-w-[680px] space-y-8">
                        {/* Step 1: Write with AI */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-[var(--font-display)] text-neutral-900">Write with AI</h2>
                                <span className="text-xs font-semibold tracking-[0.1em] uppercase text-primary-500">
                                    Step 1
                                </span>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-1.5">
                                    What is this post about?
                                </label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Monsoon blend is back — warm, malty, best with rain"
                                    className="w-full min-h-[100px] px-3 py-2.5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-vertical"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-1.5">Language</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                    className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400 cursor-pointer"
                                >
                                    {LANGUAGES.map((l) => (
                                        <option key={l.code} value={l.code}>
                                            {l.label === l.native ? l.label : `${l.label} · ${l.native}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-2">Tone</label>
                                <div className="flex flex-wrap gap-2">
                                    {TONES.map((t) => (
                                        <button
                                            key={t.value}
                                            onClick={() => setTone(t.value)}
                                            className={`px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors cursor-pointer ${tone === t.value
                                                ? "border-primary-500 text-primary-500 bg-primary-50"
                                                : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <Button
                                variant="outline"
                                onClick={handleGenerate}
                                isLoading={generating}
                                disabled={!prompt.trim()}
                            >
                                {generating ? "Generating…" : "Generate caption"}
                            </Button>
                        </div>

                        {/* Caption */}
                        {caption && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl font-[var(--font-display)] text-neutral-900">Caption</h2>
                                    <span className="text-sm text-neutral-400">{charCount} characters</span>
                                </div>

                                <textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    className="w-full min-h-[150px] px-3 py-2.5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-vertical"
                                />

                                <div className="flex flex-wrap gap-2">
                                    {REFINE_ACTIONS.map((action) => (
                                        <button
                                            key={action.key}
                                            onClick={() => handleRefine(action.key)}
                                            disabled={refining !== null}
                                            className="px-4 py-2 rounded-[var(--radius-md)] text-sm font-medium border border-neutral-200 text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50 transition-colors cursor-pointer disabled:opacity-50"
                                        >
                                            {refining === action.key ? "Working…" : action.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Media */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-3">
                                <h2 className="text-xl font-[var(--font-display)] text-neutral-900">Media</h2>
                                {/* Single vs carousel */}
                                <div className="inline-flex rounded-[var(--radius-md)] border border-neutral-200 p-0.5">
                                    {(["single", "carousel"] as const).map((m) => (
                                        <button
                                            key={m}
                                            onClick={() => switchMode(m)}
                                            className={`px-4 py-1.5 rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-colors ${postMode === m
                                                ? "bg-primary-50 text-primary-500"
                                                : "text-neutral-500 hover:text-neutral-700"
                                                }`}
                                        >
                                            {m === "single" ? "Single image" : "Carousel"}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {postMode === "carousel" && (
                                <div className="rounded-[var(--radius-md)] border border-neutral-200 p-4 space-y-3">
                                    {/* One-click AI carousel */}
                                    <div className="flex flex-wrap items-center gap-3 p-3 rounded-[var(--radius-md)] bg-primary-50/40 border border-primary-100">
                                        <div className="flex-1 min-w-[200px]">
                                            <p className="text-sm font-medium text-neutral-900">Make a carousel with AI</p>
                                            <p className="text-xs text-neutral-500">
                                                Uses your post brief. Cover, content slides and a closing slide, all in one matching style.
                                            </p>
                                        </div>
                                        <select
                                            value={slideCount}
                                            onChange={(e) => setSlideCount(Number(e.target.value))}
                                            disabled={generatingCarousel}
                                            className="h-9 px-2 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 cursor-pointer"
                                            aria-label="Number of slides"
                                        >
                                            {[3, 4, 5, 6, 7, 8, 10].map((n) => (
                                                <option key={n} value={n}>
                                                    {n} slides
                                                </option>
                                            ))}
                                        </select>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleGenerateCarousel}
                                            isLoading={generatingCarousel}
                                            disabled={generatingCarousel || generatingImage || (!imagePrompt.trim() && !prompt.trim())}
                                        >
                                            {generatingCarousel ? "Making slides…" : "✨ Generate carousel"}
                                        </Button>
                                    </div>
                                    {generatingCarousel && (
                                        <p className="text-xs text-neutral-500">
                                            Planning the slides and designing each one. This takes about 1–2 minutes — keep this tab open.
                                        </p>
                                    )}
                                    {slides.length > 0 && !generatingCarousel && (
                                        <p className="text-xs text-neutral-400">
                                            Generating again replaces these slides. Older images stay in "Your versions" below.
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-medium text-neutral-800">
                                            Slides <span className="text-neutral-400 font-normal">· {slides.length}/{MAX_SLIDES}</span>
                                        </p>
                                        <p className="text-xs text-neutral-400">
                                            New images are added as the next slide. Click a version below to add or remove it.
                                        </p>
                                    </div>

                                    {slides.length === 0 ? (
                                        <p className="text-sm text-neutral-400">
                                            No slides yet. Make or upload images and they'll appear here in order.
                                        </p>
                                    ) : (
                                        <div className="flex gap-3 overflow-x-auto pb-1">
                                            {slides.map((s, i) => (
                                                <div key={s.url} className="shrink-0 w-24">
                                                    <div className="relative w-24 h-24 rounded-[var(--radius-sm)] overflow-hidden border border-neutral-200">
                                                        {s.type === "image" ? (
                                                            <img src={s.url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <video src={s.url} className="w-full h-full object-cover" muted />
                                                        )}
                                                        <span className="absolute top-1 left-1 min-w-5 h-5 px-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold flex items-center justify-center">
                                                            {i + 1}
                                                        </span>
                                                        <button
                                                            onClick={() => toggleSlide(s)}
                                                            className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] cursor-pointer hover:bg-black/80"
                                                            aria-label={`Remove slide ${i + 1}`}
                                                        >
                                                            ✕
                                                        </button>
                                                    </div>
                                                    <div className="flex justify-between mt-1">
                                                        <button
                                                            onClick={() => moveSlide(i, -1)}
                                                            disabled={i === 0}
                                                            className="px-2 text-sm text-neutral-500 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                                                            aria-label="Move left"
                                                        >
                                                            ←
                                                        </button>
                                                        <button
                                                            onClick={() => moveSlide(i, 1)}
                                                            disabled={i === slides.length - 1}
                                                            className="px-2 text-sm text-neutral-500 hover:text-neutral-800 disabled:opacity-30 cursor-pointer"
                                                            aria-label="Move right"
                                                        >
                                                            →
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {slides.length === 1 && (
                                        <p className="text-xs text-primary-600">Add at least one more slide to post a carousel.</p>
                                    )}
                                    <p className="text-xs text-neutral-400">
                                        Tip: keep every slide the same size — Instagram crops all slides to the shape of slide 1.
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-1.5">
                                    Describe the image <span className="text-neutral-400">(optional)</span>
                                </label>
                                <textarea
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    placeholder={prompt.trim() || "Filter coffee on a banana leaf, shot from above, soft morning light"}
                                    className="w-full min-h-[70px] px-3 py-2.5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-vertical"
                                />
                                <p className="mt-1.5 text-xs text-neutral-400">
                                    Leave blank to use the post brief. Your brand colours and logo from Settings are added automatically.
                                </p>
                            </div>

                            {/* Content type */}
                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-2">Type of post</label>
                                <div className="flex flex-wrap gap-2">
                                    {CONTENT_TYPES.map((t) => (
                                        <button
                                            key={t.value}
                                            onClick={() => setContentType(t.value)}
                                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium border transition-colors cursor-pointer ${contentType === t.value
                                                ? "border-primary-500 text-primary-500 bg-primary-50"
                                                : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Size */}
                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-2">Size</label>
                                <div className="flex flex-wrap gap-2">
                                    {ASPECTS.map((a) => (
                                        <button
                                            key={a.value}
                                            onClick={() => setAspect(a.value)}
                                            title={a.hint}
                                            className={`px-3 py-1.5 rounded-[var(--radius-md)] text-sm font-medium border transition-colors cursor-pointer ${aspect === a.value
                                                ? "border-primary-500 text-primary-500 bg-primary-50"
                                                : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                                }`}
                                        >
                                            {a.label} <span className="text-neutral-400 font-normal">{a.value}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Product photos the AI should keep */}
                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-1">
                                    Your product photo <span className="text-neutral-400">(optional, up to 3)</span>
                                </label>
                                <p className="text-xs text-neutral-400 mb-2">
                                    Add a photo of your real product and the AI will keep it exactly as it is in every image.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {productRefs.map((url) => (
                                        <div key={url} className="relative w-16 h-16 rounded-[var(--radius-sm)] overflow-hidden border border-neutral-200">
                                            <img src={url} alt="Product" className="w-full h-full object-cover" />
                                            <button
                                                onClick={() => setProductRefs((prev) => prev.filter((u) => u !== url))}
                                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] cursor-pointer hover:bg-black/80"
                                                aria-label="Remove product photo"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                    {productRefs.length < 3 && (
                                        <label className="w-16 h-16 rounded-[var(--radius-sm)] border border-dashed border-neutral-300 flex items-center justify-center text-neutral-400 text-xs cursor-pointer hover:border-primary-400 hover:text-primary-500">
                                            {uploading === "product" ? "…" : "+ Add"}
                                            <input
                                                type="file"
                                                className="hidden"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                disabled={uploading !== null}
                                                onChange={handleProductUpload}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            {/* Selected media */}
                            {mediaUrl && (
                                <div className="relative w-[280px] rounded-[var(--radius-md)] overflow-hidden border border-neutral-200 bg-neutral-50">
                                    {mediaType === "image" ? (
                                        <img src={mediaUrl} alt="Selected" className="w-full h-auto block" />
                                    ) : (
                                        <video src={mediaUrl} className="w-full h-auto block" controls />
                                    )}
                                    <a
                                        href={mediaUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="absolute top-2 left-2 px-2 py-1 rounded-[var(--radius-sm)] bg-black/60 text-[11px] font-medium text-white hover:bg-black/80"
                                    >
                                        Open full size
                                    </a>
                                    {mediaType === "image" && (
                                        <button
                                            onClick={handleGenerateImage}
                                            disabled={generatingImage}
                                            className="absolute bottom-2 right-2 px-3 py-1.5 rounded-[var(--radius-sm)] bg-black/60 text-xs font-medium text-white cursor-pointer hover:bg-black/80 disabled:opacity-50"
                                        >
                                            {generatingImage ? "Generating…" : "Make another"}
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Everything made or uploaded — older versions stay here */}
                            {(gallery.length > 1 || (postMode === "carousel" && gallery.length > 0) || generatingImage || generatingVideo || generatingCarousel) && (
                                <div>
                                    <p className="text-sm font-medium text-neutral-700 mb-2">
                                        Your versions{" "}
                                        <span className="text-neutral-400 font-normal">
                                            · {postMode === "carousel" ? "click to add or remove as a slide" : "click one to use it"}
                                        </span>
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {(generatingImage || generatingVideo || generatingCarousel) && (
                                            <div className="w-20 h-20 rounded-[var(--radius-sm)] border border-dashed border-primary-300 bg-primary-50/40 flex items-center justify-center text-[11px] text-primary-500 animate-pulse text-center px-1">
                                                Creating…
                                            </div>
                                        )}
                                        {gallery.map((item) => {
                                            const slideNo = slides.findIndex((s) => s.url === item.url) + 1;
                                            const highlighted = postMode === "carousel" ? slideNo > 0 : item.url === mediaUrl;
                                            return (
                                                <div
                                                    key={item.url}
                                                    className={`relative w-20 h-20 rounded-[var(--radius-sm)] overflow-hidden border-2 cursor-pointer ${highlighted ? "border-primary-500" : "border-transparent hover:border-neutral-300"}`}
                                                    onClick={() => selectMedia(item)}
                                                >
                                                    {postMode === "carousel" && slideNo > 0 && (
                                                        <span className="absolute bottom-1 left-1 min-w-5 h-5 px-1 rounded-full bg-primary-500 text-white text-[11px] font-semibold flex items-center justify-center z-10">
                                                            {slideNo}
                                                        </span>
                                                    )}
                                                    {item.type === "image" ? (
                                                        <img src={item.url} alt="Version" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <video src={item.url} className="w-full h-full object-cover" muted />
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            removeFromGallery(item.url);
                                                        }}
                                                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white text-[10px] cursor-pointer hover:bg-black/80"
                                                        aria-label="Remove"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {mediaError && (
                                <p className="text-sm text-primary-600 bg-primary-50 border border-primary-100 rounded-[var(--radius-md)] px-3 py-2">
                                    {mediaError}
                                </p>
                            )}

                            {generatingImage && (
                                <p className="text-xs text-neutral-500">
                                    Creating a high-quality image. This usually takes 30–60 seconds.
                                </p>
                            )}

                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={generatingImage || (!imagePrompt.trim() && !prompt.trim())}
                                    className={tileClass}
                                >
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <span className="text-xs font-medium">{generatingImage ? "Generating…" : "AI image"}</span>
                                </button>

                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={generatingVideo || !prompt.trim()}
                                    className={tileClass}
                                >
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                    <span className="text-xs font-medium">{generatingVideo ? "Generating…" : "AI video"}</span>
                                </button>

                                <button onClick={() => setPosterOpen(true)} className={tileClass}>
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm3 10h10M7 12h6M7 8h8" />
                                    </svg>
                                    <span className="text-xs font-medium">Poster</span>
                                </button>

                                <label className="w-[140px] h-[140px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-colors">
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    <span className="text-xs font-medium">{uploading === "media" ? "Uploading…" : "Upload"}</span>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                                        disabled={uploading !== null}
                                        onChange={handleUpload}
                                    />
                                </label>
                            </div>
                        </div>

                        {/* When to post */}
                        <div className="space-y-4">
                            <h2 className="text-xl font-[var(--font-display)] text-neutral-900">When to post</h2>

                            <div className="flex flex-wrap gap-2">
                                {SCHEDULE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setScheduleType(opt.value)}
                                        className={`px-5 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors cursor-pointer ${scheduleType === opt.value
                                            ? "border-primary-500 text-primary-500 bg-primary-50"
                                            : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                                            }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            {scheduleType !== "now" && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-neutral-700 block mb-1.5">Date</label>
                                        <input
                                            type="date"
                                            value={scheduleDate}
                                            onChange={(e) => setScheduleDate(e.target.value)}
                                            className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-neutral-700 block mb-1.5">Time (IST)</label>
                                        <input
                                            type="time"
                                            value={scheduleTime}
                                            onChange={(e) => setScheduleTime(e.target.value)}
                                            className="w-full h-11 px-3 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary-400"
                                        />
                                    </div>
                                </div>
                            )}

                            {scheduleType === "best" && (
                                <div className="flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-primary-50 border border-primary-100">
                                    <svg className="w-4 h-4 text-primary-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-sm text-primary-700">
                                        Your audience is most active Wednesdays around 11:30 am. Best-time posting picks the slot for each channel.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right column — Channels + Preview */}
                <div className="w-[380px] shrink-0 p-6 overflow-auto hidden lg:block">
                    {/* Channels */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-[var(--font-display)] text-neutral-900">Channels</h2>
                            <span className="text-sm text-neutral-400">
                                {selectedChannels.length} channel{selectedChannels.length !== 1 ? "s" : ""}
                            </span>
                        </div>

                        {channels.length === 0 ? (
                            <p className="text-sm text-neutral-400">No connected accounts yet.</p>
                        ) : (
                            <div className="space-y-2">
                                {channels.map((ch) => (
                                    <button
                                        key={ch.id}
                                        onClick={() => toggleChannel(ch.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-[var(--radius-md)] border transition-colors cursor-pointer text-left ${ch.selected
                                            ? "border-primary-500 bg-primary-50/30"
                                            : "border-neutral-200 hover:border-neutral-300"
                                            }`}
                                    >
                                        <div
                                            className={`w-10 h-10 rounded-[var(--radius-sm)] border flex items-center justify-center text-sm font-semibold shrink-0 ${ch.selected
                                                ? "border-primary-500 text-primary-500"
                                                : "border-neutral-200 text-neutral-500"
                                                }`}
                                        >
                                            {ch.letter}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-neutral-900">{ch.name}</p>
                                            <p className="text-xs text-neutral-400">{ch.detail}</p>
                                        </div>
                                        {ch.selected && (
                                            <svg className="w-5 h-5 text-primary-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                            </svg>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Preview */}
                    {caption && (
                        <div className="mt-8 space-y-4">
                            <h2 className="text-lg font-[var(--font-display)] text-neutral-900">Preview</h2>

                            <div className="rounded-[var(--radius-lg)] border border-neutral-200 overflow-hidden">
                                {firstChannel && (
                                    <div className="flex items-center gap-2.5 p-3 border-b border-neutral-100">
                                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-500">
                                            {firstChannel.letter}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-neutral-900">{firstChannel.name}</p>
                                            <p className="text-xs text-neutral-400 capitalize">{firstChannel.platform}</p>
                                        </div>
                                    </div>
                                )}

                                {postMode === "carousel" && slides.length > 0 ? (
                                    (() => {
                                        const idx = Math.min(previewIndex, slides.length - 1);
                                        const s = slides[idx]!;
                                        return (
                                            <div className="relative">
                                                {s.type === "image" ? (
                                                    <img src={s.url} alt={`Slide ${idx + 1}`} className="w-full h-auto block" />
                                                ) : (
                                                    <video src={s.url} className="w-full h-auto block" controls />
                                                )}
                                                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px]">
                                                    {idx + 1}/{slides.length}
                                                </span>
                                                {idx > 0 && (
                                                    <button
                                                        onClick={() => setPreviewIndex(idx - 1)}
                                                        className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow text-neutral-700 cursor-pointer"
                                                        aria-label="Previous slide"
                                                    >
                                                        ‹
                                                    </button>
                                                )}
                                                {idx < slides.length - 1 && (
                                                    <button
                                                        onClick={() => setPreviewIndex(idx + 1)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 shadow text-neutral-700 cursor-pointer"
                                                        aria-label="Next slide"
                                                    >
                                                        ›
                                                    </button>
                                                )}
                                                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                                                    {slides.map((sl, i) => (
                                                        <span
                                                            key={sl.url}
                                                            className={`w-1.5 h-1.5 rounded-full ${i === idx ? "bg-primary-500" : "bg-white/80"}`}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })()
                                ) : mediaUrl && mediaType === "image" ? (
                                    <img src={mediaUrl} alt="Preview" className="w-full h-auto block" />
                                ) : mediaUrl && mediaType === "video" ? (
                                    <video src={mediaUrl} className="w-full h-auto block" controls />
                                ) : (
                                    <div className="aspect-square bg-neutral-100 flex items-center justify-center text-neutral-300 text-sm">
                                        No media yet
                                    </div>
                                )}

                                <div className="p-3">
                                    <p className="text-sm text-neutral-800 whitespace-pre-wrap leading-relaxed">
                                        {caption.length > 200 ? caption.substring(0, 200) + "…" : caption}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Poster editor */}
            <PosterEditor
                open={posterOpen}
                backgroundUrl={mediaType === "image" ? mediaUrl : null}
                initialHeadline={prompt}
                language={language}
                onClose={() => setPosterOpen(false)}
                onUse={(url) => addToGallery({ url, type: "image", source: "poster" })}
            />
        </div>
    );
}