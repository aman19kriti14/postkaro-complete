import { useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
    LayoutDashboard, Calendar, Megaphone, FileText,
    Sparkles, BarChart3, Settings, Plus, X, LogOut,
    Store,
} from "lucide-react";

import { useSidebarCounts } from "@/features/Calendar/useSidebarCounts";

import type { SidebarCounts } from "@/features/Calendar/api";
import { useAuthStore } from "@/stores/auth.store";
import { Logo } from "../{ui,guards},config,features/Logo";

type NavItem = {
    path: string;
    label: string;
    icon: typeof LayoutDashboard;
    count?: (c: SidebarCounts) => number;
};

const NAV_ITEMS: NavItem[] = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/calendar", label: "Calendar", icon: Calendar, count: (c) => c.calendar },
    { path: "/campaigns", label: "Campaigns", icon: Megaphone, count: (c) => c.campaigns },
    { path: "/drafts", label: "Drafts", icon: FileText, count: (c) => c.drafts },
    { path: "/ai-studio", label: "AI studio", icon: Sparkles },
    { path: "/brand-profile", label: "My brand", icon: Store },
    { path: "/analytics", label: "Analytics", icon: BarChart3 },
    // { path: "/social-accounts", label: "Social accounts", icon: Share2 },
    { path: "/settings", label: "Settings", icon: Settings },
];

interface Props {
    open: boolean;      // mobile drawer state
    onClose: () => void;
}

export function Sidebar({ open, onClose }: Props) {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const counts = useSidebarCounts();

    const user = useAuthStore((s) => s.user);
    const signout = useAuthStore((s) => s.signout);

    // Close the mobile drawer after navigating
    useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleSignout = async () => {
        await signout();
        navigate("/signin", { replace: true });
    };

    const initials = (user?.fullName ?? "")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .join("");

    return (
        <>
            {/* Backdrop, mobile only */}
            <div
                onClick={onClose}
                aria-hidden="true"
                className={`fixed inset-0 z-30 bg-black/50 lg:hidden ${open ? "block" : "hidden"}`}
            />

            <aside
                className={`fixed inset-y-0 left-0 z-40 flex w-[240px] flex-col bg-neutral-900 p-4 transition-transform motion-reduce:transition-none
          lg:sticky lg:top-0 lg:h-screen lg:translate-x-0
          ${open ? "translate-x-0" : "-translate-x-full"}`}
            >
                <div className="mb-6 flex items-center justify-between px-2">
                    <Logo variant="dark" height={28} />
                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="p-1 text-neutral-400 hover:text-white lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <button
                    onClick={() => navigate("/create")}
                    className="mb-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-neutral-700 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-white"
                >
                    <Plus className="h-4 w-4" />
                    Create post
                </button>

                <nav className="flex-1 space-y-1 overflow-y-auto">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const n = item.count && counts ? item.count(counts) : 0;

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                className={({ isActive }) =>
                                    `flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white ${isActive
                                        ? "bg-neutral-800 text-white"
                                        : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <Icon className="h-[18px] w-[18px]" />
                                        <span className="flex-1 text-left">{item.label}</span>
                                        {n > 0 && (
                                            <span className={`text-xs ${isActive ? "text-primary-400" : "text-primary-500"}`}>
                                                {n}
                                            </span>
                                        )}
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="mt-4 flex items-center gap-3 border-t border-neutral-800 pt-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C8102E] text-xs font-semibold text-white">
                        {initials || "?"}
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                            {user?.fullName ?? "—"}
                        </p>
                        <p className="truncate text-xs text-neutral-500">{user?.email}</p>
                    </div>
                    <button
                        onClick={handleSignout}
                        aria-label="Sign out"
                        title="Sign out"
                        className="shrink-0 cursor-pointer rounded-[var(--radius-md)] p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-[#C8102E] focus-visible:outline-2 focus-visible:outline-white"
                    >
                        <LogOut className="h-[18px] w-[18px]" />
                    </button>
                </div>
            </aside>
        </>
    );
}