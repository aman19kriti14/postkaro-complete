import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { Clapperboard, ImagePlus, Loader2, Music, Sparkles, SlidersHorizontal, Wand2, X } from "lucide-react";
import { type LanguageCode, LANGUAGES } from "./languages";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
const token = () => localStorage.getItem("pk_access_token");
const auth = () => ({ Authorization: `Bearer ${token()}` });

const MAX_PHOTOS = 5;

const TONES = [
    { value: "warm", label: "Warm" },
    { value: "playful", label: "Playful" },
    { value: "informative", label: "Informative" },
    { value: "punchy", label: "Punchy" },
    { value: "storytelling", label: "Story" },
];

const CAMERA_LABEL: Record<string, string> = {
    push_in: "Push in",
    pull_out: "Pull out",
    pan_left: "Pan left",
    pan_right: "Pan right",
    tilt_up: "Tilt up",
    tilt_down: "Tilt down",
    orbit: "Orbit",
    parallax: "Parallax",
    whip_in: "Whip",
    static_zoom_punch: "Punch zoom",
};

// Shown while rendering, so a 2–3 minute wait feels like progress, not a freeze
const RENDER_STEPS_QUICK = ["Preparing shots…", "Adding camera moves…", "Timing cuts to the beat…", "Adding text…", "Finishing up…"];
const RENDER_STEPS_CINEMATIC = [
    "Preparing shots…",
    "Bringing your hook shot to life…",
    "Animating the final shot…",
    "Adding camera moves…",
    "Timing cuts to the beat…",
    "Colour grading…",
    "Finishing up…",
];

interface Shot {
    source: "upload" | "ai";
    photoIndex: number | null;
    imagePrompt: string;
    camera: string;
    aiMotion: string;
    text: string;
    seconds: number;
    treatment?: "full" | "card";
}

interface ReelPlan {
    hook: string;
    shots: Shot[];
    musicMood: string;
    bpm: number;
    colorGrade: string;
    caption: string;
}

interface RenderResult {
    url: string;
    seconds: number;
    shots: number;
    animatedShots: number;
    music: boolean;
    caption: string;
}

interface Channel {
    platform: string;
    name: string;
    selected: boolean;
}

type Stage = "idle" | "planning" | "rendering" | "done";

function errorMessage(err: unknown, fallback: string) {
    if (axios.isAxiosError(err)) {
        if (err.code === "ECONNABORTED") return "This is taking longer than usual. Try again in a minute.";
        return err.response?.data?.message ?? fallback;
    }
    return fallback;
}

