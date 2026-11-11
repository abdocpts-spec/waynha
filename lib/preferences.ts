/**
 * تفضيلات المستخدم المحفوظة في المتصفح (localStorage) — نفس مفاتيح النموذج الأولي.
 * تُطبَّق على <html> كأصناف (classes) قبل أول رسم عبر PREFS_SCRIPT في layout،
 * ثم تحدّثها صفحة الإعدادات مباشرة عبر applyPreferences().
 *
 * لا يوجد حساب على الخادم: «الحساب» هنا ملف شخصي محلي على هذا الجهاز فقط،
 * ولا تُحفظ كلمة المرور إطلاقاً.
 */

export const PREF_KEYS = {
  theme: "waynha-theme",
  font: "waynha-font",
  contrast: "waynha-contrast",
  primary: "waynha-primary",
  simple: "waynha-simple",
  profile: "waynha-user",
} as const;

export type FontSize = "" | "large-text" | "xlarge-text";

export type Profile = { name: string; contact: string; cityId: string };

export const PRIMARY_COLORS = ["#1a56db", "#0d9488", "#059669", "#7c3aed"] as const;
export const DEFAULT_PRIMARY = PRIMARY_COLORS[0];

const HEX = /^#[0-9a-f]{6}$/i;

export function readPref(key: string, fallback = ""): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback; // وضع التصفح الخاص أو تخزين محظور
  }
}

export function writePref(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // نكتفي بالتطبيق للجلسة الحالية
  }
  window.dispatchEvent(new Event("waynha-prefs"));
}

/** يطبّق التفضيلات الحالية على <html>. نفس منطق PREFS_SCRIPT. */
export function applyPreferences() {
  const root = document.documentElement;
  root.setAttribute("data-theme", readPref(PREF_KEYS.theme) === "dark" ? "dark" : "light");
  root.classList.remove("large-text", "xlarge-text");
  const font = readPref(PREF_KEYS.font);
  if (font === "large-text" || font === "xlarge-text") root.classList.add(font);
  const contrast = readPref(PREF_KEYS.contrast) === "1";
  root.classList.toggle("high-contrast", contrast);
  root.classList.toggle("simple-mode", readPref(PREF_KEYS.simple) === "1");
  const color = readPref(PREF_KEYS.primary);
  // التباين العالي له ألوانه الخاصة، فلا نفرض اللون المختار فوقه
  if (!contrast && HEX.test(color) && color.toLowerCase() !== DEFAULT_PRIMARY) root.style.setProperty("--primary", color);
  else root.style.removeProperty("--primary");
}

/**
 * نسخة نصية ثابتة من applyPreferences تعمل في <head> قبل أول رسم حتى لا تومض الصفحة.
 * لا تحتوي أي مدخلات مستخدم؛ اللون المخزّن يُفحص بتعبير نمطي قبل استخدامه.
 */
export const PREFS_SCRIPT = `try{var s=localStorage,r=document.documentElement;r.setAttribute('data-theme',s.getItem('waynha-theme')==='dark'?'dark':'light');var f=s.getItem('waynha-font');if(f==='large-text'||f==='xlarge-text')r.classList.add(f);var c=s.getItem('waynha-contrast')==='1';if(c)r.classList.add('high-contrast');if(s.getItem('waynha-simple')==='1')r.classList.add('simple-mode');var p=s.getItem('waynha-primary');if(!c&&p&&/^#[0-9a-f]{6}$/i.test(p)&&p.toLowerCase()!=='${DEFAULT_PRIMARY}')r.style.setProperty('--primary',p)}catch(e){}`;

export function readProfile(): Profile | null {
  try {
    const raw = readPref(PREF_KEYS.profile);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<Profile>;
    if (typeof p.contact !== "string") return null;
    return { name: String(p.name ?? ""), contact: p.contact, cityId: String(p.cityId ?? "") };
  } catch {
    return null;
  }
}

export function saveProfile(profile: Profile | null) {
  writePref(PREF_KEYS.profile, profile ? JSON.stringify(profile) : null);
}

/** الحرف الأول للاسم (أو لبيانات الدخول) لعرضه في دائرة الحساب. */
export function initials(profile: Profile): string {
  const source = profile.name.trim() || profile.contact.trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

// ─────────── آخر عمليات البحث والإجراءات المحفوظة (نفس مفاتيح النموذج الأولي) ───────────

export type RecentSearch = { q: string; at: number };

const RECENT_KEY = "waynha-recent";
const SAVED_KEY = "waynha-saved";

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = readPref(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readRecentSearches(): RecentSearch[] {
  const list = readJSON<RecentSearch[]>(RECENT_KEY, []);
  return Array.isArray(list) ? list.filter((r) => typeof r?.q === "string" && typeof r?.at === "number") : [];
}

/** يضيف بحثاً لأعلى القائمة (بدون تكرار) ويحتفظ بآخر 10. */
export function addRecentSearch(query: string) {
  const q = query.trim().slice(0, 200);
  if (!q) return;
  const list = readRecentSearches().filter((r) => r.q !== q);
  list.unshift({ q, at: Date.now() });
  writePref(RECENT_KEY, JSON.stringify(list.slice(0, 10)));
}

export function clearRecentSearches() {
  writePref(RECENT_KEY, null);
}

export function readSavedServices(): string[] {
  const list = readJSON<string[]>(SAVED_KEY, []);
  return Array.isArray(list) ? list.filter((id) => typeof id === "string") : [];
}

/** يحفظ الإجراء أو يلغي حفظه، ويرجع الحالة الجديدة. */
export function toggleSavedService(id: string): boolean {
  const list = readSavedServices();
  const index = list.indexOf(id);
  if (index >= 0) list.splice(index, 1);
  else list.unshift(id);
  writePref(SAVED_KEY, JSON.stringify(list));
  return index < 0;
}
