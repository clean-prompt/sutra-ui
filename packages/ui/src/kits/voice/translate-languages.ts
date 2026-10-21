import { cn } from "../../lib/cn";

/* ------------------------------------------------------------------ */
/* Languages                                                           */
/* ------------------------------------------------------------------ */

export interface Language {
  /** BCP-47 code, e.g. "hi", "zh-CN". */
  code: string;
  /** English name. */
  name: string;
  /** Endonym. */
  nativeName: string;
  rtl?: boolean;
}

/** Pseudo language code for automatic detection. */
export const DETECT_LANGUAGE = "auto";

const L = (code: string, name: string, nativeName: string, rtl?: boolean): Language => (rtl ? { code, name, nativeName, rtl } : { code, name, nativeName });

/** ~100 common languages with English and native names. */
export const languages: Language[] = [
  L("af", "Afrikaans", "Afrikaans"),
  L("sq", "Albanian", "Shqip"),
  L("am", "Amharic", "አማርኛ"),
  L("ar", "Arabic", "العربية", true),
  L("hy", "Armenian", "Հայերեն"),
  L("as", "Assamese", "অসমীয়া"),
  L("az", "Azerbaijani", "Azərbaycan"),
  L("eu", "Basque", "Euskara"),
  L("be", "Belarusian", "Беларуская"),
  L("bn", "Bengali", "বাংলা"),
  L("bs", "Bosnian", "Bosanski"),
  L("bg", "Bulgarian", "Български"),
  L("my", "Burmese", "မြန်မာ"),
  L("ca", "Catalan", "Català"),
  L("ceb", "Cebuano", "Cebuano"),
  L("zh-CN", "Chinese (Simplified)", "简体中文"),
  L("zh-TW", "Chinese (Traditional)", "繁體中文"),
  L("co", "Corsican", "Corsu"),
  L("hr", "Croatian", "Hrvatski"),
  L("cs", "Czech", "Čeština"),
  L("da", "Danish", "Dansk"),
  L("dv", "Dhivehi", "ދިވެހި", true),
  L("nl", "Dutch", "Nederlands"),
  L("en", "English", "English"),
  L("eo", "Esperanto", "Esperanto"),
  L("et", "Estonian", "Eesti"),
  L("fil", "Filipino", "Filipino"),
  L("fi", "Finnish", "Suomi"),
  L("fr", "French", "Français"),
  L("gl", "Galician", "Galego"),
  L("ka", "Georgian", "ქართული"),
  L("de", "German", "Deutsch"),
  L("el", "Greek", "Ελληνικά"),
  L("gu", "Gujarati", "ગુજરાતી"),
  L("ht", "Haitian Creole", "Kreyòl ayisyen"),
  L("ha", "Hausa", "Hausa"),
  L("haw", "Hawaiian", "ʻŌlelo Hawaiʻi"),
  L("he", "Hebrew", "עברית", true),
  L("hi", "Hindi", "हिन्दी"),
  L("hmn", "Hmong", "Hmoob"),
  L("hu", "Hungarian", "Magyar"),
  L("is", "Icelandic", "Íslenska"),
  L("ig", "Igbo", "Igbo"),
  L("id", "Indonesian", "Bahasa Indonesia"),
  L("ga", "Irish", "Gaeilge"),
  L("it", "Italian", "Italiano"),
  L("ja", "Japanese", "日本語"),
  L("jv", "Javanese", "Basa Jawa"),
  L("kn", "Kannada", "ಕನ್ನಡ"),
  L("kk", "Kazakh", "Қазақ"),
  L("km", "Khmer", "ខ្មែរ"),
  L("rw", "Kinyarwanda", "Kinyarwanda"),
  L("ko", "Korean", "한국어"),
  L("ku", "Kurdish", "Kurdî"),
  L("ky", "Kyrgyz", "Кыргызча"),
  L("lo", "Lao", "ລາວ"),
  L("la", "Latin", "Latina"),
  L("lv", "Latvian", "Latviešu"),
  L("lt", "Lithuanian", "Lietuvių"),
  L("lb", "Luxembourgish", "Lëtzebuergesch"),
  L("mk", "Macedonian", "Македонски"),
  L("mai", "Maithili", "मैथिली"),
  L("mg", "Malagasy", "Malagasy"),
  L("ms", "Malay", "Bahasa Melayu"),
  L("ml", "Malayalam", "മലയാളം"),
  L("mt", "Maltese", "Malti"),
  L("mi", "Maori", "Māori"),
  L("mr", "Marathi", "मराठी"),
  L("mn", "Mongolian", "Монгол"),
  L("ne", "Nepali", "नेपाली"),
  L("no", "Norwegian", "Norsk"),
  L("ny", "Nyanja", "Chichewa"),
  L("or", "Odia", "ଓଡ଼ିଆ"),
  L("ps", "Pashto", "پښتو", true),
  L("fa", "Persian", "فارسی", true),
  L("pl", "Polish", "Polski"),
  L("pt", "Portuguese", "Português"),
  L("pa", "Punjabi", "ਪੰਜਾਬੀ"),
  L("ro", "Romanian", "Română"),
  L("ru", "Russian", "Русский"),
  L("sm", "Samoan", "Gagana Sāmoa"),
  L("sa", "Sanskrit", "संस्कृतम्"),
  L("gd", "Scots Gaelic", "Gàidhlig"),
  L("sr", "Serbian", "Српски"),
  L("st", "Sesotho", "Sesotho"),
  L("sn", "Shona", "chiShona"),
  L("sd", "Sindhi", "سنڌي", true),
  L("si", "Sinhala", "සිංහල"),
  L("sk", "Slovak", "Slovenčina"),
  L("sl", "Slovenian", "Slovenščina"),
  L("so", "Somali", "Soomaali"),
  L("es", "Spanish", "Español"),
  L("su", "Sundanese", "Basa Sunda"),
  L("sw", "Swahili", "Kiswahili"),
  L("sv", "Swedish", "Svenska"),
  L("tg", "Tajik", "Тоҷикӣ"),
  L("ta", "Tamil", "தமிழ்"),
  L("tt", "Tatar", "Татар"),
  L("te", "Telugu", "తెలుగు"),
  L("th", "Thai", "ไทย"),
  L("tr", "Turkish", "Türkçe"),
  L("tk", "Turkmen", "Türkmen"),
  L("uk", "Ukrainian", "Українська"),
  L("ur", "Urdu", "اردو", true),
  L("ug", "Uyghur", "ئۇيغۇرچە", true),
  L("uz", "Uzbek", "Oʻzbek"),
  L("vi", "Vietnamese", "Tiếng Việt"),
  L("cy", "Welsh", "Cymraeg"),
  L("xh", "Xhosa", "isiXhosa"),
  L("yi", "Yiddish", "ייִדיש", true),
  L("yo", "Yoruba", "Yorùbá"),
  L("zu", "Zulu", "isiZulu"),
];

