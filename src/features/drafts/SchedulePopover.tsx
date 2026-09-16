import { useEffect, useMemo, useRef, useState } from "react";
import { draftsApi, errorMessage } from "./api";
import type { Draft } from "./types";

interface Props {
    draft: Draft;
    onClose: () => void;
    onScheduled: (draftId: string, scheduledAt: Date) => void;
}

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const MIN_LEAD_MS = 5 * 60_000; // backend rejects < 2 min; give some margin

function quickPicks(now: Date): { label: string; at: Date }[] {
    const slots: { label: string; at: Date }[] = [];
    const at = (dayOffset: number, h: number, m: number) => {
        const d = new Date(now);
        d.setDate(d.getDate() + dayOffset);
        d.setHours(h, m, 0, 0);
        return d;
    };

    const todayEvening = at(0, 19, 30);
    if (todayEvening.getTime() - now.getTime() > MIN_LEAD_MS) {
        slots.push({ label: "Today, 7:30 PM", at: todayEvening });
    }
    slots.push({ label: "Tomorrow, 12:30 PM", at: at(1, 12, 30) });
    slots.push({ label: "Tomorrow, 7:30 PM", at: at(1, 19, 30) });
    return slots.slice(0, 3);
}

export function SchedulePopover({ draft, onClose, onScheduled }: Props) {
    const now = useMemo(() => new Date(), []);
    const picks = useMemo(() => quickPicks(now), [now]);

    const firstPick = picks[0]?.at ?? new Date(now.getTime() + 60 * 60_000);
    const [date, setDate] = useState(toDateInput(firstPick));
    const [time, setTime] = useState(toTimeInput(firstPick));
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const ref = useRef<HTMLDivElement>(null);
    const firstField = useRef<HTMLInputElement>(null);

    // Close on Esc or outside click; focus the date field on open
    useEffect(() => {
        firstField.current?.focus();
        const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
        const onDown = (e: MouseEvent) => {
            if (!busy && ref.current && !ref.current.contains(e.target as Node)) onClose();
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onDown);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onDown);
        };
    }, [busy, onClose]);

    const selected = new Date(`${date}T${time}`);
    const valid = !Number.isNaN(selected.getTime());
    const tooSoon = valid && selected.getTime() - Date.now() < MIN_LEAD_MS;

    async function confirm() {
        if (!valid || tooSoon) return;
        setBusy(true);
        setError(null);
        try {
            await draftsApi.schedule(draft.id, selected);
            onScheduled(draft.id, selected);
        } catch (err) {
            setError(errorMessage(err, "Couldn't schedule this post. Try again."));
            setBusy(false);
        }
    }

    const summary = valid
        ? selected.toLocaleString("en-IN", {
            weekday: "short", day: "numeric", month: "short",
            hour: "numeric", minute: "2-digit",
        })
        : "";

    return (
        <div
            ref={ref}
            role="dialog"
            aria-label={`Schedule "${draft.title}"`}
            className="absolute right-0 bottom-full z-20 mb-2 w-[min(20rem,calc(100vw-2rem))] border border-black bg-white p-5 shadow-[4px_4px_0_0_#C8102E]"
        >
            <p className="font-serif text-lg text-black">Schedule post</p>

            <p className="mt-4 text-xs text-neutral-500">Quick picks</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {picks.map((p) => {
                    const active = toDateInput(p.at) === date && toTimeInput(p.at) === time;
                    return (
                        <button
                            key={p.label}
                            type="button"
                            onClick={() => { setDate(toDateInput(p.at)); setTime(toTimeInput(p.at)); }}
                            className={`border px-2.5 py-1.5 text-xs ${active ? "border-[#C8102E] text-[#C8102E]" : "border-neutral-300 text-neutral-700 hover:border-black"
                                }`}
                        >
                            {p.label}
                        </button>
                    );
                })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
                <label className="text-xs text-neutral-500">
                    Date
                    <input
                        ref={firstField}
                        type="date"
                        value={date}
                        min={toDateInput(now)}
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 block w-full border border-neutral-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
                    />
                </label>
                <label className="text-xs text-neutral-500">
                    Time
                    <input
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        className="mt-1 block w-full border border-neutral-300 px-2 py-2 text-sm text-black focus:border-black focus:outline-none"
                    />
                </label>
            </div>

            <p role="status" className={`mt-3 min-h-5 text-xs ${error || tooSoon ? "text-[#C8102E]" : "text-neutral-500"}`}>
                {error ?? (tooSoon ? "Pick a time at least 5 minutes from now" : valid ? `Posts ${summary}` : "")}
            </p>

            <div className="mt-4 flex gap-2">
                <button
                    type="button"
                    onClick={onClose}
                    disabled={busy}
                    className="flex-1 border border-neutral-300 px-3 py-2 text-sm text-black hover:border-black disabled:opacity-40"
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={confirm}
                    disabled={busy || !valid || tooSoon}
                    className="flex-1 bg-[#C8102E] px-3 py-2 text-sm text-white hover:bg-[#a90d26] disabled:opacity-40"
                >
                    {busy ? "Scheduling…" : "Confirm"}
                </button>
            </div>
        </div>
    );
}