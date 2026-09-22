import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@/components/ui/Button";
import { useAuthStore } from "@/stores/auth.store";
import axios from "axios";
import { Logo } from "@/{api,components/{ui,guards},config,features/Logo";

const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";

interface Channel {
    id: string;
    name: string;
    description: string;
    letter: string;
    connected: boolean;
    username: string | null;
}

const INITIAL_CHANNELS: Channel[] = [
    { id: "instagram", name: "Instagram", description: "Posts, Reels and Stories", letter: "I", connected: false, username: null },
    { id: "facebook", name: "Facebook Page", description: "Page posts and scheduling", letter: "F", connected: false, username: null },
    { id: "linkedin", name: "LinkedIn", description: "Personal profile or company page", letter: "L", connected: false, username: null },
    { id: "youtube", name: "YouTube", description: "Shorts and video descriptions", letter: "Y", connected: false, username: null },
    { id: "twitter", name: "X", description: "Threads and single posts", letter: "X", connected: false, username: null },
    { id: "whatsapp", name: "WhatsApp Business", description: "Status updates and broadcasts", letter: "W", connected: false, username: null },
];

export function ConnectAccountsPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [channels, setChannels] = useState<Channel[]>(INITIAL_CHANNELS);
    const [connecting, setConnecting] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    const connectedCount = channels.filter((c) => c.connected).length;
    const canFinish = connectedCount >= 1;

    // Handle OAuth redirect back
    useEffect(() => {
        const connected = searchParams.get("connected");
        const error = searchParams.get("error");
        const username = searchParams.get("username");

        if (connected) {
            setChannels((prev) =>
                prev.map((ch) =>
                    ch.id === connected
                        ? { ...ch, connected: true, username: username || "Connected" }
                        : ch
                )
            );
            // Clean URL
            window.history.replaceState({}, "", "/connect-accounts");
        }
        if (error) {
            setApiError("Failed to connect account. Please try again.");
            window.history.replaceState({}, "", "/connect-accounts");
        }
    }, [searchParams]);

    // Also fetch already connected accounts from backend
    useEffect(() => {
        async function fetchConnected() {
            try {
                const token = localStorage.getItem("pk_access_token");
                const res = await axios.get(`${apiBase}/v1/auth/me`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const user = res.data.data;
                if (user.connectedAccounts && user.connectedAccounts.length > 0) {
                    setChannels((prev) =>
                        prev.map((ch) => {
                            const match = user.connectedAccounts.find(
                                (ca: any) => ca.platform === ch.id
                            );
                            if (match) {
                                return {
                                    ...ch,
                                    connected: true,
                                    username: match.platformUsername || "Connected",
                                };
                            }
                            return ch;
                        })
                    );
                }
            } catch {
                // Ignore — not critical
            }
        }
        fetchConnected();
    }, []);

    async function handleConnect(channelId: string) {
        if (channelId === "instagram" || channelId === "facebook") {
            try {
                setConnecting(channelId);
                const token = localStorage.getItem("pk_access_token");
                const res = await axios.get(
                    `${apiBase}/v1/oauth/meta/url?platform=${channelId}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                window.location.href = res.data.data.url;
            } catch (err) {
                console.error("Failed to get OAuth URL", err);
                setApiError("Failed to start connection. Please try again.");
                setConnecting(null);
            }
        } else {
            setApiError(`${channels.find((c) => c.id === channelId)?.name} connection is coming soon.`);
            setTimeout(() => setApiError(""), 3000);
        }
    }

    function handleDisconnect(channelId: string) {
        setChannels((prev) =>
            prev.map((ch) =>
                ch.id === channelId
                    ? { ...ch, connected: false, username: null }
                    : ch
            )
        );
    }

    async function handleFinish() {
        setLoading(true);
        setApiError("");
        try {
            await axios.post(`${apiBase}/v1/onboarding/complete`, null, {
                headers: {
                    Authorization: "Bearer " + localStorage.getItem("pk_access_token"),
                },
            });

            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
                useAuthStore.setState({
                    user: { ...currentUser, onboardingComplete: true },
                });
            }

            navigate("/brand-profile?welcome=1");
        } catch (err: any) {
            if (!err.response) {
                setApiError("Cannot connect to server.");
            } else {
                setApiError(err.response.data?.message || "Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Header */}
            <header className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-neutral-100">
                <Logo variant="light" height={32} />
                <span className="text-xs font-semibold tracking-[0.15em] uppercase text-primary-500">
                    Step 3 of 3 — Connect Accounts
                </span>
            </header>

            {/* Content */}
            <main className="flex-1 max-w-[720px] w-full mx-auto px-6 py-10 sm:py-14">
                <h1 className="text-3xl sm:text-4xl font-[var(--font-display)] text-neutral-900 leading-tight">
                    Connect your social accounts.
                </h1>
                <p className="mt-3 text-neutral-500 text-[15px] leading-relaxed">
                    Connect at least one channel to publish and track from Postkaro. You can add the rest
                    later from Settings, and disconnect any account at any time.
                </p>

                {/* Progress bar */}
                <div className="mt-8 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-500 rounded-full transition-all duration-500"
                                style={{ width: `${(connectedCount / channels.length) * 100}%` }}
                            />
                        </div>
                        <span className="text-sm text-neutral-500 shrink-0">
                            {connectedCount} of {channels.length} connected
                        </span>
                    </div>
                </div>

                {apiError && (
                    <div className="mt-6 p-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
                        {apiError}
                    </div>
                )}

                {/* Channel cards */}
                <div className="mt-8 space-y-3">
                    {channels.map((channel) => (
                        <div
                            key={channel.id}
                            className={`flex items-center gap-4 p-4 rounded-[var(--radius-lg)] border transition-colors ${channel.connected
                                ? "border-primary-500 bg-primary-50/30"
                                : "border-neutral-200 bg-white"
                                }`}
                        >
                            <div
                                className={`w-12 h-12 rounded-[var(--radius-md)] border flex items-center justify-center text-lg font-semibold shrink-0 ${channel.connected
                                    ? "border-primary-500 text-primary-500"
                                    : "border-neutral-200 text-neutral-600"
                                    }`}
                            >
                                {channel.letter}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-neutral-900">{channel.name}</p>
                                {channel.connected && channel.username ? (
                                    <p className="text-sm text-primary-500">Connected as {channel.username}</p>
                                ) : (
                                    <p className="text-sm text-neutral-400">{channel.description}</p>
                                )}
                            </div>

                            {channel.connected && (
                                <svg className="w-5 h-5 text-green-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            )}

                            {channel.connected ? (
                                <button
                                    type="button"
                                    onClick={() => handleDisconnect(channel.id)}
                                    className="px-4 py-2 text-sm font-medium text-neutral-600 border border-neutral-200 rounded-[var(--radius-md)] hover:bg-neutral-50 transition-colors cursor-pointer shrink-0"
                                >
                                    Disconnect
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => handleConnect(channel.id)}
                                    disabled={connecting === channel.id}
                                    className="px-4 py-2 text-sm font-medium text-primary-500 border border-primary-500 rounded-[var(--radius-md)] hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                    {connecting === channel.id ? "Connecting…" : "Connect"}
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* Privacy note */}
                <div className="mt-8 flex items-start gap-3 p-4 rounded-[var(--radius-lg)] border border-neutral-100 bg-neutral-50">
                    <svg className="w-5 h-5 text-primary-500 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                        Postkaro only requests permission to publish posts and read your own performance data.
                        We never post without your approval, and we never read your direct messages.
                    </p>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-neutral-100 px-6 sm:px-10 py-5">
                <div className="max-w-[720px] mx-auto flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate("/onboarding")}
                        className="text-sm text-neutral-500 hover:text-neutral-700 cursor-pointer"
                    >
                        ← Back to your details
                    </button>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={handleFinish}
                        disabled={!canFinish}
                        isLoading={loading}
                    >
                        Finish setup
                    </Button>
                </div>
            </footer>
        </div>
    );
}