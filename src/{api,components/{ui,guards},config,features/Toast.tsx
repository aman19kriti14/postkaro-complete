import { useEffect, useState } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ToastData {
    id: string;
    type: "success" | "error" | "info";
    message: string;
    duration?: number;
}

let listeners: Array<(toasts: ToastData[]) => void> = [];
let toasts: ToastData[] = [];

function emit() {
    listeners.forEach((fn) => fn([...toasts]));
}

export const toast = {
    success(message: string, duration = 4000) {
        const t: ToastData = { id: crypto.randomUUID(), type: "success", message, duration };
        toasts = [...toasts, t];
        emit();
    },
    error(message: string, duration = 5000) {
        const t: ToastData = { id: crypto.randomUUID(), type: "error", message, duration };
        toasts = [...toasts, t];
        emit();
    },
    info(message: string, duration = 4000) {
        const t: ToastData = { id: crypto.randomUUID(), type: "info", message, duration };
        toasts = [...toasts, t];
        emit();
    },
    dismiss(id: string) {
        toasts = toasts.filter((t) => t.id !== id);
        emit();
    },
};

function useToasts() {
    const [state, setState] = useState<ToastData[]>([]);
    useEffect(() => {
        listeners.push(setState);
        return () => {
            listeners = listeners.filter((fn) => fn !== setState);
        };
    }, []);
    return state;
}

const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
};

const styles = {
    success: "bg-green-50 border-green-200 text-green-800",
    error: "bg-red-50 border-red-200 text-red-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
};

function ToastItem({ data }: { data: ToastData }) {
    const Icon = icons[data.type];

    useEffect(() => {
        if (!data.duration) return;
        const timer = setTimeout(() => toast.dismiss(data.id), data.duration);
        return () => clearTimeout(timer);
    }, [data.id, data.duration]);

    return (
        <div
            className={cn(
                "flex items-start gap-2.5 px-4 py-3 rounded-[var(--radius-md)] border shadow-md",
                "animate-[slideIn_0.2s_ease-out]",
                styles[data.type]
            )}
            role="alert"
        >
            <Icon className="h-4.5 w-4.5 shrink-0 mt-0.5" />
            <p className="text-sm flex-1">{data.message}</p>
            <button
                onClick={() => toast.dismiss(data.id)}
                className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 cursor-pointer"
            >
                <X className="h-3.5 w-3.5" />
            </button>
        </div>
    );
}

export function ToastContainer() {
    const items = useToasts();

    if (items.length === 0) return null;

    return (
        <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-[380px] max-w-[calc(100vw-2rem)]">
            <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
            {items.map((t) => (
                <ToastItem key={t.id} data={t} />
            ))}
        </div>
    );
}