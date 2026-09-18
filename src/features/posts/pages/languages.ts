export type LanguageCode =
    | "ENGLISH" | "HINGLISH" | "HINDI" | "TAMIL" | "TELUGU"
    | "KANNADA" | "MALAYALAM" | "MARATHI" | "BENGALI"
    | "GUJARATI" | "PUNJABI" | "ODIA";

export const LANGUAGES: { code: LanguageCode; label: string; native: string }[] = [
    { code: "ENGLISH", label: "English", native: "English" },
    { code: "HINGLISH", label: "Hinglish", native: "Hinglish" },
    { code: "HINDI", label: "Hindi", native: "हिन्दी" },
    { code: "TAMIL", label: "Tamil", native: "தமிழ்" },
    { code: "TELUGU", label: "Telugu", native: "తెలుగు" },
    { code: "KANNADA", label: "Kannada", native: "ಕನ್ನಡ" },
    { code: "MALAYALAM", label: "Malayalam", native: "മലയാളം" },
    { code: "MARATHI", label: "Marathi", native: "मराठी" },
    { code: "BENGALI", label: "Bengali", native: "বাংলা" },
    { code: "GUJARATI", label: "Gujarati", native: "ગુજરાતી" },
    { code: "PUNJABI", label: "Punjabi", native: "ਪੰਜਾਬੀ" },
    { code: "ODIA", label: "Odia", native: "ଓଡ଼ିଆ" },
];