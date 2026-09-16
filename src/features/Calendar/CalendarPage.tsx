import { useCallback, useEffect, useMemo, useState } from "react";
import type { DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { calendarApi, apiError } from "./api";
import type { PostStatus, CalendarPost, CalendarData } from "./api";
import { refreshSidebarCounts } from "./useSidebarCounts";

// ---------- config (adjust routes to match your app) ----------

const ROUTES = {
    create: (date: string) => `/create?date=${date}`,
    edit: (postId: string) => `/create?postId=${postId}`,
};

const RED = "#C8102E";
const SERIF = "font-['Playfair_Display',Georgia,serif]";

const CHANNELS = [
    { value: "all", label: "All channels" },
    { value: "instagram", label: "Instagram" },
    { value: "facebook", label: "Facebook" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "youtube", label: "YouTube" },
    { value: "x", label: "X" },
];

const CHANNEL_LABEL: Record<string, string> = {
    INSTAGRAM: "Instagram", FACEBOOK: "Facebook", LINKEDIN: "LinkedIn", YOUTUBE: "YouTube",
    X: "X", TWITTER: "X", THREADS: "Threads", WHATSAPP: "WhatsApp", PINTEREST: "Pinterest",
};

const STATUS_LABEL: Record<PostStatus, string> = {
    PUBLISHED: "Published", SCHEDULED: "Scheduled", NEEDS_REVIEW: "Needs review",
    DRAFT: "Draft", PUBLISHING: "Publishing", FAILED: "Failed",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];

// ---------- date helpers (dates are "yyyy-mm-dd" strings, math in UTC) ----------

const monthName = (index: number) => MONTHS[index] ?? "";

const parseKey = (k: string) => {
    const [y = 1970, m = 1, d = 1] = k.split("-").map(Number);
    return { y, m, d };
};

const toKey = (d: Date) => d.toISOString().slice(0, 10);
const fromKey = (k: string) => {
    const { y, m, d } = parseKey(k);
    return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (k: string, n: number) => {
    const d = fromKey(k);
    d.setUTCDate(d.getUTCDate() + n);
    return toKey(d);
};
const daysBetween = (a: string, b: string) =>
    Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
const mondayOf = (k: string) => addDays(k, -((fromKey(k).getUTCDay() + 6) % 7));
const todayIST = () =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
const dayKey = (p: CalendarPost) => p.date.slice(0, 10); // backend sends +05:30, so this is the IST day
const timeOf = (p: CalendarPost) => p.date.slice(11, 16);
const dayNum = (k: string) => Number(k.slice(8, 10));
const monthShort = (k: string) => monthName(Number(k.slice(5, 7)) - 1).slice(0, 3);
const longDate = (k: string) =>
    `${dayNum(k)} ${monthName(Number(k.slice(5, 7)) - 1)} ${k.slice(0, 4)}`;

const rangeLabel = (a: string, b: string) =>
    a.slice(0, 7) === b.slice(0, 7)
        ? `${dayNum(a)}–${dayNum(b)} ${monthShort(b)}`
        : `${dayNum(a)} ${monthShort(a)}–${dayNum(b)} ${monthShort(b)}`;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// ---------- status styles ----------

const chipClass = (s: PostStatus) => {
    switch (s) {
        case "PUBLISHED": return "bg-[#C8102E]/10 border border-[#C8102E] text-[#C8102E]";
        case "NEEDS_REVIEW": return "bg-white border border-[#C8102E] text-[#C8102E]";
        case "DRAFT": return "bg-white border border-dashed border-neutral-300 text-neutral-500";
        case "FAILED": return "bg-[#C8102E] border border-[#C8102E] text-white";
        default: return "bg-white border border-neutral-300 text-neutral-800";
    }
};

const badgeClass = (s: PostStatus) => {
    switch (s) {
        case "NEEDS_REVIEW":
        case "FAILED": return "border-[#C8102E] text-[#C8102E]";
        case "PUBLISHED": return "border-[#C8102E]/40 bg-[#C8102E]/5 text-[#C8102E]";
        default: return "border-neutral-300 text-neutral-600";
    }
};

// ---------- page ----------

export default function CalendarPage() {
    const navigate = useNavigate();
    const today = todayIST();

    const [anchor, setAnchor] = useState(today);
    const [selected, setSelected] = useState(today);
    const [view, setView] = useState<"month" | "week">("month");
    const [channel, setChannel] = useState("all");
    const [showGaps, setShowGaps] = useState(false);
    const [data, setData] = useState<CalendarData | null>(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState<string | null>(null);

    // Week view loads the month its Monday falls in; that grid already covers the full week
    const month = (view === "week" ? mondayOf(anchor) : anchor).slice(0, 7);
    const { y: year, m: monthNum } = parseKey(`${month}-01`);
    const monthStart = `${month}-01`;
    const monthEnd = addDays(toKey(new Date(Date.UTC(year, monthNum, 1))), -1);
    const daysInMonth = dayNum(monthEnd);

    const days = useMemo(() => {
        const start = view === "week" ? mondayOf(anchor) : mondayOf(monthStart);
        const end = view === "week" ? addDays(start, 6) : addDays(mondayOf(monthEnd), 6);
        const out: string[] = [];
        for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
        return out;
    }, [view, anchor, monthStart, monthEnd]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            setData(await calendarApi.getMonth(month, channel));
        } catch (e) {
            setToast(apiError(e, "Couldn't load the calendar"));
        } finally {
            setLoading(false);
        }
    }, [month, channel]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(t);
    }, [toast]);

    const byDay = useMemo(() => {
        const map = new Map<string, CalendarPost[]>();
        for (const p of data?.posts ?? []) {
            const k = dayKey(p);
            const list = map.get(k) ?? [];
            list.push(p);
            map.set(k, list);
        }
        return map;
    }, [data]);

    const gapDays = useMemo(() => {
        const set = new Set<string>();
        for (const g of data?.cadenceGaps ?? []) {
            for (let d = g.startDate; d <= g.endDate; d = addDays(d, 1)) set.add(d);
        }
        return set;
    }, [data]);

    // ---------- actions ----------

    const go = (dir: -1 | 1) => {
        if (view === "week") {
            setAnchor(addDays(anchor, dir * 7));
        } else {
            setAnchor(toKey(new Date(Date.UTC(year, monthNum - 1 + dir, 1))));
        }
    };

    const goToday = () => {
        setAnchor(today);
        setSelected(today);
    };

    const onDrop = async (key: string, e: DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setDragOver(null);
        const postId = e.dataTransfer.getData("text/plain");
        if (!postId || !data) return;

        const moving = data.posts.find((p) => p.postId === postId);
        if (!moving || dayKey(moving) === key) return;
        if (key < today) {
            setToast("Can't move a post into the past");
            return;
        }

        const previous = data;
        setData({
            ...data,
            posts: data.posts.map((p) =>
                p.postId === postId ? { ...p, date: key + p.date.slice(10) } : p
            ),
        });

        try {
            await calendarApi.reschedule(postId, key);
            setSelected(key);
            load(); // refresh summary + gaps
            refreshSidebarCounts();
        } catch (err) {
            setData(previous);
            setToast(apiError(err, "Couldn't move the post"));
        }
    };

    const approve = async (postId: string) => {
        try {
            await calendarApi.approve(postId);
            setToast("Approved and scheduled");
            load();
            refreshSidebarCounts();
        } catch (err) {
            setToast(apiError(err, "Couldn't approve the post"));
        }
    };

    // ---------- render pieces ----------

    const renderChip = (p: CalendarPost) => (
        <button
            key={`${p.postId}-${p.channel}`}
            draggable={p.draggable}
            onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", p.postId);
                e.dataTransfer.effectAllowed = "move";
            }}
            onClick={(e) => {
                e.stopPropagation();
                setSelected(dayKey(p));
            }}
            title={`${timeOf(p)} · ${p.title} · ${CHANNEL_LABEL[p.channel] ?? p.channel} · ${STATUS_LABEL[p.status]}`}
            className={`block w-full truncate rounded px-2 py-1 text-left text-xs ${chipClass(p.status)} ${p.draggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                }`}
        >
            <span className="tabular-nums">{timeOf(p)}</span>&nbsp; {p.title}
        </button>
    );

    const renderCell = (key: string) => {
        const outside = view === "month" && key.slice(0, 7) !== month;
        if (outside) {
            return <div key={key} className="min-h-[120px] border-b border-r border-neutral-200 bg-neutral-50" />;
        }

        const posts = byDay.get(key) ?? [];
        const maxChips = view === "week" ? posts.length : 2;
        const extra = posts.length - maxChips;
        const isSelected = key === selected;
        const isToday = key === today;
        const inGap = showGaps && gapDays.has(key);

        const bg =
            dragOver === key ? "bg-[#C8102E]/10"
                : isSelected ? "bg-[#C8102E]/[0.04]"
                    : "bg-white";

        return (
            <div
                key={key}
                onClick={() => setSelected(key)}
                onDragOver={(e) => {
                    e.preventDefault();
                    if (dragOver !== key) setDragOver(key);
                }}
                onDragLeave={() => setDragOver((d) => (d === key ? null : d))}
                onDrop={(e) => onDrop(key, e)}
                style={
                    inGap && !isSelected
                        ? { backgroundImage: "repeating-linear-gradient(135deg, transparent 0 6px, rgba(200,16,46,0.07) 6px 12px)" }
                        : undefined
                }
                className={`relative cursor-pointer space-y-1.5 border-b border-r border-neutral-200 p-2 transition-colors ${bg} ${view === "week" ? "min-h-[420px]" : "min-h-[120px]"
                    } ${isSelected ? "outline outline-2 -outline-offset-2 outline-[#C8102E]" : ""}`}
            >
                <div className={`${SERIF} mb-1 text-lg ${isSelected || isToday ? "text-[#C8102E]" : "text-neutral-900"}`}>
                    {view === "week" ? `${dayNum(key)} ${monthShort(key)}` : dayNum(key)}
                </div>
                {posts.slice(0, maxChips).map(renderChip)}
                {extra > 0 && <div className="px-1 text-xs text-neutral-500">+{extra} more</div>}
            </div>
        );
    };

    const campaignBands =
        view === "month"
            ? (data?.campaigns ?? []).flatMap((c) => {
                const start = c.startDate < monthStart ? monthStart : c.startDate;
                const end = c.endDate > monthEnd ? monthEnd : c.endDate;
                if (start > end) return [];
                return [{
                    ...c,
                    left: (daysBetween(monthStart, start) / daysInMonth) * 100,
                    width: ((daysBetween(start, end) + 1) / daysInMonth) * 100,
                }];
            })
            : [];

    const selectedPosts = byDay.get(selected) ?? [];
    const s = data?.summary;

    const firstDay = days[0] ?? monthStart;
    const lastDay = days[days.length - 1] ?? monthEnd;

    const title =
        view === "week"
            ? `${dayNum(firstDay)} ${monthShort(firstDay)} – ${dayNum(lastDay)} ${monthShort(lastDay)} ${lastDay.slice(0, 4)}`
            : `${monthName(monthNum - 1)} ${year}`;

    const stats: { label: string; value: number | undefined }[] = [
        { label: "Published", value: s?.published },
        { label: "Scheduled", value: s?.scheduled },
        { label: "Needs review", value: s?.needsReview },
        { label: "Drafts on calendar", value: s?.drafts },
    ];
    if (s?.failed) stats.push({ label: "Failed", value: s.failed });

    // ---------- layout ----------

    return (
        <div className="min-h-screen flex-1 bg-[#f4f3f2] px-6 py-8 lg:px-10">
            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 pb-6">
                <div>
                    <p className={`${SERIF} text-sm uppercase tracking-[0.2em] text-[#C8102E]`}>
                        {s
                            ? `${plural(s.total, "post", "posts")} · ${s.needsReview} need review · ${plural(s.cadenceGaps, "cadence gap", "cadence gaps")}`
                            : "Loading…"}
                    </p>
                    <div className="mt-2 flex items-center gap-3">
                        <h1 className={`${SERIF} text-4xl text-neutral-900 lg:text-5xl`}>{title}</h1>
                        <button onClick={() => go(-1)} aria-label="Previous"
                            className="h-10 w-10 rounded border border-neutral-300 bg-white text-lg hover:border-neutral-500">‹</button>
                        <button onClick={() => go(1)} aria-label="Next"
                            className="h-10 w-10 rounded border border-neutral-300 bg-white text-lg hover:border-neutral-500">›</button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button onClick={goToday}
                        className={`${SERIF} rounded border border-neutral-300 bg-white px-5 py-2 hover:border-neutral-500`}>
                        Today
                    </button>
                    <div className="flex overflow-hidden rounded border border-neutral-300 bg-white">
                        {(["month", "week"] as const).map((v) => (
                            <button key={v} onClick={() => setView(v)}
                                className={`${SERIF} px-5 py-2 capitalize ${view === v ? "border-b-2 border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]" : "text-neutral-600"
                                    }`}>
                                {v}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((c) => (
                        <button key={c.value} onClick={() => setChannel(c.value)}
                            className={`${SERIF} rounded border px-4 py-2 ${channel === c.value
                                ? "border-[#C8102E] bg-[#C8102E]/5 text-[#C8102E]"
                                : "border-neutral-300 bg-white text-neutral-600 hover:border-neutral-500"
                                }`}>
                            {c.label}
                        </button>
                    ))}
                </div>
                <label className={`${SERIF} flex cursor-pointer items-center gap-2 text-neutral-600`}>
                    <input type="checkbox" checked={showGaps} onChange={(e) => setShowGaps(e.target.checked)}
                        className="h-4 w-4 accent-[#C8102E]" />
                    Show cadence gaps
                </label>
            </div>

            <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
                {/* Calendar */}
                <div>
                    {campaignBands.length > 0 && (
                        <div className="mb-4 space-y-3">
                            {campaignBands.map((c) => (
                                <div key={c.id} className="relative pt-2">
                                    <div className="absolute top-0 h-[3px]"
                                        style={{ left: `${c.left}%`, width: `${c.width}%`, background: RED }} />
                                    <p className={`${SERIF} text-sm text-[#C8102E]`}>
                                        {c.name} · {rangeLabel(c.startDate, c.endDate)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`overflow-hidden rounded border-l border-t border-neutral-200 transition-opacity ${loading ? "opacity-60" : ""
                        }`}>
                        <div className="grid grid-cols-7 bg-white">
                            {WEEKDAYS.map((d) => (
                                <div key={d}
                                    className={`${SERIF} border-b border-r border-neutral-200 px-3 py-3 text-sm uppercase tracking-[0.15em] text-neutral-600`}>
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7">{days.map(renderCell)}</div>
                    </div>
                </div>

                {/* Right panel */}
                <aside className="space-y-6">
                    <div className="rounded border border-neutral-200 bg-white p-6">
                        <p className={`${SERIF} text-xs uppercase tracking-[0.2em] text-[#C8102E]`}>Selected day</p>
                        <h2 className={`${SERIF} mt-1 border-b border-neutral-200 pb-4 text-2xl text-neutral-900`}>
                            {longDate(selected)}
                        </h2>

                        <div className="mt-4 space-y-5">
                            {selectedPosts.length === 0 && (
                                <p className={`${SERIF} text-neutral-500`}>Nothing planned for this day.</p>
                            )}

                            {selectedPosts.map((p) => (
                                <div key={`${p.postId}-${p.channel}`} className="flex gap-3">
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-200 bg-neutral-100">
                                        {p.thumbnailUrl
                                            ? <img src={p.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                                            : <span className="text-[10px] uppercase text-neutral-500">{p.format ?? "post"}</span>}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <button onClick={() => navigate(ROUTES.edit(p.postId))}
                                            className={`${SERIF} text-left text-lg leading-snug text-neutral-900 hover:text-[#C8102E]`}>
                                            {p.title}
                                        </button>
                                        <p className={`${SERIF} mt-1 text-neutral-500`}>
                                            {timeOf(p)} · {CHANNEL_LABEL[p.channel] ?? p.channel}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2">
                                            <span className={`${SERIF} rounded border px-2 py-0.5 text-xs uppercase tracking-[0.15em] ${badgeClass(p.status)}`}>
                                                {STATUS_LABEL[p.status]}
                                            </span>
                                            {p.status === "NEEDS_REVIEW" && (
                                                <button onClick={() => approve(p.postId)}
                                                    className="text-xs font-medium text-[#C8102E] underline underline-offset-2">
                                                    Approve
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {selected >= today && (
                            <button onClick={() => navigate(ROUTES.create(selected))}
                                className={`${SERIF} mt-6 rounded border border-[#C8102E] px-5 py-2.5 text-[#C8102E] hover:bg-[#C8102E]/5`}>
                                Add post here
                            </button>
                        )}
                    </div>

                    <div className="rounded border border-neutral-200 bg-white p-6">
                        <h3 className={`${SERIF} border-b border-neutral-200 pb-4 text-2xl text-neutral-900`}>
                            {view === "week" ? monthName(monthNum - 1) : "This month"}
                        </h3>
                        <dl className={`${SERIF} mt-4 space-y-3 text-neutral-600`}>
                            {stats.map(({ label, value }) => (
                                <div key={label} className="flex justify-between">
                                    <dt>{label}</dt>
                                    <dd className="text-neutral-900">{value ?? "–"}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </aside>
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded bg-neutral-900 px-4 py-2.5 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}