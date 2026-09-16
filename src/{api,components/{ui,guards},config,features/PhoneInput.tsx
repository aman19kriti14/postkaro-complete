import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface PhoneInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    label?: string;
    error?: string;
    countryCode?: string;
}

export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ label, error, countryCode = "+91", className, id, ...props }, ref) => {
        const inputId = id ?? "phone";

        return (
            <div className="flex flex-col gap-1.5">
                {label && (
                    <label htmlFor={inputId} className="text-sm font-medium text-neutral-700">
                        {label}
                    </label>
                )}
                <div className="flex">
                    <div className="flex items-center gap-1.5 px-3 h-11 rounded-l-[var(--radius-md)] border border-r-0 border-neutral-200 bg-neutral-50 text-sm text-neutral-600 shrink-0">
                        <span>IN</span>
                        <span>{countryCode}</span>
                    </div>
                    <input
                        ref={ref}
                        id={inputId}
                        type="tel"
                        className={cn(
                            "flex-1 h-11 px-3 rounded-r-[var(--radius-md)] border bg-white text-neutral-800 text-sm",
                            "placeholder:text-neutral-400",
                            "focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent",
                            error ? "border-error-500" : "border-neutral-200 hover:border-neutral-300",
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="text-xs text-error-500" role="alert">{error}</p>}
            </div>
        );
    }
);

PhoneInput.displayName = "PhoneInput";