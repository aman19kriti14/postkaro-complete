import { useAuthStore } from "@/stores/auth.store";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

function formatDate(): string {
    return new Date().toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
    }).toUpperCase();
}

const STATS = [
    { label: "SCHEDULED", value: "12", sub: "next 7 days", trend: null },
    { label: "PUBLISHED", value: "38", sub: "+6 vs last month", trend: "up" },
    { label: "REACH", value: "84.2K", sub: "+18.4%", trend: "up" },
    { label: "ENGAGEMENT", value: "5.1%", sub: "−0.3%", trend: "down" },
];

const UPCOMING = [
    { time: "11:30", day: "TODAY", title: "Masala chai brewing reel — 30 sec cut", platform: "Instagram · Reels", status: "SCHEDULED" },
    { time: "18:00", day: "TODAY", title: "Three ways to store loose leaf tea", platform: "LinkedIn", status: "NEEDS REVIEW" },
    { time: "09:15", day: "WED", title: "Customer photo carousel — monsoon edition", platform: "Instagram · Facebook", status: "SCHEDULED" },
    { time: "17:45", day: "THU", title: "Behind the counter: our roastery", platform: "YouTube Shorts", status: "DRAFT" },
];

const TOP_POSTS = [
    { title: "Monsoon chai pairings carousel", metric: "12.4K reach" },
    { title: "Roastery walkthrough short", metric: "8.9% eng." },
];

export function DashboardPage() {
    const user = useAuthStore((s) => s.user);
    const firstName = user?.fullName?.split(" ")[0] || "there";

    return (
        <div className="p-6 sm:p-10 max-w-[1200px]">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-500">
                        {formatDate()}
                    </p>
                    <h1 className="mt-1 text-3xl sm:text-4xl font-[var(--font-display)] text-neutral-900">
                        {getGreeting()}, {firstName}.
                    </h1>
                </div>
                <div className="flex gap-3">
                    <button className="h-10 px-4 rounded-[var(--radius-md)] border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer">
                        This week
                    </button>
                    <button className="h-10 px-4 rounded-[var(--radius-md)] border border-primary-500 text-sm font-medium text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer">
                        Open calendar
                    </button>
                </div>
            </div>

            {/* Divider */}
            <div className="mt-6 h-px bg-neutral-100" />

            {/* Stats */}
            <div className="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STATS.map((stat) => (
                    <div
                        key={stat.label}
                        className="p-5 rounded-[var(--radius-lg)] border border-neutral-200"
                    >
                        <p className="text-xs font-semibold tracking-[0.1em] uppercase text-neutral-400">
                            {stat.label}
                        </p>
                        <p className="mt-2 text-3xl font-[var(--font-display)] text-neutral-900">
                            {stat.value}
                        </p>
                        <p className={`mt-1 text-sm flex items-center gap-1 ${stat.trend === "up" ? "text-green-600" :
                            stat.trend === "down" ? "text-primary-500" :
                                "text-neutral-400"
                            }`}>
                            {stat.trend === "up" && <ArrowUpRight className="w-3.5 h-3.5" />}
                            {stat.trend === "down" && <ArrowDownRight className="w-3.5 h-3.5" />}
                            {stat.sub}
                        </p>
                    </div>
                ))}
            </div>

            {/* Two columns */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Up next */}
                <div className="rounded-[var(--radius-lg)] border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-[var(--font-display)] text-neutral-900">Up next</h2>
                        <button className="text-sm font-medium text-primary-500 hover:text-primary-600 cursor-pointer">
                            See queue
                        </button>
                    </div>

                    <div className="space-y-4">
                        {UPCOMING.map((item, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="text-right shrink-0 w-12">
                                    <p className="text-sm font-semibold text-neutral-900 tabular-nums">{item.time}</p>
                                    <p className="text-[11px] text-neutral-400 uppercase">{item.day}</p>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-neutral-900 truncate">{item.title}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs text-neutral-400">{item.platform}</span>
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${item.status === "SCHEDULED"
                                            ? "border-primary-200 text-primary-500 bg-primary-50"
                                            : item.status === "NEEDS REVIEW"
                                                ? "border-neutral-200 text-neutral-500"
                                                : "border-neutral-200 text-neutral-400"
                                            }`}>
                                            {item.status}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* What's working */}
                <div className="rounded-[var(--radius-lg)] border border-neutral-200 p-5">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-lg font-[var(--font-display)] text-neutral-900">What's working</h2>
                        <button className="text-sm font-medium text-primary-500 hover:text-primary-600 cursor-pointer">
                            Analytics
                        </button>
                    </div>

                    {/* Weekly bar chart placeholder */}
                    <div className="flex items-end justify-between h-16 mb-6 px-2">
                        {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => (
                            <div key={i} className="flex flex-col items-center gap-2">
                                <div
                                    className="w-6 bg-primary-500 rounded-sm"
                                    style={{ height: `${Math.random() * 40 + 10}px` }}
                                />
                                <span className="text-[11px] text-neutral-400">{day}</span>
                            </div>
                        ))}
                    </div>

                    {/* Top posts */}
                    <div className="space-y-3">
                        {TOP_POSTS.map((post, i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-sm text-neutral-700">{post.title}</span>
                                <span className="text-sm font-medium text-primary-500">{post.metric}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}