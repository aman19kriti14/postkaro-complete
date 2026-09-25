import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

export interface ConfirmOptions {
    title: string;
    body?: ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    danger?: boolean; // red confirm button for destructive actions
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

/**
 * In-app replacement for window.confirm.
 *
 *   const [confirm, confirmDialog] = useConfirm();
 *   if (!(await confirm({ title: "Delete this?", danger: true }))) return;
 *   ...
 *   return <>{confirmDialog} ...page</>;
 */
export function useConfirm(): [(opts: ConfirmOptions) => Promise<boolean>, ReactNode] {
    const [pending, setPending] = useState<Pending | null>(null);

    const confirm = useCallback(
        (opts: ConfirmOptions) => new Promise<boolean>((resolve) => setPending({ ...opts, resolve })),
        [],
    );

    const close = useCallback(
        (ok: boolean) => {
            pending?.resolve(ok);
            setPending(null);
        },
        [pending],
    );

    return [confirm, pending ? <ConfirmDialog {...pending} onClose={close} /> : null];
}

function ConfirmDialog({
    title,
    body,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
    danger = false,
    onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
    const confirmBtn = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        confirmBtn.current?.focus();
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose(false);
        };
        document.addEventListener("keydown", onKey);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden"; // no scrolling behind the dialog
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose(false);
            }}
        >
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-title"
                className="w-full max-w-md border border-neutral-200 bg-white p-6 shadow-xl sm:p-8"
            >
                <h2 id="confirm-title" className="font-serif text-2xl leading-snug text-black">
                    {title}
                </h2>
                {body && <div className="mt-3 font-serif text-base leading-relaxed text-neutral-700">{body}</div>}

                <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="border border-neutral-300 px-5 py-2.5 font-serif text-base text-neutral-800 hover:border-black"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmBtn}
                        type="button"
                        onClick={() => onClose(true)}
                        className={`px-5 py-2.5 font-serif text-base ${danger
                            ? "border border-[#C8102E] bg-[#C8102E] text-white hover:bg-[#a50d26]"
                            : "border border-black bg-black text-white hover:bg-neutral-800"
                            }`}
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}