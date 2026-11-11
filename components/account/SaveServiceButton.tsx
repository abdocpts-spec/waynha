"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";
import { readSavedServices, toggleSavedService } from "@/lib/preferences";

/** زر «حفظ الإجراء» في صفحة الخدمة. المحفوظات تظهر في لوحة التحكم (على هذا الجهاز). */
export default function SaveServiceButton({ id, lang }: { id: string; lang: Lang }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const sync = () => setSaved(readSavedServices().includes(id));
    sync();
    window.addEventListener("waynha-prefs", sync);
    return () => window.removeEventListener("waynha-prefs", sync);
  }, [id]);

  return (
    <button
      type="button"
      className="btn-primary"
      aria-pressed={saved}
      onClick={() => setSaved(toggleSavedService(id))}
      style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
    >
      {saved ? `★ ${t(lang, "محفوظ", "Saved")}` : `☆ ${t(lang, "حفظ الإجراء", "Save procedure")}`}
    </button>
  );
}
