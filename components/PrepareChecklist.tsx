"use client";

import { useSyncExternalStore } from "react";
import SpeakButton from "@/components/SpeakButton";
import { t, type Lang } from "@/lib/i18n";

type Item = { key: string; text: string };

// تخزين في المتصفح فقط؛ إن تعذّر localStorage نحتفظ بالحالة في الذاكرة لهذه الجلسة
const memory = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function readRaw(key: string): string {
  try {
    return localStorage.getItem(key) ?? memory.get(key) ?? "";
  } catch {
    return memory.get(key) ?? "";
  }
}

function writeRaw(key: string, value: string) {
  memory.set(key, value);
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // الذاكرة تكفي لهذه الجلسة
  }
  listeners.forEach((cb) => cb());
}

function parse(raw: string): Record<string, boolean> {
  try {
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

/**
 * «جهزني»: قائمة تحقق بالمستندات والخطوات قبل الذهاب.
 * التقدّم يُحفظ في متصفح المستخدم فقط (localStorage) ولا يُرسل لأي خادم.
 */
export default function PrepareChecklist({
  serviceId,
  lang,
  title,
  documents,
  steps,
  fees,
  hours,
  officeName,
}: {
  serviceId: string;
  lang: Lang;
  title: string;
  documents: string[];
  steps: string[];
  fees: string;
  hours: string;
  officeName?: string;
}) {
  const storeKey = `waynha-prepare:${serviceId}`;
  const docs: Item[] = documents.map((text, i) => ({ key: `d${i}`, text }));
  const stepItems: Item[] = steps.map((text, i) => ({ key: `s${i}`, text }));
  const all = [...docs, ...stepItems];

  const raw = useSyncExternalStore(
    subscribe,
    () => readRaw(storeKey),
    () => "",
  );
  const done = parse(raw);

  function toggle(key: string) {
    const next = { ...done, [key]: !done[key] };
    writeRaw(storeKey, JSON.stringify(next));
  }

  function reset() {
    writeRaw(storeKey, "");
  }

  const count = all.filter((i) => done[i.key]).length;
  const percent = all.length ? Math.round((count / all.length) * 100) : 0;

  const spoken = [
    title,
    documents.length ? `${t(lang, "المستندات المطلوبة", "Required documents")}: ${documents.join(". ")}` : "",
    steps.length ? `${t(lang, "الخطوات", "Steps")}: ${steps.map((s, i) => `${i + 1}. ${s}`).join(". ")}` : "",
    fees ? `${t(lang, "الرسوم", "Fees")}: ${fees}` : "",
    hours ? `${t(lang, "ساعات العمل", "Working hours")}: ${hours}` : "",
  ]
    .filter(Boolean)
    .join(". ");

  if (all.length === 0) return null;

  const group = (heading: string, items: Item[]) =>
    items.length > 0 && (
      <div className="prep-group">
        <h3>{heading}</h3>
        <ul>
          {items.map((item) => (
            <li key={item.key}>
              <label className={done[item.key] ? "prep-done" : ""}>
                <input type="checkbox" checked={!!done[item.key]} onChange={() => toggle(item.key)} />
                <span>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <section className="content-card prep" id="prepare" aria-labelledby="prepare-title">
      <div className="prep-head">
        <h2 className="content-title" id="prepare-title" style={{ margin: 0 }}>
          🎒 {t(lang, "جهزني قبل ما تمشي", "Get me ready")}
        </h2>
        <div className="prep-tools">
          <SpeakButton text={spoken} lang={lang} />
          <button type="button" className="btn-outline" onClick={() => window.print()}>
            🖨 {t(lang, "طباعة", "Print")}
          </button>
        </div>
      </div>

      <div className="prep-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}>
        <div style={{ width: `${percent}%` }} />
      </div>
      <p className="prep-count">
        {t(lang, `جاهز ${count} من ${all.length}`, `${count} of ${all.length} ready`)}
        {count === all.length && ` — ${t(lang, "تمام، تقدر تمشي ✅", "all set, you can go ✅")}`}
      </p>

      {group(`📎 ${t(lang, "جهّز هذه المستندات", "Gather these documents")}`, docs)}
      {group(`🪜 ${t(lang, "تأكد من الخطوات", "Check the steps")}`, stepItems)}

      <div className="prep-before">
        <strong>{t(lang, "قبل ما تخرج:", "Before you leave:")}</strong>
        <ul>
          {officeName && <li>📍 {t(lang, `الوجهة: ${officeName}`, `Destination: ${officeName}`)}</li>}
          {hours && <li>🕒 {t(lang, `الدوام: ${hours}`, `Hours: ${hours}`)}</li>}
          {fees && <li>💰 {t(lang, `الرسوم: ${fees}`, `Fees: ${fees}`)}</li>}
          <li>
            ⚠️{" "}
            {t(
              lang,
              "تأكد من الجهة الرسمية قبل الذهاب؛ وينها منصة إرشادية مستقلة.",
              "Confirm with the official authority first; WAYNHA is an independent guide.",
            )}
          </li>
        </ul>
      </div>

      {count > 0 && (
        <button type="button" className="btn-outline" onClick={reset}>
          ↺ {t(lang, "إعادة التعيين", "Reset")}
        </button>
      )}
    </section>
  );
}
