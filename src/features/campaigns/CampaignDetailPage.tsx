import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { campaignsApi, errorMessage } from "./api";
import { draftsApi } from "@/features/drafts/api";
import { refreshSidebarCounts } from "@/features/Calendar/useSidebarCounts";

import type { CampaignDetail, CampaignPost } from "./types";
import { ConfirmOptions, useConfirm } from "../confirm-dialog/Confirmdialog";

type Filter = "all" | "needsWork" | "ready" | "scheduled" | "published";

const FILTERS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "needsWork", label: "Needs work" },
    { key: "ready", label: "Ready" },
    { key: "scheduled", label: "Scheduled" },
    { key: "published", label: "Published" },
];

const LABELS: Record<string, string> = {
    sales: "Sales", awareness: "Awareness", launch: "Launch a product", followers: "Grow followers",
    live: "Live", upcoming: "Upcoming", ended: "Ended", stopped: "Stopped",
    reel: "Reel", carousel: "Carousel", post: "Post", story: "Story",
    tease: "Tease", explain: "Explain", proof: "Proof", convert: "Convert",
};

const MIN_LEAD_MS = 5 * 60_000;

// Sidebar badges, drafts count and calendar all listen for these
const countsChanged = () => {
    window.dispatchEvent(new Event("pk:drafts-changed"));
    refreshSidebarCounts();
};

