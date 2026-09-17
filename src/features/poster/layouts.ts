// Poster sizes, layouts and text helpers. Pure functions, no React.

export type PosterSize = "portrait" | "square" | "story";

export const SIZES: Record<PosterSize, { w: number; h: number; label: string }> = {
    portrait: { w: 1080, h: 1350, label: "Feed 4:5" },
    square: { w: 1080, h: 1080, label: "Square" },
    story: { w: 1080, h: 1920, label: "Story 9:16" },
};

export type LayoutKey = "bottom" | "center" | "top" | "split";

export interface Layout {
    key: LayoutKey;
    label: string;
    /** where the text block sits, as fractions of the canvas */
    textBox: { x: number; y: number; w: number; h: number };
    align: "left" | "center";
    /** vertical anchor of the text block inside textBox */
    anchor: "top" | "middle" | "bottom";
    /** darken the photo behind the text so it stays readable */
    scrim: "bottom" | "top" | "full" | "none";
    /** split = photo on top, solid brand panel below */
    panel?: { y: number; h: number };
    logo: "top-left" | "top-right" | "bottom-right";
}

export const LAYOUTS: Layout[] = [
    {
        key: "bottom",
        label: "Photo, text at bottom",
        textBox: { x: 0.08, y: 0.55, w: 0.84, h: 0.37 },
        align: "left",
        anchor: "bottom",
        scrim: "bottom",
        logo: "top-left",
    },
    {
        key: "center",
        label: "Centred",
        textBox: { x: 0.1, y: 0.25, w: 0.8, h: 0.5 },
        align: "center",
        anchor: "middle",
        scrim: "full",
        logo: "top-left",
    },
    {
        key: "top",
        label: "Text at top",
        textBox: { x: 0.08, y: 0.12, w: 0.84, h: 0.35 },
        align: "left",
        anchor: "top",
        scrim: "top",
        logo: "bottom-right",
    },
    {
        key: "split",
        label: "Photo + colour panel",
        textBox: { x: 0.08, y: 0.63, w: 0.84, h: 0.3 },
        align: "left",
        anchor: "middle",
        scrim: "none",
        panel: { y: 0.58, h: 0.42 },
        logo: "top-left",
    },
];
// ---------- colours ----------

/** Relative luminance (0 dark → 1 light) of a #RRGGBB colour. */
export function luminance(hex: string): number {
    const n = parseInt(hex.replace("#", ""), 16);
    const lin = (v: number) => {
        const c = v / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    const r = lin((n >> 16) & 255);
    const g = lin((n >> 8) & 255);
    const b = lin(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Black or white text, whichever reads better on this background. */
export const textOn = (bg: string) => (luminance(bg) > 0.45 ? "#121212" : "#FFFFFF");

export interface PosterPalette {
    accent: string; // CTA button, split panel
    dark: string; // scrims
    light: string; // plain background
}

/** Build a palette from the brand colours, with safe defaults. */
export function paletteFrom(colors: string[]): PosterPalette {
    const valid = colors.filter((c) => /^#[0-9A-Fa-f]{6}$/.test(c));
    const byLum = [...valid].sort((a, b) => luminance(a) - luminance(b));
    const darkest = byLum[0];
    const lightest = byLum[byLum.length - 1];

    const dark = darkest !== undefined && luminance(darkest) < 0.2 ? darkest : "#121212";
    const light = lightest !== undefined && luminance(lightest) > 0.7 ? lightest : "#F3F2F2";
    const accent = valid.find((c) => c !== dark && c !== light) ?? "#C8102E";
    return { accent, dark, light };
}

// Devanagari fallbacks so Hindi always has glyphs, even if the brand font doesn't
const HINDI_FALLBACK = `"Noto Sans Devanagari", "Tiro Devanagari Hindi"`;

export const fontStack = (family: string | null, generic: "serif" | "sans-serif") =>
    `${family ? `"${family}", ` : ""}${HINDI_FALLBACK}, ${generic}`;

/** Load the fonts before drawing; canvas silently falls back otherwise. */
export async function loadFonts(families: (string | null)[]): Promise<void> {
    const list = [...new Set([...families.filter(Boolean), "Noto Sans Devanagari"])] as string[];
    const id = "pk-poster-fonts";
    if (!document.getElementById(id)) {
        const link = document.createElement("link");
        link.id = id;
        link.rel = "stylesheet";
        link.href =
            "https://fonts.googleapis.com/css2?" +
            list.map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&") +
            "&display=swap";
        document.head.appendChild(link);
    }
    await Promise.all(
        list.flatMap((f) => [
            document.fonts.load(`700 48px "${f}"`, "Aa अ"),
            document.fonts.load(`400 32px "${f}"`, "Aa अ"),
        ]),
    ).catch(() => undefined);
}

// ---------- text wrapping ----------

/**
 * Break text into lines that fit maxWidth. Respects typed line breaks.
 * Very long single words are split so nothing overflows.
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    for (const para of text.split("\n")) {
        const words = para.split(/\s+/).filter(Boolean);
        if (words.length === 0) {
            lines.push("");
            continue;
        }
        let line = "";
        for (const word of words) {
            const test = line ? `${line} ${word}` : word;
            if (ctx.measureText(test).width <= maxWidth) {
                line = test;
                continue;
            }
            if (line) lines.push(line);
            if (ctx.measureText(word).width <= maxWidth) {
                line = word;
            } else {
                // split an over-long word by characters
                let chunk = "";
                for (const ch of Array.from(word)) {
                    if (ctx.measureText(chunk + ch).width > maxWidth && chunk) {
                        lines.push(chunk);
                        chunk = ch;
                    } else chunk += ch;
                }
                line = chunk;
            }
        }
        lines.push(line);
    }
    return lines;
}

/**
 * Largest font size (between min and max) at which the text fits in maxLines.
 * Returns the size and the wrapped lines.
 */
export function fitText(
    ctx: CanvasRenderingContext2D,
    text: string,
    font: (size: number) => string,
    maxWidth: number,
    maxLines: number,
    max: number,
    min: number,
): { size: number; lines: string[] } {
    for (let size = max; size >= min; size -= 4) {
        ctx.font = font(size);
        const lines = wrapText(ctx, text, maxWidth);
        if (lines.length <= maxLines) return { size, lines };
    }
    ctx.font = font(min);
    return { size: min, lines: wrapText(ctx, text, maxWidth).slice(0, maxLines) };
}