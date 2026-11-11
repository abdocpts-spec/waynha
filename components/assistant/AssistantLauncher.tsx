"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, type Lang } from "@/lib/i18n";

/** زر المساعد العائم في كل الصفحات (يختفي داخل صفحة المساعد نفسها). */
export default function AssistantLauncher({ lang }: { lang: Lang }) {
  const pathname = usePathname();
  if (pathname === "/assistant") return null;

  return (
    <Link
      href="/assistant"
      className="assistant-fab"
      aria-label={t(lang, "افتح مساعد وينها", "Open the WAYNHA assistant")}
      title={t(lang, "مساعد وينها", "WAYNHA assistant")}
    >
      🤖
    </Link>
  );
}
