"use client";

import { useEffect, useState } from "react";
import { t, type Lang } from "@/lib/i18n";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** زر «ثبّت التطبيق»: يظهر فقط إذا عرض المتصفح التثبيت المباشر (Chrome وEdge على أندرويد والكمبيوتر). */
export default function InstallButton({ lang }: { lang: Lang }) {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (done) return <p className="install-ok">✅ {t(lang, "تم تثبيت وينها على جهازك.", "WAYNHA is installed on your device.")}</p>;
  if (!event) return null;

  return (
    <button
      type="button"
      className="btn-primary"
      onClick={async () => {
        await event.prompt();
        const choice = await event.userChoice;
        if (choice.outcome === "accepted") setDone(true);
        setEvent(null);
      }}
    >
      📲 {t(lang, "ثبّت وينها على هذا الجهاز", "Install WAYNHA on this device")}
    </button>
  );
}
