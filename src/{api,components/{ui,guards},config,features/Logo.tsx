import { type CSSProperties } from "react";

interface LogoProps {
    /** "light" for white backgrounds, "dark" for dark backgrounds */
    variant?: "light" | "dark";
    /** Height of the full logo in px */
    height?: number;
    /** Show just the mark (icon only, no wordmark) */
    markOnly?: boolean;
    className?: string;
    style?: CSSProperties;
}

export function Logo({
    variant = "light",
    height = 36,
    markOnly = false,
    className = "",
    style,
}: LogoProps) {
    const markSize = height;
    const textColor = variant === "dark" ? "#FFFFFF" : "#171717";
    const karoColor = "#C8102E";
    const cardStroke = variant === "dark" ? "#FFFFFF" : "#171717";
    const cardFill = variant === "dark" ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.9)";
    const pColor = variant === "dark" ? "#FFFFFF" : "#171717";

    // Scale font size relative to height
    const fontSize = height * 0.72;
    const gap = height * 0.25;

    return (
        <div
            className={`inline-flex items-center ${className}`}
            style={{ gap: `${gap}px`, ...style }}
        >
            {/* Mark — tilted card with P and raindrop */}
            <svg
                width={markSize}
                height={markSize}
                viewBox="0 0 48 48"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <style>{`
          @keyframes pk-drop {
            0% {
              transform: translateY(-14px);
              opacity: 0;
            }
            40% {
              opacity: 1;
            }
            60% {
              transform: translateY(0px);
              opacity: 1;
            }
            70% {
              transform: translateY(-3px);
              opacity: 1;
            }
            80% {
              transform: translateY(0px);
              opacity: 1;
            }
            100% {
              transform: translateY(0px);
              opacity: 1;
            }
          }
          @keyframes pk-ripple {
            0% {
              r: 3.5;
              opacity: 0.6;
            }
            50% {
              r: 6;
              opacity: 0;
            }
            100% {
              r: 6;
              opacity: 0;
            }
          }
          .pk-dot {
            animation: pk-drop 2s ease-out infinite;
            transform-origin: center center;
          }
          .pk-ripple {
            animation: pk-ripple 2s ease-out infinite;
            animation-delay: 0.5s;
            opacity: 0;
          }
        `}</style>

                {/* Tilted card */}
                <g transform="rotate(-8 24 24)">
                    <rect
                        x="6"
                        y="10"
                        width="36"
                        height="28"
                        rx="4"
                        fill={cardFill}
                        stroke={cardStroke}
                        strokeWidth="2.2"
                    />

                    {/* P letter */}
                    <text
                        x="16"
                        y="31"
                        fontFamily="'Playfair Display', Georgia, serif"
                        fontSize="18"
                        fontWeight="600"
                        fill={pColor}
                    >
                        P
                    </text>

                    {/* Raindrop red dot */}
                    <g transform="translate(33, 17)">
                        {/* Ripple ring */}
                        <circle
                            className="pk-ripple"
                            cx="0"
                            cy="0"
                            r="3.5"
                            fill="none"
                            stroke={karoColor}
                            strokeWidth="0.8"
                        />
                        {/* Main dot */}
                        <circle
                            className="pk-dot"
                            cx="0"
                            cy="0"
                            r="3.5"
                            fill={karoColor}
                        />
                    </g>
                </g>
            </svg>

            {/* Wordmark */}
            {!markOnly && (
                <span
                    style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontSize: `${fontSize}px`,
                        fontWeight: 600,
                        lineHeight: 1,
                        letterSpacing: "-0.01em",
                        whiteSpace: "nowrap",
                    }}
                >
                    <span style={{ color: textColor }}>Post</span>
                    <span style={{ color: karoColor, fontStyle: "italic" }}>karo</span>
                </span>
            )}
        </div>
    );
}