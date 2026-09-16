import { useNavigate } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import type { ChannelRow, Suggestion, TopPost } from "./api";
import { compact, channelLabel } from "@/features/dashboard/format";

const card = "rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-6";

function Header({ title, right }: { title: string; right?: string }) {
    return (
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-neutral-100">
            <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">{title}</h2>
            {right && <span className="text-sm text-neutral-500">{right}</span>}
        </div>
    );
}

const FORMAT_LABELS: Record<string, string> = {
    reel: "Reel",
    carousel: "Carousel",
    post: "Post",
    story: "Story",
};

const shortDate = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }).format(
        new Date(iso),
    );

// ---------- top posts ----------

export function TopPosts({ posts }: { posts: TopPost[] }) {
    const navigate = useNavigate();

    return (
        <div className={card}>
            <Header title="Top posts" right="By reach" />

            {posts.length === 0 ? (
                <p className="py-6 text-sm text-neutral-500">
                    Your best posts show up here once their reach has synced.
                </p>
            ) : (
                <ol className="divide-y divide-neutral-100">
                    {posts.map((p, i) => (
                        <li key={p.postId}>
                            <button
                                onClick={() => navigate(`/create?draft=${p.postId}`)}
                                className="w-full flex gap-4 py-5 text-left cursor-pointer group"
                            >
                                <span className="w-5 shrink-0 text-lg font-[var(--font-display)] text-primary-500">
                                    {i + 1}
                                </span>

                                <div className="w-16 h-16 shrink-0 rounded-[var(--radius-sm)] border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center">
                                    {p.thumbnailUrl ? (
                                        <img src={p.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-[10px] tracking-[0.08em] uppercase text-neutral-500">
                                            {FORMAT_LABELS[p.format ?? ""] ?? "Post"}
                                        </span>
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-base text-neutral-900 group-hover:text-primary-500 transition-colors">
                                        {p.title}
                                    </p>
                                    <p className="mt-1 text-sm text-neutral-500">
                                        {[...p.channels.map(channelLabel), shortDate(p.publishedAt)].join(" · ")}
                                    </p>
                                    {p.note && (
                                        <p className="mt-2 flex items-start gap-2 text-sm text-primary-500">
                                            <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                            {p.note}
                                        </p>
                                    )}
                                </div>

                                <div className="shrink-0 text-right">
                                    <p className="text-lg tabular-nums text-neutral-900">{compact(p.reach)}</p>
                                    <p className="mt-1 text-sm tabular-nums text-neutral-500">
                                        {p.engagementPct.toFixed(1)}% eng.
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ol>
            )}
        </div>
    );
}

// ---------- by channel ----------

export function ByChannel({ rows }: { rows: ChannelRow[] }) {
    return (
        <div className={card}>
            <Header title="By channel" />

            {rows.length === 0 ? (
                <p className="py-6 text-sm text-neutral-500">No published posts in this period.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-sm">
                        <thead>
                            <tr className="text-left text-xs tracking-[0.12em] uppercase text-neutral-500">
                                <th className="pb-3 font-medium">Channel</th>
                                <th className="pb-3 font-medium text-right">Posts</th>
                                <th className="pb-3 font-medium text-right">Reach</th>
                                <th className="pb-3 font-medium text-right">Eng.</th>
                                <th className="pb-3 font-medium text-right">Followers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 border-t border-neutral-100">
                            {rows.map((r) => (
                                <tr key={r.channel}>
                                    <td className="py-4 text-base text-neutral-900">{channelLabel(r.channel)}</td>
                                    <td className="py-4 text-right tabular-nums text-neutral-700">{r.posts}</td>
                                    {r.tracked ? (
                                        <>
                                            <td className="py-4 text-right tabular-nums text-neutral-900">
                                                {compact(r.reach)}
                                            </td>
                                            <td className="py-4 text-right tabular-nums text-neutral-700">
                                                {r.reach > 0 ? `${r.engagementPct.toFixed(1)}%` : "—"}
                                            </td>
                                            <td className="py-4 text-right tabular-nums text-neutral-700">
                                                {r.followersGained === null
                                                    ? "—"
                                                    : r.followersGained > 0
                                                        ? `+${r.followersGained}`
                                                        : r.followersGained}
                                            </td>
                                        </>
                                    ) : (
                                        <td colSpan={3} className="py-4 text-right text-neutral-400">
                                            Not tracked yet
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ---------- what to do more of ----------

const KIND_LABELS: Record<Suggestion["kind"], string> = {
    FORMAT: "Format",
    TIMING: "Timing",
    CHANNEL: "Channel",
};

export function DoMoreOf({ suggestions }: { suggestions: Suggestion[] }) {
    const navigate = useNavigate();

    return (
        <div className={card}>
            <Header title="What to do more of" right="From this period" />

            {suggestions.length === 0 ? (
                <p className="py-6 text-sm text-neutral-500">
                    Nothing clear enough to call out yet. Suggestions appear once there are at least three synced posts
                    to compare in a group.
                </p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {suggestions.map((s) => (
                        <div
                            key={s.kind}
                            className="flex flex-col rounded-[var(--radius-lg)] border border-neutral-200 p-6"
                        >
                            <p className="text-xs font-medium tracking-[0.18em] uppercase text-primary-500">
                                {KIND_LABELS[s.kind]}
                            </p>
                            <p className="mt-3 text-lg leading-relaxed text-neutral-900">{s.text}</p>
                            <div className="mt-auto pt-5">
                                <button
                                    onClick={() => navigate(`/ai-studio?brief=${encodeURIComponent(s.brief)}`)}
                                    className="h-11 px-5 rounded-[var(--radius-md)] border border-primary-500 text-sm text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer"
                                >
                                    Draft this
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}