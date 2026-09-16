interface PillOption {
    value: string;
    label: string;
}

interface PillGroupProps {
    label?: string;
    options: PillOption[];
    value: string;
    onChange: (value: string) => void;
    error?: string;
}

export function PillGroup({ label, options, value, onChange, error }: PillGroupProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && <span className="text-sm font-medium text-neutral-700">{label}</span>}
            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        type="button"
                        onClick={() => onChange(opt.value)}
                        className={`px-5 py-2 rounded-[var(--radius-md)] text-sm font-medium border transition-colors cursor-pointer ${value === opt.value
                                ? "border-primary-500 text-primary-500 bg-primary-50"
                                : "border-neutral-200 text-neutral-700 hover:border-neutral-300 bg-white"
                            }`}
                    >
                        {opt.label}
                    </button>
                ))}
            </div>
            {error && <p className="text-xs text-error-500" role="alert">{error}</p>}
        </div>
    );
}