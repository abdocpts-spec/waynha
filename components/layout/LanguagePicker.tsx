"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, isLang, type Lang } from "@/lib/i18n";

/**
 * قائمة اللغة: زر منسدل فيه اقتراح تلقائي من لغة المتصفح، وبحث، وقائمة بالأسماء الأصلية.
 * translate="no" حتى لا تُترجَم أسماء اللغات نفسها.
 * onlyBase: لغتان فقط (العربية والإنجليزية) للمواطن؛ الأجنبي يرى كل اللغات.
 */
export default function LanguagePicker({
  lang,
  onlyBase = false,
  variant = "header",
}: {
  lang: Lang;
  onlyBase?: boolean;
  variant?: "header" | "lander";
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [detected, setDetected] = useState<Lang | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);

  const available = useMemo(() => LANGUAGES.filter((l) => !onlyBase || l.code === "ar" || l.code === "en"), [onlyBase]);
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = query.trim().toLowerCase();
  const filtered = available.filter(
    (l) => !q || l.label.toLowerCase().includes(q) || l.english.toLowerCase().includes(q) || l.code === q,
  );

  const choose = (code: Lang) => {
    if (code === lang) return setOpen(false);
    document.cookie = `waynha-lang=${code}; path=/; max-age=31536000; samesite=lax`;
    // تحميل كامل: يضمن زوال أي نص مترجَم من اللغة السابقة
    window.location.reload();
  };

  const detectedInfo = detected ? LANGUAGES.find((l) => l.code === detected) : null;

  return (
    <div className={`lang-picker lang-picker--${variant}`} ref={root} translate="no">
      <button
        type="button"
        className="lang-picker-btn"
        onClick={() => {
          if (!open) {
            // الاقتراح من لغة المتصفح يُحسب عند الفتح فقط (navigator غير متاح على الخادم)
            const code = navigator.language?.slice(0, 2).toLowerCase();
            setDetected(isLang(code) && code !== lang && available.some((l) => l.code === code) ? code : null);
          }
          setOpen((v) => !v);
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
      >
        <span aria-hidden="true">🌐</span>
        <span className="lang-picker-current">{current.label}</span>
        <span aria-hidden="true" className="lang-picker-caret">▾</span>
      </button>

      {open && (
        <div className="lang-picker-panel" role="dialog" aria-label="Language">
          {detectedInfo && (
            <button type="button" className="lang-picker-detected" onClick={() => choose(detectedInfo.code)}>
              ✨ <span dir="ltr">{detectedInfo.label}</span>
              <small>(browser)</small>
            </button>
          )}
          <input
            ref={search}
            className="lang-picker-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered[0]) choose(filtered[0].code);
            }}
            placeholder="Search…"
            aria-label="Search language"
            dir="ltr"
          />
          <ul className="lang-picker-list" role="listbox">
            {filtered.map((l) => (
              <li key={l.code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={l.code === lang}
                  className={`lang-picker-item${l.code === lang ? " active" : ""}`}
                  onClick={() => choose(l.code)}
                  dir={l.rtl ? "rtl" : "ltr"}
                >
                  <span>{l.label}</span>
                  <small dir="ltr">{l.english}</small>
                  {l.code === lang && <span aria-hidden="true">✓</span>}
                </button>
              </li>
            ))}
            {filtered.length === 0 && <li className="lang-picker-empty">—</li>}
          </ul>
        </div>
      )}
    </div>
  );
}
