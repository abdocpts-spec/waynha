import Link from "next/link";
import DemoDataBanner from "@/components/DemoDataBanner";
import RecordSearch from "@/components/account/RecordSearch";
import ServiceCard from "@/components/ServiceCard";
import { toServicePayload } from "@/lib/ai/contextBuilder";
import { prisma } from "@/lib/db";
import { t, uiLang } from "@/lib/i18n";
import { getAudience, effectiveRole } from "@/lib/audience.server";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";
import { listServices, searchServices, visibleServiceWhere } from "@/lib/search/serviceSearch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "دليل الخدمات | وينها",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const [lang, user, audience] = await Promise.all([getLang(), getCurrentUser(), getAudience()]);
  const role = effectiveRole(audience, user);
  const { q, category } = await searchParams;

  const categories = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { services: { where: visibleServiceWhere(role) } } } },
  });

  const services = q
    ? (await searchServices(q, 20, role)).map((match) => match.service)
    : await listServices(category, role);

  const activeCategory = categories.find((item) => item.id === category);

  return (
    <main>
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">{t(lang, "دليل الخدمات الحكومية", "Government services directory")}</h1>
          <p className="page-subtitle">
            {t(
              lang,
              "كل الإجراءات الموجودة في قاعدة بيانات وينها.",
              "Every procedure currently in the WAYNHA database.",
            )}
          </p>
        </div>
      </div>

      {q && <RecordSearch query={q} />}
      <div className="container section">
        {services.some((service) => service.isDemo) && <DemoDataBanner lang={lang} />}

        <div className="chip-row">
          <Link href="/services" className={`chip${!category && !q ? " active" : ""}`}>
            {t(lang, "الكل", "All")}
          </Link>
          {categories.map((item) => (
            <Link
              key={item.id}
              href={`/services?category=${item.id}`}
              className={`chip${category === item.id ? " active" : ""}`}
            >
              {item.icon} {lang === "ar" ? item.titleAr : item.titleEn} ({item._count.services})
            </Link>
          ))}
        </div>

        {(q || activeCategory) && (
          <p style={{ marginBottom: 20, color: "var(--text-muted)" }}>
            {q
              ? t(lang, `نتائج البحث عن "${q}" (${services.length})`, `Results for "${q}" (${services.length})`)
              : `${activeCategory?.icon} ${lang === "ar" ? activeCategory?.titleAr : activeCategory?.titleEn} (${services.length})`}
          </p>
        )}

        <div className="grid-cards">
          {services.length > 0 ? (
            services.map((service) => (
              <ServiceCard key={service.id} service={toServicePayload(service, uiLang(lang))} lang={lang} />
            ))
          ) : (
            <div className="empty-state">
              <div style={{ fontSize: "2.2rem", marginBottom: 12 }}>🔍</div>
              <p>
                {t(
                  lang,
                  "ما فيش إجراءات مطابقة. جرّب تسأل مساعد وينها.",
                  "No matching procedures. Try asking the WAYNHA assistant.",
                )}
              </p>
              <Link href="/assistant" className="btn-primary" style={{ marginTop: 16 }}>
                💬 {t(lang, "اسأل وينها", "Ask WAYNHA")}
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
