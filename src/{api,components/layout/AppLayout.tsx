import { useCallback, useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Logo } from "../{ui,guards},config,features/Logo";

export function AppLayout() {
    const [open, setOpen] = useState(false);
    const close = useCallback(() => setOpen(false), []);

    return (
        <div className="flex min-h-screen bg-white">
            <Sidebar open={open} onClose={close} />

            <div className="flex min-w-0 flex-1 flex-col">
                {/* Top bar, mobile only */}
                <header className="sticky top-0 z-20 flex items-center gap-3 bg-neutral-900 px-4 py-3 lg:hidden">
                    <button
                        onClick={() => setOpen(true)}
                        aria-label="Open menu"
                        className="p-1 text-white"
                    >
                        <Menu className="h-6 w-6" />
                    </button>
                    <Logo variant="dark" height={22} />
                </header>

                <main className="flex-1 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}