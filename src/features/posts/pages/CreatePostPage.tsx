import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import axios from "axios";
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
    { key: "hindi", label: "Translate to Hindi" },
];

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
    const [loadingDraft, setLoadingDraft] = useState(!!draftId);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [draftChannels, setDraftChannels] = useState<string[] | null>(null);

    // Form state
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState("warm");
    const [caption, setCaption] = useState("");
    const [channels, setChannels] = useState<ChannelOption[]>([]);
    const [scheduleType, setScheduleType] = useState("best");
    const [scheduleDate, setScheduleDate] = useState("");
    const [scheduleTime, setScheduleTime] = useState("");
    const [postId, setPostId] = useState<string | null>(null);

    // Media state
    const [mediaUrl, setMediaUrl] = useState<string | null>(null);
    const [mediaType, setMediaType] = useState<string | null>(null);

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
                setCaption(p.caption ?? "");
                const first = p.media?.[0];
                if (first?.url) {
                    setMediaUrl(first.url);
                    setMediaType(first.type === "video" ? "video" : "image");
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
        setChannels((prev) =>
            prev.map((c) => ({ ...c, selected: draftChannels.includes(c.platform) }))
        );
        setDraftChannels(null); // apply once, then let the user change them
    }, [draftChannels, channels.length]);

    const selectedChannels = channels.filter((c) => c.selected);
    const charCount = caption.length;
    const firstChannel = selectedChannels.length > 0 ? selectedChannels[0]! : null;

    function toggleChannel(id: string) {
        setChannels((prev) =>
            prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
        );
    }

    // ─── AI Caption ────────────────────────────────────────

    async function handleGenerate() {
        if (!prompt.trim()) return;
        setGenerating(true);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-caption`,
                { caption, prompt, tone, channels: selectedChannels.map((c) => c.platform), mediaUrl, mediaType },
                { headers: { Authorization: `Bearer ${token()}` } }
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
                { caption, action },
                { headers: { Authorization: `Bearer ${token()}` } }
            );
            setCaption(res.data.data.caption);
        } catch (err) {
            console.error("Refine failed:", err);
        } finally {
            setRefining(null);
        }
    }

    // ─── AI Media ──────────────────────────────────────────

    async function handleGenerateImage() {
        if (!prompt.trim()) return;
        setGeneratingImage(true);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-image`,
                { prompt: prompt.trim(), size: "square" },
                { headers: { Authorization: `Bearer ${token()}` } }
            );
            setMediaUrl(res.data.data.url);
            setMediaType("image");
        } catch (err) {
            console.error("Image generation failed:", err);
        } finally {
            setGeneratingImage(false);
        }
    }

    async function handleGenerateVideo() {
        if (!prompt.trim()) return;
        setGeneratingVideo(true);
        try {
            const res = await axios.post(
                `${apiBase}/v1/posts/generate-video`,
                { prompt: prompt.trim() },
                { headers: { Authorization: `Bearer ${token()}` } }
            );
            setMediaUrl(res.data.data.url);
            setMediaType("video");
        } catch (err) {
            console.error("Video generation failed:", err);
        } finally {
            setGeneratingVideo(false);
        }
    }

    // ─── Save / Schedule / Publish ─────────────────────────

    // Creates the draft the first time, updates the same post after that
    async function persistDraft(): Promise<string> {
        const body = {
            caption,
            prompt,
            tone,
            channels: selectedChannels.map((c) => c.platform),
            mediaUrl,
            mediaType,
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
                { headers: { Authorization: `Bearer ${token()}` } }
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

            await axios.post(
                `${apiBase}/v1/posts/${currentPostId}/publish`,
                null,
                { headers: { Authorization: `Bearer ${token()}` } }
            );

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
                        <p className="text-xs text-neutral-400">
                            {postId ? "Draft · saved" : "Draft · not saved yet"}
                        </p>
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
                            disabled={!caption.trim() || selectedChannels.length === 0}
                        >
                            {publishing ? "Publishing…" : "Post now"}
                        </Button>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSchedule}
                            isLoading={scheduling}
                            disabled={!caption.trim() || selectedChannels.length === 0}
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
                                <span className="text-xs font-semibold tracking-[0.1em] uppercase text-primary-500">Step 1</span>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-neutral-700 block mb-1.5">What is this post about?</label>
                                <textarea
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Monsoon blend is back — warm, malty, best with rain"
                                    className="w-full min-h-[100px] px-3 py-2.5 rounded-[var(--radius-md)] border border-neutral-200 bg-white text-sm text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent resize-vertical"
                                />
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

                            <Button variant="outline" onClick={handleGenerate} isLoading={generating} disabled={!prompt.trim()}>
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
                            <h2 className="text-xl font-[var(--font-display)] text-neutral-900">Media</h2>

                            {mediaUrl && (
                                <div className="relative w-[280px] h-[280px] rounded-[var(--radius-md)] overflow-hidden border border-neutral-200">
                                    {mediaType === "image" ? (
                                        <img src={mediaUrl} alt="Generated" className="w-full h-full object-cover" />
                                    ) : (
                                        <video src={mediaUrl} className="w-full h-full object-cover" controls />
                                    )}
                                    <button
                                        onClick={() => { setMediaUrl(null); setMediaType(null); }}
                                        className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center text-white text-xs cursor-pointer hover:bg-black/70"
                                    >
                                        ✕
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={generatingImage || !prompt.trim()}
                                    className="w-[140px] h-[140px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                    </svg>
                                    <span className="text-xs font-medium">{generatingImage ? "Generating…" : "AI image"}</span>
                                </button>

                                <button
                                    onClick={handleGenerateVideo}
                                    disabled={generatingVideo || !prompt.trim()}
                                    className="w-[140px] h-[140px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 cursor-pointer hover:border-primary-400 hover:bg-primary-50/30 hover:text-primary-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                                    </svg>
                                    <span className="text-xs font-medium">{generatingVideo ? "Generating…" : "AI video"}</span>
                                </button>

                                <label className="w-[140px] h-[140px] rounded-[var(--radius-md)] border border-dashed border-neutral-300 flex flex-col items-center justify-center text-neutral-400 cursor-pointer hover:border-neutral-400 hover:bg-neutral-50 transition-colors">
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    <span className="text-xs font-medium">Upload</span>
                                    <input type="file" className="hidden" accept="image/*,video/*" />
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
                                            className={`w-10 h-10 rounded-[var(--radius-sm)] border flex items-center justify-center text-sm font-semibold shrink-0 ${ch.selected ? "border-primary-500 text-primary-500" : "border-neutral-200 text-neutral-500"
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

                                {mediaUrl && mediaType === "image" ? (
                                    <img src={mediaUrl} alt="Preview" className="w-full aspect-square object-cover" />
                                ) : mediaUrl && mediaType === "video" ? (
                                    <video src={mediaUrl} className="w-full aspect-square object-cover" controls />
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
        </div>
    );
}