/** Look up a language by code (case-insensitive, falls back to the base subtag). */
export function getLanguage(code: string | undefined, list: Language[] = languages): Language | undefined {
  if (!code) return undefined;
  const c = code.toLowerCase().replace(/_/g, "-");
  const parts = c.split("-");
  const base = parts[0]!;
  const byCode = (x: string) => list.find((l) => l.code.toLowerCase() === x);
  const exact = byCode(c);
  if (exact) return exact;
  // Detectors often say "zh", "zh-Hans" or "zh-Hant-HK"; map script and region to the listed variant.
  if (base === "zh") {
    const traditional = parts.some((p) => p === "hant" || p === "tw" || p === "hk" || p === "mo");
    const variant = byCode(traditional ? "zh-tw" : "zh-cn");
    if (variant) return variant;
  }
  return byCode(base) ?? list.find((l) => l.code.toLowerCase().split("-")[0] === base);
}

/** "rtl" for right-to-left languages, else "ltr". */
export function languageDir(code: string | undefined, list: Language[] = languages): "rtl" | "ltr" {
  return getLanguage(code, list)?.rtl ? "rtl" : "ltr";
}

/** Filter + rank languages by English name, native name or code. */
export function searchLanguages(query: string, list: Language[] = languages) {
  const q = query.trim().toLowerCase();
  if (!q) return list;
  const scored: Array<[number, Language]> = [];
  for (const l of list) {
    const code = l.code.toLowerCase();
    const name = l.name.toLowerCase();
    const native = l.nativeName.toLowerCase();
    let s = -1;
    if (code === q) s = 0;
    else if (name.startsWith(q) || native.startsWith(q)) s = 1;
    else if (code.startsWith(q)) s = 2;
    else if (name.includes(q) || native.includes(q)) s = 3;
    if (s >= 0) scored.push([s, l]);
  }
  return scored.sort((a, b) => a[0] - b[0] || a[1].name.localeCompare(b[1].name)).map(([, l]) => l);
}