function bucket(p: CampaignPost): Exclude<Filter, "all"> {
    if (p.status === "PUBLISHED") return "published";
    if (p.status === "SCHEDULED" || p.status === "PUBLISHING") return "scheduled";
    return p.ready ? "ready" : "needsWork";
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fromInputs = (date: string, time: string) => {
    const d = new Date(`${date}T${time}:00`);
    return Number.isNaN(d.getTime()) ? null : d;
};

const fmt = (d: Date) =>
    d.toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function rangeLabel(s: string, e: string) {
    const f = (x: string, o: Intl.DateTimeFormatOptions) => new Date(`${x}T00:00:00`).toLocaleDateString("en-IN", o);
    return `${f(s, { day: "numeric", month: "short" })} – ${f(e, { day: "numeric", month: "short", year: "numeric" })}`;
}

/* One post row: its own date/time, saved as the planned slot, and Schedule */
function PostRow({
    post, onChanged, onNotice, confirm,
}: {
    post: CampaignPost;
    onChanged: () => Promise<void>;
    onNotice: (text: string, bad?: boolean) => void;
    confirm: (opts: ConfirmOptions) => Promise<boolean>;
}) {
    const navigate = useNavigate();
    const b = bucket(post);
    const editable = b === "needsWork" || b === "ready";
    const planned = post.scheduledAt ? new Date(post.scheduledAt) : null;

    const [date, setDate] = useState(planned ? toDateInput(planned) : "");
    const [time, setTime] = useState(planned ? toTimeInput(planned) : "");
    const [saving, setSaving] = useState(false);
    const [scheduling, setScheduling] = useState(false);
    const [busy, setBusy] = useState<"unschedule" | "delete" | null>(null);
    const publishing = post.status === "PUBLISHING";

    const chosen = date && time ? fromInputs(date, time) : null;
    const tooSoon = !!chosen && chosen.getTime() - Date.now() < MIN_LEAD_MS;
    const unsaved = !!chosen && (!planned || chosen.getTime() !== planned.getTime());

    const blocker = !post.mediaUrl
        ? "Add a visual first"
        : !post.channels.length
            ? "Pick a channel first"
            : !post.ready
                ? "Add a caption first"
                : !chosen
                    ? "Pick a date and time"
                    : tooSoon
                        ? "Pick a time at least 5 minutes from now"
                        : null;

    async function savePlanned() {
        if (!chosen || !unsaved) return;
        setSaving(true);
        try {
            await campaignsApi.setPlannedTime(post.id, chosen);
            await onChanged();
        } catch (err) {
            onNotice(errorMessage(err, "Couldn't save the time."), true);
        } finally {
            setSaving(false);
        }
    }

    async function schedule() {
        if (!chosen || blocker) return;
        setScheduling(true);
        try {
            await draftsApi.schedule(post.id, chosen);
            countsChanged();
            onNotice(`Scheduled "${post.title}" for ${fmt(chosen)}.`);
            await onChanged();
        } catch (err) {
            onNotice(errorMessage(err, "Couldn't schedule this post."), true);
            setScheduling(false);
        }
    }

    async function unschedule() {
        setBusy("unschedule");
        try {
            await campaignsApi.unschedulePost(post.id);
            countsChanged();
            onNotice(`"${post.title}" is back in drafts. Its time is kept so you can reschedule it.`);
            await onChanged();
        } catch (err) {
            onNotice(errorMessage(err, "Couldn't unschedule this post."), true);
            setBusy(null);
        }
    }

    async function remove() {
        const ok = await confirm({
            title: `Delete “${post.title}”?`,
            body: "This post and its visual are removed. This can't be undone.",
            confirmLabel: "Delete post",
            danger: true,
        });
        if (!ok) return;
        setBusy("delete");
        try {
            await campaignsApi.deletePost(post.id);
            countsChanged();
            onNotice(`Deleted "${post.title}".`);
            await onChanged();
        } catch (err) {
            onNotice(errorMessage(err, "Couldn't delete this post."), true);
            setBusy(null);
        }
    }

    const quietBtn =
        "border border-neutral-300 px-3 py-2 text-sm text-neutral-700 hover:border-black disabled:cursor-not-allowed disabled:opacity-40";

    const inputCls =
        "border border-neutral-300 bg-white px-2 py-1.5 text-sm text-black focus:border-black focus:outline-none disabled:bg-neutral-50";

    return (
        <li className="border border-neutral-200 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {post.mediaUrl ? (
                    post.mediaType === "video" ? (
                        <video src={post.mediaUrl} muted preload="metadata" className="h-16 w-16 shrink-0 object-cover" />
                    ) : (
                        <img src={post.mediaUrl} alt="" loading="lazy" className="h-16 w-16 shrink-0 object-cover" />
                    )
                ) : (
                    <span className="flex h-16 w-16 shrink-0 items-center justify-center bg-neutral-100 text-[10px] tracking-widest text-neutral-500 uppercase">
                        {LABELS[post.format ?? "post"]}
                    </span>
                )}

                <div className="min-w-0 flex-1">
                    <p className="font-serif text-lg text-black">{post.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-neutral-500">
                        <span className="capitalize">{post.channels.join(", ")}</span>
                        {post.stage && (
                            <span className="border border-neutral-300 px-1.5 py-0.5 text-[11px] tracking-widest uppercase">
                                {LABELS[post.stage]}
                            </span>
                        )}
                        <span
                            className={`border px-1.5 py-0.5 text-[11px] tracking-widest uppercase ${b === "needsWork" ? "border-neutral-300 text-neutral-600" : "border-[#C8102E] text-[#C8102E]"
                                }`}
                        >
                            {b === "needsWork" ? (post.mediaUrl ? "Needs work" : "No visual") : FILTERS.find((f) => f.key === b)!.label}
                        </span>
                    </div>
                </div>

                {!editable && planned && (
                    <p className="shrink-0 text-sm text-neutral-700">{fmt(planned)}</p>
                )}

                {b === "scheduled" && (
                    <div className="flex shrink-0 gap-2">
                        {publishing ? (
                            <span className="text-sm text-neutral-500" role="status">Publishing now…</span>
                        ) : (
                            <>
                                <button type="button" onClick={unschedule} disabled={busy !== null} className={quietBtn}>
                                    {busy === "unschedule" ? "Unscheduling…" : "Unschedule"}
                                </button>
                                <button type="button" onClick={remove} disabled={busy !== null} className={`${quietBtn} hover:border-[#C8102E] hover:text-[#C8102E]`}>
                                    {busy === "delete" ? "Deleting…" : "Delete"}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {editable && (
                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-neutral-100 pt-4">
                    <label className="text-xs text-neutral-500">
                        Date
                        <input
                            type="date"
                            className={`mt-1 block ${inputCls}`}
                            value={date}
                            min={toDateInput(new Date())}
                            onChange={(e) => setDate(e.target.value)}
                            onBlur={savePlanned}
                            disabled={scheduling}
                        />
                    </label>
                    <label className="text-xs text-neutral-500">
                        Time (IST)
                        <input
                            type="time"
                            className={`mt-1 block ${inputCls}`}
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                            onBlur={savePlanned}
                            disabled={scheduling}
                        />
                    </label>

                    <span className="pb-2 text-xs text-neutral-500" role="status">
                        {saving ? "Saving time…" : unsaved ? "Unsaved" : ""}
                    </span>

                    <div className="ml-auto flex gap-2">
                        <button
                            type="button"
                            onClick={remove}
                            disabled={busy !== null || scheduling}
                            className={`${quietBtn} hover:border-[#C8102E] hover:text-[#C8102E]`}
                        >
                            {busy === "delete" ? "Deleting…" : "Delete"}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate(`/create?draft=${post.id}`)}
                            className="border border-neutral-300 px-3 py-2 text-sm hover:border-black"
                        >
                            Continue
                        </button>
                        <button
                            type="button"
                            onClick={schedule}
                            disabled={!!blocker || scheduling || saving}
                            title={blocker ?? undefined}
                            className="border border-[#C8102E] px-3 py-2 text-sm text-[#C8102E] hover:bg-[#C8102E]/5 disabled:cursor-not-allowed disabled:border-neutral-200 disabled:text-neutral-400 disabled:hover:bg-transparent"
                        >
                            {scheduling ? "Scheduling…" : "Schedule"}
                        </button>
                    </div>

                    {blocker && <p className="w-full text-xs text-neutral-500">{blocker} to schedule.</p>}
                </div>
            )}
        </li>
    );
}

export default function CampaignDetailPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [campaignBusy, setCampaignBusy] = useState<"stop" | "delete" | null>(null);
    const [confirm, confirmDialog] = useConfirm();
    const [data, setData] = useState<CampaignDetail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<Filter>("all");
    const [notice, setNotice] = useState<{ text: string; bad?: boolean } | null>(null);

    const load = useCallback(async () => {
        setError(null);
        try {
            setData(await campaignsApi.get(id));
        } catch (err) {
            setError(errorMessage(err, "Couldn't load this campaign."));
        }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!notice) return;
        const t = setTimeout(() => setNotice(null), 5000);
        return () => clearTimeout(t);
    }, [notice]);

    async function stopCampaign() {
        if (!data) return;
        const ok = await confirm({
            title: `Stop “${data.name}”?`,
            body: "Nothing else will be published. Scheduled posts go back to drafts, and posts already published stay up.",
            confirmLabel: "Stop campaign",
        });
        if (!ok) return;
        setCampaignBusy("stop");
        try {
            const r = await campaignsApi.stopCampaign(data.id);
            countsChanged();
            const moved = r.unscheduled === 1 ? "1 post moved" : `${r.unscheduled} posts moved`;
            const going = r.stillPublishing > 0
                ? ` ${r.stillPublishing === 1 ? "1 post was" : `${r.stillPublishing} posts were`} already going out and will finish.`
                : "";
            setNotice({ text: `Campaign stopped. ${moved} back to drafts.${going}` });
            await load();
        } catch (err) {
            setNotice({ text: errorMessage(err, "Couldn't stop this campaign."), bad: true });
        } finally {
            setCampaignBusy(null);
        }
    }

    async function deleteCampaign() {
        if (!data) return;
        const ok = await confirm({
            title: `Delete “${data.name}”?`,
            body: "Its unpublished posts are deleted too. Posts already published stay up and are kept in your history. This can't be undone.",
            confirmLabel: "Delete campaign",
            danger: true,
        });
        if (!ok) return;
        setCampaignBusy("delete");
        try {
            await campaignsApi.deleteCampaign(data.id);
            countsChanged();
            navigate("/campaigns", { replace: true });
        } catch (err) {
            setNotice({ text: errorMessage(err, "Couldn't delete this campaign."), bad: true });
            setCampaignBusy(null);
        }
    }

    const weeks = useMemo(() => {
        if (!data) return [];
        const start = new Date(`${data.startsOn}T00:00:00`).getTime();
        const end = new Date(`${data.endsOn}T00:00:00`).getTime();
        const visible = data.posts.filter((p) => filter === "all" || bucket(p) === filter);
        const groups = new Map<number, CampaignPost[]>();
        for (const p of visible) {
            const w = p.scheduledAt
                ? Math.max(0, Math.floor((new Date(p.scheduledAt).getTime() - start) / (7 * 86_400_000)))
                : 999;
            groups.set(w, [...(groups.get(w) ?? []), p]);
        }
        const f = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
        return [...groups.entries()]
            .sort(([a], [b]) => a - b)
            .map(([w, posts]) => {
                posts.sort((a, b) => (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? ""));
                if (w === 999) return { key: w, label: "No date yet", posts };
                const from = new Date(start + w * 7 * 86_400_000);
                const to = new Date(Math.min(from.getTime() + 6 * 86_400_000, end));
                return { key: w, label: `Week ${w + 1} · ${f(from)} – ${f(to)}`, posts };
            });
    }, [data, filter]);

    if (error) {
        return (
            <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
                <Link to="/campaigns" className="text-sm text-neutral-600 hover:text-black">← All campaigns</Link>
                <div className="mt-8 border border-neutral-300 p-6">
                    <p className="text-black">{error}</p>
                    <button type="button" onClick={load} className="mt-3 text-sm text-[#C8102E] underline underline-offset-4">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12" aria-busy="true">
                <div className="h-10 w-64 animate-pulse bg-neutral-100 motion-reduce:animate-none" />
                <div className="mt-8 h-40 animate-pulse bg-neutral-100 motion-reduce:animate-none" />
            </div>
        );
    }

    const c = data.counts;
    const out = c.scheduled + c.published;
    const pct = c.total ? Math.round((out / c.total) * 100) : 0;
    const live = data.status === "live";
    const counts: Record<Filter, number> = {
        all: c.total, needsWork: c.needsWork, ready: c.ready, scheduled: c.scheduled, published: c.published,
    };

    return (
        <div className="mx-auto max-w-6xl px-6 py-10 lg:px-12">
            <Link to="/campaigns" className="text-sm text-neutral-600 hover:text-black">← All campaigns</Link>

            <header className="mt-6 border-b border-neutral-200 pb-8">
                <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm text-neutral-500">{rangeLabel(data.startsOn, data.endsOn)}</span>
                    <span className={`border px-2 py-0.5 text-xs ${live ? "border-[#C8102E] text-[#C8102E]" : "border-neutral-300 text-neutral-600"}`}>
                        {LABELS[data.status]}
                    </span>
                </div>
                <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="font-serif text-5xl text-black">{data.name}</h1>
                        <p className="mt-2 text-neutral-600 capitalize">{data.channels.join(", ")}</p>
                    </div>
                    <div className="flex gap-2">
                        {(data.status === "live" || data.status === "upcoming") && (
                            <button
                                type="button"
                                onClick={stopCampaign}
                                disabled={campaignBusy !== null}
                                className="border border-neutral-300 bg-white px-4 py-2 text-sm text-neutral-800 hover:border-black disabled:opacity-40"
                            >
                                {campaignBusy === "stop" ? "Stopping…" : "Stop campaign"}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={deleteCampaign}
                            disabled={campaignBusy !== null}
                            className="border border-[#C8102E] bg-white px-4 py-2 text-sm text-[#C8102E] hover:bg-[#C8102E]/5 disabled:opacity-40"
                        >
                            {campaignBusy === "delete" ? "Deleting…" : "Delete campaign"}
                        </button>
                    </div>
                </div>
            </header>

            <dl className="mt-8 grid border border-neutral-200 bg-white sm:grid-cols-3">
                <div className="border-b border-neutral-200 p-6 sm:border-r sm:border-b-0">
                    <dt className="text-xs text-neutral-500">Goal</dt>
                    <dd className="mt-2 font-serif text-lg text-black">{LABELS[data.goal] ?? data.goal}</dd>
                </div>
                <div className="border-b border-neutral-200 p-6 sm:border-r sm:border-b-0">
                    <dt className="text-xs text-neutral-500">What it promotes</dt>
                    <dd className="mt-2 line-clamp-3 font-serif text-lg text-black">{data.brief || "—"}</dd>
                </div>
                <div className="p-6">
                    <dt className="text-xs text-neutral-500">Offer</dt>
                    <dd className="mt-2 font-serif text-lg text-black">{data.offer || "None"}</dd>
                </div>
            </dl>

            {notice && (
                <p
                    role="status"
                    className={`fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md border-l-4 bg-white px-5 py-4 font-serif text-base shadow-lg ${notice.bad ? "border-[#C8102E] text-[#C8102E]" : "border-black text-black"}`}
                >
                    {notice.text}
                </p>
            )}
            {confirmDialog}

            <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
                <section className="border border-neutral-200 bg-white p-6 sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
                        <h2 className="font-serif text-3xl text-black">Schedule</h2>
                        <nav aria-label="Filter posts" className="flex flex-wrap gap-2">
                            {FILTERS.map((f) => (
                                <button
                                    key={f.key}
                                    type="button"
                                    aria-pressed={filter === f.key}
                                    onClick={() => setFilter(f.key)}
                                    className={`border px-3 py-1.5 text-sm ${filter === f.key
                                        ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                        : "border-neutral-300 text-neutral-700 hover:border-black"
                                        }`}
                                >
                                    {f.label} <span className="opacity-60">{counts[f.key]}</span>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {weeks.length === 0 && (
                        <p className="mt-8 text-neutral-600">
                            {c.total === 0 ? "This campaign has no posts yet." : "No posts match this filter."}
                        </p>
                    )}

                    {weeks.map((w) => (
                        <div key={w.key} className="mt-8">
                            <div className="mb-4 flex items-center gap-4">
                                <h3 className="text-sm tracking-[0.15em] text-[#C8102E] uppercase">{w.label}</h3>
                                <span className="h-px flex-1 bg-neutral-200" />
                            </div>
                            <ul className="space-y-3">
                                {w.posts.map((p) => (
                                    <PostRow
                                        key={`${p.id}-${p.scheduledAt}-${p.status}-${p.ready}`}
                                        post={p}
                                        onChanged={load}
                                        onNotice={(text, bad) => setNotice({ text, bad })}
                                        confirm={confirm}
                                    />
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>

                <aside>
                    <section className="border border-neutral-200 bg-white p-6">
                        <h2 className="border-b border-neutral-200 pb-4 font-serif text-2xl text-black">Readiness</h2>
                        <p className="mt-5 font-serif text-black">
                            <span className="text-5xl">{out}</span>
                            <span className="ml-2 text-lg text-neutral-600">of {c.total} posts out</span>
                        </p>
                        <div className="mt-4 h-1 bg-neutral-200">
                            <div className="h-1 bg-[#C8102E]" style={{ width: `${pct}%` }} />
                        </div>
                        <dl className="mt-6 space-y-3">
                            {[
                                ["Published", c.published],
                                ["Scheduled", c.scheduled],
                                ["Ready to schedule", c.ready],
                                ["Need work", c.needsWork],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between font-serif text-black">
                                    <dt>{k}</dt>
                                    <dd>{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </section>
                </aside>
            </div>
        </div>
    );
}