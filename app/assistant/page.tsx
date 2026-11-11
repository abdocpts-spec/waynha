import type { Metadata } from "next";
import ChatWindow from "@/components/assistant/ChatWindow";
import { isAiConfigured } from "@/lib/ai/gemini";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";

export const metadata: Metadata = {
  title: "مساعد وينها | WAYNHA Assistant",
  description: "اسأل مساعد وينها عن أي إجراء حكومي ليبي — يجاوب من قاعدة بيانات وينها.",
};

export default async function AssistantPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const lang = await getLang();
  const { q } = await searchParams;
  const configured = isAiConfigured();

  return (
    <main className="assistant-page">
      <div className="container" style={{ maxWidth: 900 }}>
        {!configured && (
          <div className="demo-banner">
            <span aria-hidden="true">🔑</span>
            <span>
              {t(
                lang,
                "مفتاح Gemini غير مضبوط. ضع GEMINI_API_KEY في ملف .env.local ثم أعد تشغيل الخادم.",
                "Gemini key is missing. Add GEMINI_API_KEY to .env.local and restart the server.",
              )}
            </span>
          </div>
        )}
        <ChatWindow lang={lang} initialQuestion={q?.slice(0, 1000)} />
      </div>
    </main>
  );
}
