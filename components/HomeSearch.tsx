"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { addRecentSearch } from "@/lib/preferences";

const EXAMPLES: Record<Lang, { label: string; query: string }[]> = {
  ar: [
    { label: "📕 ضاع جوازي", query: "ضاع جوازي شن ندير؟" },
    { label: "🛂 تجديد جواز السفر", query: "نبي نجدد جواز السفر" },
    { label: "👶 شهادة ميلاد", query: "نبي نطلع ورقة ميلاد" },
    { label: "🚘 تجديد رخصة القيادة", query: "شن نحتاج لتجديد الرخصة؟" },
    { label: "🪪 بطاقة هوية", query: "استخراج بطاقة الهوية الوطنية" },
  ],
  en: [
    { label: "📕 Lost my passport", query: "I lost my passport, what do I do?" },
    { label: "🛂 Passport renewal", query: "renew my passport" },
    { label: "👶 Birth certificate", query: "I need a birth certificate" },
    { label: "🚘 Driving license renewal", query: "What do I need to renew my driving license?" },
    { label: "🪪 National ID", query: "issue a national ID card" },
  ],
};

/**
 * مربع البحث الرئيسي: يفتح مساعد وينها بالسؤال جاهزاً،
 * مع إبقاء البحث العادي في دليل الخدمات.
 */
export default function HomeSearch({ lang }: { lang: Lang }) {
  const router = useRouter();
  const [value, setValue] = useState("");

  const ask = (question: string) => {
    const query = question.trim();
    if (!query) return;
    addRecentSearch(query);
    router.push(`/assistant?q=${encodeURIComponent(query)}`);
  };

  return (
    <>
      <div className="search-wrapper">
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">🔍</span>
          <input
            type="text"
            className="search-input"
            value={value}
            maxLength={1000}
            onChange={(event) => setValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") ask(value);
            }}
            placeholder={t(lang, "شن الإجراء اللي تبي تعرف عليه؟", "What procedure are you looking for?")}
            aria-label={t(lang, "اسأل مساعد وينها", "Ask the WAYNHA assistant")}
          />
          <button className="search-submit" type="button" onClick={() => ask(value)}>
            {t(lang, "اسأل وينها", "Ask WAYNHA")}
          </button>
        </div>
      </div>

      <div className="query-examples">
        {EXAMPLES[lang].map((example) => (
          <span
            key={example.label}
            className="query-tag"
            role="button"
            tabIndex={0}
            onClick={() => ask(example.query)}
            onKeyDown={(event) => {
              if (event.key === "Enter") ask(example.query);
            }}
          >
            {example.label}
          </span>
        ))}
      </div>

      <p style={{ marginTop: 16, fontSize: "0.88rem", color: "var(--text-muted)" }}>
        {t(lang, "تحب تتصفح بنفسك؟", "Prefer to browse?")}{" "}
        <Link href="/services" style={{ color: "var(--primary)", fontWeight: 600 }}>
          {t(lang, "افتح دليل الخدمات ←", "Open the services directory →")}
        </Link>
      </p>
    </>
  );
}
