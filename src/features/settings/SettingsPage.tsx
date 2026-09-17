import { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { settingsApi, toUpdate, apiError, type BrandOptions, type BrandSettings } from "./api";
import { BrandTab } from "./BrandTab";


const TABS = [
    { key: "brand", label: "Brand" },
    { key: "channels", label: "Channels" },
    { key: "posting", label: "Posting defaults" },
    { key: "products", label: "Products & links" },
    { key: "team", label: "Team" },
    { key: "billing", label: "Billing" },
    { key: "account", label: "Account" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function SettingsPage() {
    const [params, setParams] = useSearchParams();
    const tab = (TABS.find((t) => t.key === params.get("tab"))?.key ?? "brand") as TabKey;

    const [saved, setSaved] = useState<BrandSettings | null>(null); // last saved version
    const [draft, setDraft] = useState<BrandSettings | null>(null); // what the user is editing
    const [options, setOptions] = useState<BrandOptions | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<string | null>(null);

    // ---------- load ----------

    useEffect(() => {
        Promise.all([settingsApi.getBrand(), settingsApi.brandOptions()])
            .then(([b, o]) => {
                setSaved(b);
                setDraft(b);
                setOptions(o);
            })
            .catch((err) => setError(apiError(err, "Couldn't load settings")))
            .finally(() => setLoading(false));
    }, []);

    // ---------- unsaved changes ----------

    const dirty = useMemo(
        () => !!saved && !!draft && JSON.stringify(toUpdate(saved)) !== JSON.stringify(toUpdate(draft)),
        [saved, draft],
    );

    // warn before closing the tab with unsaved changes
    useEffect(() => {
        if (!dirty) return;
        const handler = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);

    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    // ---------- save / discard ----------

    const save = async () => {
        if (!draft || !dirty) return;
        setSaving(true);
        setError(null);
        try {
            const updated = await settingsApi.saveBrand(toUpdate(draft));
            setSaved(updated);
            setDraft(updated);
            setToast("Saved");
        } catch (err) {
            setError(apiError(err, "Couldn't save. Check the fields and try again."));
        } finally {
            setSaving(false);
        }
    };

    const discard = () => {
        setDraft(saved);
        setError(null);
    };

    const switchTab = (key: TabKey) => {
        if (dirty && !window.confirm("You have unsaved changes in Brand. Leave them?")) return;
        if (dirty) discard();
        setParams(key === "brand" ? {} : { tab: key }, { replace: true });
    };

    // ---------- render ----------

    return (
        <div className="p-6 sm:p-10 max-w-[1200px]">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
                <div>
                    <p className="text-sm font-medium tracking-[0.18em] uppercase text-primary-500 min-h-5">
                        {saved?.workspaceName ? `${saved.workspaceName} workspace` : "\u00A0"}
                    </p>
                    <h1 className="mt-2 text-4xl sm:text-5xl font-[var(--font-display)] text-neutral-900">Settings</h1>
                </div>

                {tab === "brand" && (
                    <div className="flex flex-wrap items-center gap-4">
                        {dirty && (
                            <>
                                <span className="text-sm text-neutral-600">Unsaved changes in Brand</span>
                                <button
                                    onClick={discard}
                                    disabled={saving}
                                    className="text-sm text-neutral-500 hover:text-neutral-800 cursor-pointer"
                                >
                                    Discard
                                </button>
                            </>
                        )}
                        <button
                            onClick={save}
                            disabled={!dirty || saving}
                            className="h-12 px-6 rounded-[var(--radius-md)] border border-primary-500 bg-white text-lg font-[var(--font-display)] text-primary-500 hover:bg-primary-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default disabled:hover:bg-white"
                        >
                            {saving ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-8 mb-8 h-px bg-neutral-200" />

            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => switchTab(t.key)}
                        className={`h-11 px-5 rounded-[var(--radius-md)] border text-sm transition-colors cursor-pointer ${tab === t.key
                            ? "border-primary-500 bg-primary-50 text-primary-500"
                            : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                            }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {error && (
                <div className="mt-6 rounded-[var(--radius-md)] border border-primary-200 bg-primary-50 px-5 py-4 text-sm text-primary-600">
                    {error}
                </div>
            )}

            {/* Content */}
            <div className="mt-8">
                {tab === "brand" ? (
                    loading || !draft || !options ? (
                        <div className="space-y-6">
                            <div className="h-72 rounded-[var(--radius-lg)] bg-neutral-100 animate-pulse" />
                            <div className="h-96 rounded-[var(--radius-lg)] bg-neutral-100 animate-pulse" />
                        </div>
                    ) : (
                        <BrandTab value={draft} options={options} onChange={setDraft} onError={setError} />
                    )
                ) : tab === "channels" ? (
                    <Placeholder
                        title="Channels"
                        text="Connected accounts are managed on the Social accounts page for now."
                        link={{ to: "/connect-accounts", label: "Open Social accounts" }}
                    />
                ) : (
                    <Placeholder
                        title={TABS.find((t) => t.key === tab)!.label}
                        text="This section isn't available yet."
                    />
                )}
            </div>

            {toast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-[var(--radius-md)] bg-neutral-900 px-5 py-3 text-sm text-white shadow-lg">
                    {toast}
                </div>
            )}
        </div>
    );
}

function Placeholder({ title, text, link }: { title: string; text: string; link?: { to: string; label: string } }) {
    return (
        <div className="rounded-[var(--radius-lg)] border border-neutral-200 bg-white p-8">
            <h2 className="text-2xl font-[var(--font-display)] text-neutral-900">{title}</h2>
            <p className="mt-2 text-neutral-600">{text}</p>
            {link && (
                <Link to={link.to} className="mt-4 inline-block text-sm font-medium text-primary-500">
                    {link.label} →
                </Link>
            )}
        </div>
    );
}