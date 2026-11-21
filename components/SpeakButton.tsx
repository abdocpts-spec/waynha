"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { t, type Lang } from "@/lib/i18n";

/** أفضل صوت متاح للغة: العربية (أولوية للعربية السعودية/المصرية) أو الإنجليزية. */
function pickVoice(code: "ar" | "en"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(code));
  if (code === "en") return voices[0];
  const prefer = ["ar-sa", "ar-eg", "ar-ae"];
  return (
    prefer.map((p) => voices.find((v) => v.lang.toLowerCase() === p)).find(Boolean) ?? voices[0]
  );
}

/** يجمع الأجزاء القصيرة المتتالية في مقاطع (≤ max حرفاً) مع الحفاظ على الترتيب. */
function groupParts(parts: string[], max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const p of parts) {
    if (cur && cur.length + p.length + 1 > max) {
      out.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}
${p}` : p;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/**
 * زر «استمع»: قراءة النص بصوت المتصفح (Text-to-Speech) بدون إرسال أي شيء لخادم خارجي.
 * - بالعربية: يستخدم صوتاً عربياً من الجهاز إن وُجد، وإلا يطلب الصوت من الخادم (Gemini) فيُقرأ بالعربية دائماً.
 * - `parts` تُقرأ واحدة بعد الأخرى بنفس الترتيب (مثلاً خطوة بخطوة)، وهذا أدق من نص طويل واحد.
 * - يختفي إذا كان المتصفح لا يدعم القراءة الصوتية.
 */
export default function SpeakButton({
  text,
  parts,
  lang,
  compact = false,
}: {
  text?: string;
  parts?: string[];
  lang: Lang;
  compact?: boolean;
}) {
  const supported = useSyncExternalStore(
    () => () => {},
    () => "speechSynthesis" in window,
    () => false,
  );
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const run = useRef(0); // رقم الجلسة الحالية؛ يلغي القراءة القديمة عند الإيقاف
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      run.current += 1;
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const queue = (parts ?? (text ? [text] : [])).map((p) => p.trim()).filter(Boolean);
  if (!supported || queue.length === 0) return null;

  function stop() {
    run.current += 1;
    audio.current?.pause();
    audio.current = null;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setLoading(false);
  }

  /**
   * صوت عربي من الخادم عندما لا يملك الجهاز صوتاً عربياً.
   * النص يُقسَّم إلى مقاطع قصيرة تُقرأ بالترتيب، ويُجهَّز المقطع التالي أثناء قراءة الحالي فلا يطول الانتظار.
   * يرجع false فقط إذا فشل أول مقطع (فنعود لصوت المتصفح).
   */
  async function speakFromServer(id: number): Promise<boolean> {
    const chunks = groupParts(queue, 320);
    const fetchChunk = async (text: string): Promise<string | null> => {
      try {
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, lang: "ar" }),
        });
        return res.ok ? URL.createObjectURL(await res.blob()) : null;
      } catch {
        return null;
      }
    };

    let pending = fetchChunk(chunks[0]);
    for (let i = 0; i < chunks.length; i++) {
      const url = await pending;
      if (run.current !== id) {
        if (url) URL.revokeObjectURL(url);
        return true;
      }
      if (!url) {
        if (i === 0) return false;
        setSpeaking(false);
        setFailed(true);
        return true;
      }
      if (i + 1 < chunks.length) pending = fetchChunk(chunks[i + 1]);
      const el = new Audio(url);
      audio.current = el;
      setLoading(false);
      setSpeaking(true);
      await new Promise<void>((resolve) => {
        el.onended = () => resolve();
        el.onpause = () => resolve();
        el.onerror = () => resolve();
        el.play().catch(() => resolve());
      });
      URL.revokeObjectURL(url);
      if (run.current !== id) return true;
    }
    setSpeaking(false);
    return true;
  }

  async function start() {
    const synth = window.speechSynthesis;
    synth.cancel();
    const id = ++run.current;
    const code = lang === "ar" ? "ar" : "en";
    const voice = pickVoice(code);
    setFailed(false);

    if (code === "ar" && !voice) {
      setLoading(true);
      if (await speakFromServer(id)) return;
      if (run.current !== id) return;
      setLoading(false);
      setFailed(true); // تعذّر الصوت العربي: نقرأ بأي صوت متاح بدل الصمت
    }
    setSpeaking(true);

    const next = (index: number) => {
      if (run.current !== id) return;
      if (index >= queue.length) {
        setSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(queue[index]);
      utterance.lang = voice?.lang ?? (code === "ar" ? "ar-SA" : "en-US");
      if (voice) utterance.voice = voice;
      utterance.rate = 0.95;
      utterance.onend = () => next(index + 1);
      utterance.onerror = () => {
        if (run.current === id) setSpeaking(false);
      };
      synth.speak(utterance);
    };
    next(0);
  }

  const busy = speaking || loading;
  const label = loading
    ? t(lang, "جارٍ التحضير…", "Preparing…")
    : speaking
      ? t(lang, "إيقاف القراءة", "Stop reading")
      : t(lang, "استمع", "Listen");
  return (
    <>
      <button
        type="button"
        className={`btn-outline speak-btn${compact ? " speak-compact" : ""}`}
        onClick={busy ? stop : start}
        aria-pressed={busy}
        aria-busy={loading}
        aria-label={label}
        title={label}
      >
        <span aria-hidden="true">{busy ? "⏹" : "🔊"}</span> {compact ? null : label}
      </button>
      {failed && (
        <span className="speak-note" role="status">
          {t(lang, "تعذّر تشغيل الصوت العربي الآن؛ جرّب لاحقاً أو أضِف صوتاً عربياً من إعدادات النظام.", "Speech is unavailable right now.")}
        </span>
      )}
    </>
  );
}