export function QuickReelPage() {
    const navigate = useNavigate();
    const fileInput = useRef<HTMLInputElement>(null);
    const trackInput = useRef<HTMLInputElement>(null);

    const [photos, setPhotos] = useState<string[]>([]);
    const [uploading, setUploading] = useState(0);
    const [prompt, setPrompt] = useState("");
    const [tone, setTone] = useState("playful");
    const [language, setLanguage] = useState<LanguageCode>("ENGLISH");
    const [quality, setQuality] = useState<"quick" | "cinematic">("cinematic");
    const [showOptions, setShowOptions] = useState(false);
    const [music, setMusic] = useState<"auto" | "own" | "none">("auto");
    const [track, setTrack] = useState<{ url: string; name: string } | null>(null);
    const [uploadingTrack, setUploadingTrack] = useState(false);

    const [stage, setStage] = useState<Stage>("idle");
    const [plan, setPlan] = useState<ReelPlan | null>(null);
    const [result, setResult] = useState<RenderResult | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [needsUpgrade, setNeedsUpgrade] = useState(false);
    const [elapsed, setElapsed] = useState(0);

    const [channels, setChannels] = useState<Channel[]>([]);
    const [sending, setSending] = useState<"now" | "draft" | null>(null);
    const [sendError, setSendError] = useState<string | null>(null);

    useEffect(() => {
        axios
            .get(`${apiBase}/v1/auth/me`, { headers: auth() })
            .then((res) => {
                const accounts = res.data.data.connectedAccounts || [];
                setChannels(
                    accounts.map((a: any) => ({
                        platform: a.platform,
                        name: a.platformDisplayName || a.platformUsername,
                        selected: a.platform === "instagram" || a.platform === "facebook",
                    })),
                );
            })
            .catch(() => setChannels([]));
    }, []);

    // Elapsed-time ticker while working
    useEffect(() => {
        if (stage !== "planning" && stage !== "rendering") return;
        setElapsed(0);
        const t = setInterval(() => setElapsed((s) => s + 1), 1000);
        return () => clearInterval(t);
    }, [stage]);

    const busy = stage === "planning" || stage === "rendering";
    const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? "English";
    const steps = quality === "cinematic" ? RENDER_STEPS_CINEMATIC : RENDER_STEPS_QUICK;
    const stepEvery = quality === "cinematic" ? 22 : 8; // seconds per status line
    const renderStep = steps[Math.min(steps.length - 1, Math.floor(elapsed / stepEvery))];

    async function handleFiles(e: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - photos.length);
        e.target.value = "";
        if (!files.length) return;

        setUploading(files.length);
        setError(null);
        try {
            const urls = await Promise.all(
                files.map(async (file) => {
                    const form = new FormData();
                    form.append("file", file);
                    form.append("kind", "media");
                    const res = await axios.post(`${apiBase}/v1/uploads`, form, { headers: auth(), timeout: 120_000 });
                    const body = res.data?.data ?? res.data;
                    return body.url as string;
                }),
            );
            setPhotos((prev) => [...prev, ...urls].slice(0, MAX_PHOTOS));
        } catch (err) {
            setError(errorMessage(err, "Couldn't upload those photos. Try again."));
        } finally {
            setUploading(0);
        }
    }

    async function handleTrack(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;
        setUploadingTrack(true);
        setError(null);
        try {
            const form = new FormData();
            form.append("file", file);
            form.append("kind", "audio");
            const res = await axios.post(`${apiBase}/v1/uploads`, form, { headers: auth(), timeout: 120_000 });
            const body = res.data?.data ?? res.data;
            setTrack({ url: body.url, name: file.name });
            setMusic("own");
        } catch (err) {
            setError(errorMessage(err, "Couldn't upload that track. Try an MP3 under 15 MB."));
        } finally {
            setUploadingTrack(false);
        }
    }

    async function handleCreate() {
        if (!prompt.trim() || busy) return;
        setError(null);
        setNeedsUpgrade(false);
        setPlan(null);
        setResult(null);
        setDraftId(null);
        setSendError(null);

        // 1. Plan
        setStage("planning");
        let planned: ReelPlan;
        try {
            const res = await axios.post(
                `${apiBase}/v1/reels/plan`,
                { prompt: prompt.trim(), photoUrls: photos, language: langLabel, tone },
                { headers: auth(), timeout: 120_000 },
            );
            planned = res.data.data;
            setPlan(planned);
            setCaption(planned.caption ?? "");
        } catch (err) {
            setError(errorMessage(err, "Couldn't plan the reel. Try again."));
            setStage("idle");
            return;
        }

        // 2. Render
        setStage("rendering");
        try {
            const res = await axios.post(
                `${apiBase}/v1/reels/render`,
                {
                    plan: planned,
                    photoUrls: photos,
                    quality,
                    music: music === "none" ? "none" : "auto",
                    musicUrl: music === "own" ? track?.url : undefined,
                    prompt: prompt.trim(),
                    tone,
                    channels: channels.filter((c) => c.selected).map((c) => c.platform),
                },
                { headers: auth(), timeout: 480_000 },
            );
            // The backend saves every finished reel to Drafts, so it's never lost
            const done: RenderResult = res.data.data.reel;
            setResult(done);
            setDraftId(res.data.data.draftId);
            setStage("done");
        } catch (err) {
            if (axios.isAxiosError(err) && err.response?.status === 402) setNeedsUpgrade(true);
            setError(errorMessage(err, "Couldn't render the reel. Try again."));
            setStage("idle");
        }
    }

    async function send(mode: "now" | "draft") {
        if (!result || !draftId) return;
        const selected = channels.filter((c) => c.selected);
        if (mode === "now" && selected.length === 0) {
            setSendError("Pick at least one channel.");
            return;
        }
        setSending(mode);
        setSendError(null);
        try {
            // Bring the saved draft up to date with the caption and channels on screen
            await axios.put(
                `${apiBase}/v1/posts/${draftId}`,
                { caption, channels: selected.map((c) => c.platform) },
                { headers: auth() },
            );
            if (mode === "now") {
                await axios.post(`${apiBase}/v1/posts/${draftId}/publish`, null, { headers: auth(), timeout: 180_000 });
                navigate("/dashboard");
            } else {
                navigate(`/create/advanced?draft=${draftId}`);
            }
        } catch (err) {
            setSendError(errorMessage(err, mode === "now" ? "Couldn't post. Try again." : "Couldn't save. Try again."));
        } finally {
            setSending(null);
        }
    }

    const chip = (active: boolean) =>
        `rounded-full border px-3 py-1.5 text-sm transition ${active ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]" : "border-neutral-200 text-neutral-600 hover:border-neutral-400"
        }`;

    return (
        <div className="mx-auto max-w-[1100px] px-4 py-6 sm:px-8 sm:py-10">
            {/* Header + Post / Reel switch */}
            <div className="flex flex-wrap items-center justify-between gap-4">
                <h1 className="font-serif text-3xl text-neutral-900">New reel</h1>
                <div className="flex rounded-lg border border-neutral-200 p-1 text-sm">
                    <Link to="/create" className="rounded-md px-4 py-1.5 text-neutral-500 hover:text-neutral-900">
                        Post
                    </Link>
                    <span className="rounded-md bg-neutral-900 px-4 py-1.5 text-white">Reel</span>
                </div>
            </div>

            <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
                {/* Left: inputs */}
                <div className="space-y-5">
                    {/* Photos */}
                    <div>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                            Your photos <span className="normal-case tracking-normal">(optional, up to 5 — AI fills the rest)</span>
                        </p>
                        <div className="flex flex-wrap gap-3">
                            {photos.map((url, i) => (
                                <div key={url} className="group relative h-28 w-20 overflow-hidden rounded-lg bg-neutral-100">
                                    <img src={url} alt="" className="h-full w-full object-cover" />
                                    <button
                                        onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                                        disabled={busy}
                                        className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                                        aria-label="Remove photo"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                            {Array.from({ length: uploading }).map((_, i) => (
                                <div key={`up-${i}`} className="flex h-28 w-20 items-center justify-center rounded-lg bg-neutral-100">
                                    <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
                                </div>
                            ))}
                            {photos.length + uploading < MAX_PHOTOS && (
                                <button
                                    onClick={() => fileInput.current?.click()}
                                    disabled={busy}
                                    className="flex h-28 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400 transition hover:border-[#C8102E] hover:text-[#C8102E] disabled:opacity-40"
                                >
                                    <ImagePlus className="h-5 w-5" />
                                    Add
                                </button>
                            )}
                            <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
                        </div>
                    </div>

                    {/* Brief */}
                    <div className="rounded-xl border border-neutral-200 p-4 sm:p-5">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={busy}
                            rows={3}
                            placeholder="What's the reel about? e.g. Our new cold coffee, only 149 rs this weekend"
                            className="w-full resize-none text-[15px] text-neutral-900 outline-none placeholder:text-neutral-400"
                        />

                        {/* Quality */}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setQuality("quick")}
                                disabled={busy}
                                className={`rounded-lg border p-3 text-left transition ${quality === "quick" ? "border-neutral-900" : "border-neutral-200 hover:border-neutral-400"
                                    }`}
                            >
                                <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                                    <Clapperboard className="h-4 w-4" /> Quick
                                </span>
                                <span className="mt-0.5 block text-xs text-neutral-500">Camera moves, beat cuts · ~1 min</span>
                            </button>
                            <button
                                onClick={() => setQuality("cinematic")}
                                disabled={busy}
                                className={`rounded-lg border p-3 text-left transition ${quality === "cinematic" ? "border-[#C8102E] bg-[#C8102E]/5" : "border-neutral-200 hover:border-neutral-400"
                                    }`}
                            >
                                <span className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                                    <Wand2 className="h-4 w-4 text-[#C8102E]" /> Cinematic
                                    <span className="rounded bg-[#C8102E] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-white">
                                        Growth
                                    </span>
                                </span>
                                <span className="mt-0.5 block text-xs text-neutral-500">Real AI motion on key shots · ~3 min</span>
                            </button>
                        </div>

                        {/* Music */}
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                            <Music className="h-4 w-4 text-neutral-400" />
                            <button onClick={() => setMusic("auto")} disabled={busy} className={chip(music === "auto")}>
                                AI music
                            </button>
                            <button
                                onClick={() => (track ? setMusic("own") : trackInput.current?.click())}
                                disabled={busy || uploadingTrack}
                                className={chip(music === "own")}
                            >
                                {uploadingTrack ? "Uploading…" : track ? `♪ ${track.name.slice(0, 22)}` : "My track"}
                            </button>
                            {track && (
                                <button
                                    onClick={() => trackInput.current?.click()}
                                    disabled={busy}
                                    className="text-xs text-neutral-400 underline hover:text-neutral-700"
                                >
                                    change
                                </button>
                            )}
                            <button onClick={() => setMusic("none")} disabled={busy} className={chip(music === "none")}>
                                No music
                            </button>
                            <input ref={trackInput} type="file" accept="audio/*" hidden onChange={handleTrack} />
                        </div>
                        {music === "auto" && (
                            <p className="mt-1.5 text-xs text-neutral-400">
                                An original track composed for this reel — no copyright strikes, no muted reels.
                            </p>
                        )}
                        {music === "own" && (
                            <p className="mt-1.5 text-xs text-neutral-400">Only use music you have the rights to.</p>
                        )}

                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                            <button
                                onClick={() => setShowOptions((v) => !v)}
                                className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-900"
                            >
                                <SlidersHorizontal className="h-4 w-4" />
                                {TONES.find((t) => t.value === tone)?.label} · {langLabel}
                            </button>
                            <button
                                onClick={handleCreate}
                                disabled={!prompt.trim() || busy || uploading > 0}
                                className="flex items-center gap-2 rounded-lg bg-[#C8102E] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#a50d26] disabled:opacity-40"
                            >
                                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                {busy ? "Creating…" : result ? "Create again" : "Create reel"}
                            </button>
                        </div>

                        {showOptions && (
                            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-neutral-100 pt-4">
                                {TONES.map((t) => (
                                    <button key={t.value} onClick={() => setTone(t.value)} className={chip(tone === t.value)}>
                                        {t.label}
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
                        )}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-[#C8102E]/30 p-4 text-sm text-[#C8102E]">
                            {error}
                            {needsUpgrade && (
                                <Link to="/billing" className="ml-2 font-medium underline">
                                    See plans
                                </Link>
                            )}
                        </div>
                    )}

                    {/* Storyboard — shows the AI's plan while the video renders */}
                    {plan && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">
                                Storyboard · {plan.shots.length} shots · {plan.musicMood}
                            </p>
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {plan.shots.map((s, i, all) => {
                                    const img = s.source === "upload" && s.photoIndex != null ? photos[s.photoIndex] : null;
                                    // Same rule as the backend: AI motion on the first and last full-frame shots
                                    const full = all.map((x, j) => (x.treatment === "card" ? -1 : j)).filter((j) => j >= 0);
                                    const animated =
                                        quality === "cinematic" && full.length > 0 && (i === full[0] || i === full[full.length - 1]);
                                    return (
                                        <div key={i} className="w-28 shrink-0">
                                            <div className="relative h-40 overflow-hidden rounded-lg bg-neutral-900">
                                                {img ? (
                                                    <img src={img} alt="" className="h-full w-full object-cover opacity-80" />
                                                ) : (
                                                    <div className="flex h-full items-center justify-center p-2 text-center text-[11px] text-neutral-400">
                                                        AI shot
                                                    </div>
                                                )}
                                                {s.text && (
                                                    <span className="absolute inset-x-1 top-1/3 rounded bg-black/60 px-1 py-0.5 text-center text-[10px] font-semibold leading-tight text-white">
                                                        {s.text}
                                                    </span>
                                                )}
                                                {animated && (
                                                    <span className="absolute left-1 top-1 rounded bg-[#C8102E] px-1 text-[9px] font-semibold uppercase text-white">
                                                        AI motion
                                                    </span>
                                                )}
                                            </div>
                                            <p className="mt-1 text-[11px] text-neutral-500">
                                                {i + 1}. {s.treatment === "card" ? "Screen card" : CAMERA_LABEL[s.camera] ?? s.camera}
                                            </p>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Caption */}
                    {stage === "done" && result && (
                        <div>
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-400">Caption</p>
                            <textarea
                                value={caption}
                                onChange={(e) => setCaption(e.target.value)}
                                rows={Math.max(5, caption.split("\n").length + 1)}
                                className="w-full resize-none rounded-xl border border-neutral-200 p-4 text-[15px] leading-relaxed text-neutral-900 outline-none focus:border-neutral-400"
                            />
                        </div>
                    )}
                </div>

                {/* Right: the phone-shaped preview */}
                <div>
                    <div className="mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] border-neutral-900 bg-neutral-900">
                        {stage === "done" && result ? (
                            <video src={result.url} controls autoPlay loop playsInline className="h-full w-full object-cover" />
                        ) : busy ? (
                            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-sm text-neutral-300">
                                <Loader2 className="h-6 w-6 animate-spin" />
                                <span>{stage === "planning" ? "Directing your reel…" : renderStep}</span>
                                <span className="text-xs text-neutral-500">{elapsed}s</span>
                            </div>
                        ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-8 text-center text-sm text-neutral-500">
                                <Clapperboard className="h-6 w-6" />
                                Your reel will play here
                            </div>
                        )}
                    </div>
                    {result && (
                        <p className="mt-2 text-center text-xs text-neutral-400">
                            {Math.round(result.seconds)}s · {result.shots} shots
                            {result.animatedShots > 0 ? ` · ${result.animatedShots} with AI motion` : ""}
                            {result.music ? " · ♪ music" : ""}
                        </p>
                    )}
                    {draftId && (
                        <p className="mt-1 text-center text-xs text-emerald-600">
                            ✓ Saved to <Link to="/drafts" className="underline">Drafts</Link>
                        </p>
                    )}
                </div>
            </div>

            {/* Post bar */}
            {stage === "done" && result && (
                <div className="sticky bottom-0 mt-8 border-t border-neutral-200 bg-white py-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap gap-2">
                            {channels.length === 0 && (
                                <button onClick={() => navigate("/connect-accounts")} className="text-sm text-[#C8102E] underline">
                                    Connect a channel to post
                                </button>
                            )}
                            {channels.map((c) => (
                                <button
                                    key={c.platform}
                                    onClick={() =>
                                        setChannels((prev) =>
                                            prev.map((x) => (x.platform === c.platform ? { ...x, selected: !x.selected } : x)),
                                        )
                                    }
                                    className={chip(c.selected)}
                                >
                                    {c.name}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <a
                                href={result.url}
                                download
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 transition hover:border-neutral-500"
                            >
                                Download
                            </a>
                            <button
                                onClick={() => send("draft")}
                                disabled={sending !== null}
                                className="rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-700 transition hover:border-neutral-500 disabled:opacity-40"
                            >
                                {sending === "draft" ? "Saving…" : "Schedule…"}
                            </button>
                            <button
                                onClick={() => send("now")}
                                disabled={sending !== null}
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