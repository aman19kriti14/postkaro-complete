import { useCallback, useEffect, useRef, useState } from "react";

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Collects changes and saves them together once typing pauses.
 * queue({ name: "x" }) → waits `delay` ms → save({ ...all queued changes })
 */
export function useAutosave<T extends object>(
    save: (patch: Partial<T>) => Promise<unknown>,
    delay = 800,
) {
    const [state, setState] = useState<SaveState>("idle");
    const pending = useRef<Partial<T>>({});
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveRef = useRef(save);
    saveRef.current = save;

    const flush = useCallback(async () => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
        const patch = pending.current;
        if (Object.keys(patch).length === 0) return;
        pending.current = {};

        setState("saving");
        try {
            await saveRef.current(patch);
            setState("saved");
        } catch {
            // Put the changes back so the next save retries them
            pending.current = { ...patch, ...pending.current };
            setState("error");
        }
    }, []);

    const queue = useCallback(
        (patch: Partial<T>) => {
            pending.current = { ...pending.current, ...patch };
            setState("saving");
            if (timer.current) clearTimeout(timer.current);
            timer.current = setTimeout(() => void flush(), delay);
        },
        [delay, flush],
    );

    // Save anything left when leaving the page
    useEffect(() => {
        const onHide = () => void flush();
        window.addEventListener("beforeunload", onHide);
        return () => {
            window.removeEventListener("beforeunload", onHide);
            void flush();
        };
    }, [flush]);

    return { queue, flush, state };
}

export const saveLabel = (s: SaveState) =>
    s === "saving" ? "Saving…" : s === "saved" ? "All changes saved" : s === "error" ? "Couldn't save — retrying" : "";