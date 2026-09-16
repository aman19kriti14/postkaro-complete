import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, hint, className, id, ...props }, ref) => {
        const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={textareaId} className="text-sm font-medium text-neutral-700">
                        {label}
                    </label>
                )}
                <textarea
                    ref={ref}
                    id={textareaId}
                    className={cn(
                        "w-full px-3 py-2.5 rounded-[var(--radius-md)] border bg-white text-neutral-800 text-sm resize-vertical min-h-[120px]",
                        "placeholder:text-neutral-400",
                        "transition-colors duration-150",
                        "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent",
                        error ? "border-error-500" : "border-neutral-200 hover:border-neutral-300",
                        className
                    )}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-error-500" role="alert">{error}</p>
                )}
                {hint && !error && <p className="text-xs text-neutral-400">{hint}</p>}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";