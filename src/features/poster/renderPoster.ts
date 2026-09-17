import {
    SIZES,
    LAYOUTS,
    type Layout,
    type LayoutKey,
    type PosterSize,
    fitText,
    fontStack,
    loadFonts,
    paletteFrom,
    textOn,
    wrapText,
} from "./layouts";

export interface PosterBrand {
    logoUrl: string | null;
    colors: string[];
    headingFont: string | null;
    bodyFont: string | null;
}

export interface PosterSpec {
    size: PosterSize;
    layout: LayoutKey;
    backgroundUrl: string | null; // photo; null = plain brand colour
    headline: string;
    subline: string;
    cta: string;
    showLogo: boolean;
    brand: PosterBrand;
}

// ---------- image loading (cached) ----------

const imageCache = new Map<string, Promise<HTMLImageElement>>();

/** crossOrigin is required, or the canvas can't be exported afterwards. */
function loadImage(url: string): Promise<HTMLImageElement> {
    const cached = imageCache.get(url);
    if (cached) return cached;
    const p = new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Couldn't load image"));
        img.src = url;
    });
    imageCache.set(url, p);
    p.catch(() => imageCache.delete(url)); // allow retry
    return p;
}

// ---------- main ----------

/** Draws the poster onto the canvas. Returns a warning message if something was skipped. */
export async function renderPoster(canvas: HTMLCanvasElement, spec: PosterSpec): Promise<string | null> {
    const { w, h } = SIZES[spec.size];
    const layout: Layout = LAYOUTS.find((l) => l.key === spec.layout) ?? LAYOUTS[0]!;
    const palette = paletteFrom(spec.brand.colors);
    let warning: string | null = null;

    await loadFonts([spec.brand.headingFont, spec.brand.bodyFont]);

    const [photo, logo] = await Promise.all([
        spec.backgroundUrl ? loadImage(spec.backgroundUrl).catch(() => null) : Promise.resolve(null),
        spec.showLogo && spec.brand.logoUrl ? loadImage(spec.brand.logoUrl).catch(() => null) : Promise.resolve(null),
    ]);
    if (spec.backgroundUrl && !photo) warning = "The background image couldn't be loaded.";
    if (spec.showLogo && spec.brand.logoUrl && !logo) warning = "The logo couldn't be loaded.";

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // ---- background ----
    const photoArea = layout.panel ? { y: 0, h: layout.panel.y * h } : { y: 0, h };

    if (photo) {
        drawCover(ctx, photo, 0, photoArea.y, w, photoArea.h);
    } else {
        ctx.fillStyle = layout.panel ? palette.dark : palette.light;
        ctx.fillRect(0, 0, w, h);
    }

    // ---- panel (split layout) ----
    let textColor: string;
    if (layout.panel) {
        ctx.fillStyle = palette.accent;
        ctx.fillRect(0, layout.panel.y * h, w, layout.panel.h * h);
        textColor = textOn(palette.accent);
    } else if (photo) {
        drawScrim(ctx, layout.scrim, w, h, palette.dark);
        textColor = "#FFFFFF";
    } else {
        textColor = textOn(palette.light);
    }

    // ---- text block ----
    const box = {
        x: layout.textBox.x * w,
        y: layout.textBox.y * h,
        w: layout.textBox.w * w,
        h: layout.textBox.h * h,
    };
    const headingFont = (size: number) => `700 ${size}px ${fontStack(spec.brand.headingFont, "serif")}`;
    const bodyFont = (size: number) => `400 ${size}px ${fontStack(spec.brand.bodyFont, "sans-serif")}`;

    const headline = spec.headline.trim();
    const subline = spec.subline.trim();
    const cta = spec.cta.trim();

    const maxHead = spec.size === "story" ? 132 : 112;
    const head = headline
        ? fitText(ctx, headline, headingFont, box.w, spec.size === "story" ? 5 : 4, maxHead, 48)
        : { size: 0, lines: [] as string[] };

    const subSize = Math.max(30, Math.round(head.size * 0.38) || 36);
    ctx.font = bodyFont(subSize);
    const subLines = subline ? wrapText(ctx, subline, box.w).slice(0, 4) : [];

    const ctaSize = Math.max(28, Math.round(subSize * 0.95));
    const ctaH = cta ? ctaSize * 2.2 : 0;

    const headLH = head.size * 1.08;
    const subLH = subSize * 1.35;
    const gap1 = headline && subline ? head.size * 0.35 : 0;
    const gap2 = cta && (headline || subline) ? subSize * 1.1 : 0;

    const blockH = head.lines.length * headLH + gap1 + subLines.length * subLH + gap2 + ctaH;

    let y =
        layout.anchor === "top"
            ? box.y
            : layout.anchor === "bottom"
                ? box.y + box.h - blockH
                : box.y + (box.h - blockH) / 2;

    const x = layout.align === "center" ? box.x + box.w / 2 : box.x;
    ctx.textAlign = layout.align;
    ctx.textBaseline = "top";
    ctx.fillStyle = textColor;

    // subtle shadow only on photos, so text stays readable on busy areas
    if (photo && !layout.panel) {
        ctx.shadowColor = "rgba(0,0,0,0.35)";
        ctx.shadowBlur = 12;
    }

    ctx.font = headingFont(head.size);
    for (const line of head.lines) {
        ctx.fillText(line, x, y);
        y += headLH;
    }
    y += gap1;

    ctx.font = bodyFont(subSize);
    ctx.globalAlpha = 0.92;
    for (const line of subLines) {
        ctx.fillText(line, x, y);
        y += subLH;
    }
    ctx.globalAlpha = 1;
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    y += gap2;

    // ---- CTA button ----
    if (cta) {
        ctx.font = `600 ${ctaSize}px ${fontStack(spec.brand.bodyFont, "sans-serif")}`;
        const label = truncate(ctx, cta, box.w - ctaSize * 2);
        const bw = ctx.measureText(label).width + ctaSize * 2;
        const bx = layout.align === "center" ? x - bw / 2 : x;
        // on the colour panel, the accent button would vanish; use the dark colour instead
        const btn = layout.panel ? palette.dark : palette.accent;
        ctx.fillStyle = btn;
        roundRect(ctx, bx, y, bw, ctaH, ctaH / 2);
        ctx.fill();
        ctx.fillStyle = textOn(btn);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, bx + bw / 2, y + ctaH / 2 + 1);
    }

    // ---- logo ----
    if (logo) drawLogo(ctx, logo, layout.logo, w, h);

    return warning;
}

