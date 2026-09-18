import { LanguageCode } from "../posts/pages/languages";


const NOTO_FAMILY: Partial<Record<LanguageCode, string>> = {
    HINDI: "Noto Sans Devanagari",
    MARATHI: "Noto Sans Devanagari",
    BENGALI: "Noto Sans Bengali",
    TAMIL: "Noto Sans Tamil",
    TELUGU: "Noto Sans Telugu",
    KANNADA: "Noto Sans Kannada",
    MALAYALAM: "Noto Sans Malayalam",
    GUJARATI: "Noto Sans Gujarati",
    PUNJABI: "Noto Sans Gurmukhi",
    ODIA: "Noto Sans Oriya",
    // ENGLISH and HINGLISH are Latin — brand fonts already cover them
};

const loaded = new Set<string>();

/** Returns the font family to render with, or null to keep the brand font. */
export async function loadFontForLanguage(language: LanguageCode): Promise<string | null> {
    const family = NOTO_FAMILY[language];
    if (!family) return null;

    if (!loaded.has(family)) {
        const href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700&display=swap`;
        if (!document.querySelector(`link[href="${href}"]`)) {
            const link = document.createElement("link");
            link.rel = "stylesheet";
            link.href = href;
            document.head.appendChild(link);
        }
        // canvas fillText needs the face actually loaded, not just the CSS requested
        await Promise.all([
            document.fonts.load(`400 64px "${family}"`),
            document.fonts.load(`700 64px "${family}"`),
        ]);
        loaded.add(family);
    }

    return family;
}