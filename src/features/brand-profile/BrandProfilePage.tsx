import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Globe, Loader2, Palette, RefreshCw, TrendingUp } from "lucide-react";
import { brandProfileApi, apiError, type BrandProfile } from "./api";
import { SuggestedPrompts } from "./SuggestedPrompts";

const POLL_MS = 2000;

const STEPS = ["Reading your website…", "Reading your recent posts…", "Learning your style…"];

export function BrandProfilePage() {
    const [params] = useSearchParams();
    const welcome = params.get("welcome") === "1";

    const [profile, setProfile] = useState<BrandProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [website, setWebsite] = useState("");
    const [starting, setStarting] = useState(false);
    const [applying, setApplying] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const timer = useRef<number | null>(null);

    // ---------- load + poll ----------

    const load = useCallback(async () => {
        try {
            const p = await brandProfileApi.get();
            setProfile(p);
            setWebsite((w) => w || p.websiteUrl || "");
            setError(null);
        } catch (err) {
            setError(apiError(err, "Couldn't load your brand profile"));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    useEffect(() => {
        if (profile?.status !== "RUNNING") return;
        timer.current = window.setTimeout(load, POLL_MS);
        return () => {
            if (timer.current) window.clearTimeout(timer.current);
        };
    }, [profile, load]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    // ---------- actions ----------

    const analyze = async () => {
        setStarting(true);
        setError(null);
        try {
            setProfile(await brandProfileApi.analyze(website));
        } catch (err) {
            setError(apiError(err, "Couldn't start. Check the website address."));
        } finally {
            setStarting(false);
        }
    };

    const applyToBrand = async () => {
        setApplying(true);
        try {
            setProfile(await brandProfileApi.apply(true));
            setToast("Saved to Settings › Brand");
        } catch (err) {
            setToast(apiError(err, "Couldn't save to brand settings"));
        } finally {
            setApplying(false);
        }
    };

    // ---------- render ----------

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 text-neutral-500">
                <Loader2 className="w-5 h-5 animate-spin" />
            </div>
        );
    }

    const status = profile?.status ?? "IDLE";
    const a = profile?.analysis;
    const running = status === "RUNNING";

    return (
        <div className="max-w-6xl mx-auto px-6 py-10 space-y-10">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                <div>
                    <p className="text-xs font-medium tracking-[0.18em] uppercase text-primary-500">Your brand</p>
                    <h1 className="mt-2 text-4xl font-[var(--font-display)] text-neutral-900">
                        {a && status !== "RUNNING"
                            ? "Here's what we learned"
                            : welcome
                                ? "Let's learn your brand"
                                : "Teach PostKaro your brand"}
                    </h1>
                    <p className="mt-2 text-neutral-600 max-w-xl">
                        We read your website and recent posts so every caption and idea sounds like you — not like
                        a robot.
                    </p>
                    {a && profile?.analyzedAt && !running && (
                        <p className="mt-2 text-sm text-neutral-500">
                            Based on {profile.websitePagesRead} website page
                            {profile.websitePagesRead === 1 ? "" : "s"} and {profile.postsRead} post
                            {profile.postsRead === 1 ? "" : "s"} · {new Date(profile.analyzedAt).toLocaleDateString()}
                        </p>
                    )}
                </div>
                {welcome && (
                    <Link to="/dashboard" className="text-sm text-neutral-600 hover:text-neutral-900 underline">
                        Go to dashboard →
                    </Link>
                )}
            </header>

            {/* Website + start / refresh */}
            {!running && (
                <section className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6">
                    <label className="text-sm font-medium text-neutral-800">Your website</label>
                    <div className="mt-2 flex flex-col sm:flex-row gap-3">
                        <div className="flex-1 flex items-center gap-2 h-11 px-3 rounded-[var(--radius-md)] border border-neutral-300 focus-within:border-neutral-900">
                            <Globe className="w-4 h-4 text-neutral-400" />
                            <input
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                placeholder="yourbrand.in (optional if you've connected accounts)"
                                className="flex-1 outline-none text-sm bg-transparent"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={analyze}
                            disabled={starting}
                            className="h-11 px-5 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-60 cursor-pointer"
                        >
                            {starting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : a ? (
                                <RefreshCw className="w-4 h-4" />
                            ) : null}
                            {a ? "Refresh" : "Learn my brand"}
                        </button>
                    </div>
                    {(error || (status === "FAILED" && profile?.statusMessage)) && (
                        <p className="mt-3 text-sm text-error-500">{error ?? profile?.statusMessage}</p>
                    )}
                    {a?.websiteError && !error && (
                        <p className="mt-3 text-sm text-warning-500">Website: {a.websiteError}</p>
                    )}
                </section>
            )}

            {/* Progress */}
            {running && (
                <section className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-8">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                        <p className="text-lg text-neutral-900">{profile?.statusMessage ?? "Getting started…"}</p>
                    </div>
                    <ol className="mt-6 space-y-3">
                        {STEPS.map((s) => {
                            const current = STEPS.indexOf(profile?.statusMessage ?? "");
                            const i = STEPS.indexOf(s);
                            const done = current > i;
                            const active = current === i;
                            return (
                                <li key={s} className="flex items-center gap-3 text-sm">
                                    <span
                                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${done
                                            ? "bg-neutral-900 border-neutral-900 text-white"
                                            : active
                                                ? "border-primary-500"
                                                : "border-neutral-300"
                                            }`}
                                    >
                                        {done && <Check className="w-3 h-3" />}
                                    </span>
                                    <span className={done || active ? "text-neutral-900" : "text-neutral-400"}>
                                        {s.replace("…", "")}
                                    </span>
                                </li>
                            );
                        })}
                    </ol>
                    <p className="mt-6 text-sm text-neutral-500">
                        Usually under a minute. You can leave this page — we'll keep going.
                    </p>
                </section>
            )}

            {/* Results */}
            {a && !running && (
                <>
                    {/* Starter prompts first — it's what they came for */}
                    {a.starterPrompts && a.starterPrompts.length > 0 && (
                        <section>
                            <SectionTitle
                                title="Posts you could make this week"
                                sub="Written from your real products and what works for you. Click one to start."
                            />
                            <SuggestedPrompts prompts={a.starterPrompts} />
                        </section>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* About */}
                        <Card title="About your business" className="lg:col-span-2">
                            {a.businessSummary && <p className="text-neutral-700 leading-relaxed">{a.businessSummary}</p>}
                            {a.audience && (
                                <p className="mt-3 text-sm text-neutral-600">
                                    <span className="font-medium text-neutral-800">Audience: </span>
                                    {a.audience}
                                </p>
                            )}
                            {a.offerings && a.offerings.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {a.offerings.map((o) => (
                                        <Chip key={o}>{o}</Chip>
                                    ))}
                                </div>
                            )}
                            {a.differentiators && a.differentiators.length > 0 && (
                                <ul className="mt-4 space-y-1 text-sm text-neutral-600 list-disc pl-5">
                                    {a.differentiators.map((d) => (
                                        <li key={d}>{d}</li>
                                    ))}
                                </ul>
                            )}
                        </Card>

                        {/* Look */}
                        <Card title="Your look">
                            {a.detected?.logoUrl && (
                                <img
                                    src={a.detected.logoUrl}
                                    alt="Logo"
                                    className="h-14 w-auto object-contain mb-4"
                                    onError={(e) => (e.currentTarget.style.display = "none")}
                                />
                            )}
                            {a.detected?.colors && a.detected.colors.length > 0 ? (
                                <div className="flex gap-2">
                                    {a.detected.colors.map((c) => (
                                        <div key={c} className="text-center">
                                            <div
                                                className="w-10 h-10 rounded-[var(--radius-md)] border border-neutral-200"
                                                style={{ background: c }}
                                            />
                                            <p className="mt-1 text-[10px] text-neutral-500">{c}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-neutral-500 flex items-center gap-2">
                                    <Palette className="w-4 h-4" /> No colours found
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={applyToBrand}
                                disabled={applying}
                                className="mt-5 h-10 px-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-primary-500 text-primary-500 text-sm font-medium hover:bg-primary-50 disabled:opacity-60 cursor-pointer"
                            >
                                {applying && <Loader2 className="w-4 h-4 animate-spin" />}
                                Save to brand settings
                            </button>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Voice */}
                        {a.voice && (
                            <Card title="How you sound">
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <Chip strong>{a.voice.tone}</Chip>
                                    {a.languages?.map((l) => (
                                        <Chip key={l}>{l}</Chip>
                                    ))}
                                    {a.captionStyle?.length && <Chip>{a.captionStyle.length} captions</Chip>}
                                    {a.captionStyle?.emojis && <Chip>{a.captionStyle.emojis} emojis</Chip>}
                                </div>
                                <p className="text-neutral-700 leading-relaxed">{a.voice.description}</p>
                                {(a.voice.wordsToUse?.length ?? 0) > 0 && (
                                    <p className="mt-3 text-sm text-neutral-600">
                                        <span className="font-medium text-neutral-800">You say: </span>
                                        {a.voice.wordsToUse.join(", ")}
                                    </p>
                                )}
                                {a.signatureHashtags && a.signatureHashtags.length > 0 && (
                                    <p className="mt-2 text-sm text-primary-500">{a.signatureHashtags.join(" ")}</p>
                                )}
                            </Card>
                        )}

                        {/* What works */}
                        <Card title="What works for you">
                            {a.whatWorks && a.whatWorks.length > 0 ? (
                                <ul className="space-y-2">
                                    {a.whatWorks.map((w) => (
                                        <li key={w} className="flex gap-2 text-neutral-700">
                                            <TrendingUp className="w-4 h-4 mt-1 shrink-0 text-primary-500" />
                                            {w}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-neutral-500">
                                    Connect Instagram or Facebook and post a few times — we'll learn from your numbers.
                                </p>
                            )}
                            {a.formatStats && a.formatStats.length > 0 && (
                                <table className="mt-4 w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-neutral-500 border-b border-neutral-100">
                                            <th className="py-2 font-normal">Format</th>
                                            <th className="py-2 font-normal text-right">Posts</th>
                                            <th className="py-2 font-normal text-right">Avg likes</th>
                                            <th className="py-2 font-normal text-right">Avg comments</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {a.formatStats.map((f) => (
                                            <tr key={f.format} className="border-b border-neutral-50 text-neutral-700">
                                                <td className="py-2 capitalize">{f.format}</td>
                                                <td className="py-2 text-right">{f.posts}</td>
                                                <td className="py-2 text-right">{f.avgLikes}</td>
                                                <td className="py-2 text-right">{f.avgComments}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </Card>
                    </div>

                    {/* Pillars */}
                    {a.contentPillars && a.contentPillars.length > 0 && (
                        <section>
                            <SectionTitle title="Your content pillars" sub="The themes we'll rotate your posts across." />
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {a.contentPillars.map((p) => (
                                    <div key={p.name} className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-5">
                                        <h3 className="text-lg font-[var(--font-display)] text-neutral-900">{p.name}</h3>
                                        <p className="mt-1 text-sm text-neutral-600">{p.description}</p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Top posts */}
                    {a.topPosts && a.topPosts.length > 0 && (
                        <section>
                            <SectionTitle title="Your best posts" sub="We use these as voice samples." />
                            <div className="space-y-3">
                                {a.topPosts.map((p, i) => (
                                    <div key={i} className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-5">
                                        <p className="text-xs uppercase tracking-[0.12em] text-neutral-500">
                                            {p.platform} · {p.format} · {p.likes} likes · {p.comments} comments
                                            {p.shares > 0 ? ` · ${p.shares} shares` : ""}
                                        </p>
                                        <p className="mt-2 text-sm text-neutral-700 whitespace-pre-line line-clamp-4">{p.text}</p>
                                        {p.permalink && (
                                            <a
                                                href={p.permalink}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="mt-2 inline-block text-sm text-primary-500 hover:underline"
                                            >
                                                View post
                                            </a>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </>
            )
            }

            {
                toast && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 text-white text-sm px-4 py-2 rounded-[var(--radius-md)] shadow-lg">
                        {toast}
                    </div>
                )
            }
        </div >
    );
}

// ---------- small pieces ----------

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-4">
            <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">{title}</h2>
            {sub && <p className="mt-1 text-sm text-neutral-500">{sub}</p>}
        </div>
    );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
    return (
        <section className={`rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6 ${className}`}>
            <h2 className="text-xs font-medium tracking-[0.18em] uppercase text-neutral-500 mb-4">{title}</h2>
            {children}
        </section>
    );
}

function Chip({ children, strong = false }: { children: React.ReactNode; strong?: boolean }) {
    return (
        <span
            className={`text-sm px-3 py-1 rounded-[var(--radius-full)] border capitalize ${strong ? "border-neutral-900 text-neutral-900" : "border-neutral-200 text-neutral-600"
                }`}
        >
            {children}
        </span>
    );
}