// ---------- export ----------

/** PNG blob of the current canvas. Fails if an image was loaded without CORS. */
/** JPEG blob of the current canvas (Instagram only accepts JPEG). */
export function exportPoster(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        try {
            canvas.toBlob(
                (b) => (b ? resolve(b) : reject(new Error("Couldn't create the image"))),
                "image/jpeg",
                0.92,
            );
        } catch {
            reject(new Error("This background image can't be used for a poster. Upload it instead."));
        }
    });
}

// ---------- drawing helpers ----------

/** Fill the area with the image, cropping like CSS object-fit: cover. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const sw = w / scale;
    const sh = h / scale;
    const sx = (img.naturalWidth - sw) / 2;
    const sy = (img.naturalHeight - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function drawScrim(ctx: CanvasRenderingContext2D, kind: Layout["scrim"], w: number, h: number, dark: string) {
    if (kind === "none") return;
    if (kind === "full") {
        ctx.fillStyle = hexToRgba(dark, 0.5);
        ctx.fillRect(0, 0, w, h);
        return;
    }
    const top = kind === "top";
    const g = ctx.createLinearGradient(0, top ? 0 : h, 0, top ? h * 0.6 : h * 0.35);
    g.addColorStop(0, hexToRgba(dark, 0.82));
    g.addColorStop(1, hexToRgba(dark, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
}

function drawLogo(ctx: CanvasRenderingContext2D, img: HTMLImageElement, pos: Layout["logo"], w: number, h: number) {
    const margin = w * 0.06;
    const maxH = w * 0.09;
    const maxW = w * 0.3;
    const ratio = img.naturalWidth / img.naturalHeight || 1;
    let lh = maxH;
    let lw = lh * ratio;
    if (lw > maxW) {
        lw = maxW;
        lh = lw / ratio;
    }
    const x = pos === "top-left" ? margin : w - margin - lw;
    const y = pos === "bottom-right" ? h - margin - lh : margin;
    ctx.drawImage(img, x, y, lw, lh);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

function truncate(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
    if (ctx.measureText(text).width <= maxW) return text;
    const chars = Array.from(text);
    while (chars.length > 1 && ctx.measureText(chars.join("") + "…").width > maxW) chars.pop();
    return chars.join("") + "…";
}

function hexToRgba(hex: string, alpha: number): string {
    const n = parseInt(hex.replace("#", ""), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}