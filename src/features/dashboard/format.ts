const IST = "Asia/Kolkata";

// ---------- IST helpers ----------

const istParts = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: IST,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
        weekday: "short",
    }).formatToParts(d);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    return {
        dateKey: `${get("year")}-${get("month")}-${get("day")}`,
        time: `${get("hour")}:${get("minute")}`,
        hour: Number(get("hour")),
        weekday: get("weekday").toUpperCase(), // MON, TUE...
    };
};

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);

// ---------- header ----------

/** "TUESDAY, 15 SEPTEMBER" */
export function headerDate(now = new Date()): string {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: IST,
        weekday: "long",
        day: "numeric",
        month: "long",
    })
        .format(now)
        .toUpperCase();
}

/** Greeting by IST hour, not the browser's clock */
export function greeting(now = new Date()): string {
    const h = istParts(now).hour;
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
}

// ---------- up next ----------

/** { time: "11:30", day: "TODAY" | "TOMORROW" | "WED" } */
export function slotLabel(iso: string, now = new Date()): { time: string; day: string } {
    const p = istParts(new Date(iso));
    const today = istParts(now).dateKey;
    const tomorrow = istParts(addDays(now, 1)).dateKey;

    let day = p.weekday;
    if (p.dateKey === today) day = "TODAY";
    else if (p.dateKey === tomorrow) day = "TMRW";

    return { time: p.time, day };
}

const CHANNEL_LABELS: Record<string, string> = {
    instagram: "Instagram",
    facebook: "Facebook",
    linkedin: "LinkedIn",
    youtube: "YouTube",
    x: "X",
    twitter: "X",
    whatsapp: "WhatsApp",
    threads: "Threads",
    pinterest: "Pinterest",
    bluesky: "Bluesky",
    mastodon: "Mastodon",
    gbp: "Google Business",
};

export const channelLabel = (c: string) => CHANNEL_LABELS[c.toLowerCase()] ?? c;

const FORMAT_LABELS: Record<string, string> = {
    reel: "Reels",
    carousel: "Carousel",
    story: "Stories",
};

/** "Instagram · Reels" for one channel, "Instagram · Facebook" for several */
export function channelLine(channels: string[], format: string | null): string {
    const names = [...channels].sort().map(channelLabel);
    if (names.length === 1 && format && FORMAT_LABELS[format.toLowerCase()]) {
        return `${names[0]} · ${FORMAT_LABELS[format.toLowerCase()]}`;
    }
    return names.join(" · ");
}

/** NEEDS_REVIEW -> "NEEDS REVIEW" */
export const statusLabel = (s: string) => s.replace(/_/g, " ");

// ---------- numbers ----------

/** 84210 -> "84.2K", 1250000 -> "1.3M" */
export function compact(n: number): string {
    if (n >= 1_000_000) return `${trim(n / 1_000_000)}M`;
    if (n >= 1_000) return `${trim(n / 1_000)}K`;
    return String(n);
}
const trim = (v: number) => v.toFixed(1).replace(/\.0$/, "");

/** 18.4 -> "+18.4%", -0.3 -> "−0.3%" (real minus sign, like the design) */
export function signedPct(v: number): string {
    if (v > 0) return `+${v.toFixed(1)}%`;
    if (v < 0) return `−${Math.abs(v).toFixed(1)}%`;
    return "0.0%";
}

/** 6 -> "+6", -2 -> "−2" */
export function signedInt(v: number): string {
    if (v > 0) return `+${v}`;
    if (v < 0) return `−${Math.abs(v)}`;
    return "0";
}

// ---------- campaigns ----------

const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });

const parseDay = (s: string) => new Date(`${s}T00:00:00Z`);

/** "1–30 Sep", "28 Sep–4 Oct", "12 Oct", or "No dates yet" */
export function dateRange(start: string | null, end: string | null): string {
    if (!start && !end) return "No dates yet";
    if (!start || !end || start === end) {
        const d = parseDay((start ?? end)!);
        return `${d.getUTCDate()} ${MONTH.format(d)}`;
    }
    const a = parseDay(start);
    const b = parseDay(end);
    if (a.getUTCMonth() === b.getUTCMonth()) {
        return `${a.getUTCDate()}–${b.getUTCDate()} ${MONTH.format(b)}`;
    }
    return `${a.getUTCDate()} ${MONTH.format(a)}–${b.getUTCDate()} ${MONTH.format(b)}`;
}

/** 8 / 12 -> 66.67 (safe for 0 totals) */
export const progressPct = (ready: number, total: number) => (total > 0 ? (ready / total) * 100 : 0);