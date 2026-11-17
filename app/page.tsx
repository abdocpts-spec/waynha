import Link from "next/link";
import DemoDataBanner from "@/components/DemoDataBanner";
import Lander from "@/components/Lander";
import ServiceCard from "@/components/ServiceCard";
import { computeReliability } from "@/lib/reliability";
import { toServicePayload } from "@/lib/ai/contextBuilder";
import { prisma } from "@/lib/db";
import { t, uiLang } from "@/lib/i18n";
import { getAudience, effectiveRole } from "@/lib/audience.server";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";
import { listServices, serviceInclude, visibleServiceWhere } from "@/lib/search/serviceSearch";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [lang, user, audience] = await Promise.all([getLang(), getCurrentUser(), getAudience()]);
  // أول ما يراه الزائر في كل زيارة: اختيار مواطن ليبي أو أجنبي
  if (!audience) return <Lander lang={lang} />;
  const role = effectiveRole(audience, user);

  const [services, categories, officeCount] = await Promise.all([
    listServices(undefined, role),
    prisma.category.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { services: { where: visibleServiceWhere(role) } } } },
    }),
    prisma.office.count(),
  ]);
  void serviceInclude;

  const popular = services.filter((service) => service.popular).slice(0, 3);
  const verifiedCount = services.filter((service) => computeReliability(service).status === "REVIEWED").length;
  const hasDemoData = services.some((service) => service.isDemo);

  return (
    <main>
      <section className="hero">
        <div className="container">
          <h1>
            {t(lang, "مش عارف وين تمشي؟", "Don't know where to go?")}
            <br />
            <span>{t(lang, "وينها تدلّك.", "WAYNHA shows you.")}</span>
          </h1>
          <p className="subtitle">
            {t(
              lang,
              "دليل الإجراءات والخدمات الحكومية في ليبيا: الخطوات والمستندات والرسوم وأقرب جهة، كلها في مكان واحد.",
              "A guide to government procedures and services in Libya: steps, documents, fees and the nearest office, all in one place.",
            )}
          </p>

          <div className="stats-bar" style={{ marginTop: 40 }}>
            <div className="stat-item">
              <span className="stat-num">{services.length}</span>
              <span className="stat-txt">{t(lang, "إجراء في القاعدة", "procedures")}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{officeCount}</span>
              <span className="stat-txt">{t(lang, "جهة حكومية", "offices")}</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">{verifiedCount}</span>
              <span className="stat-txt">{t(lang, "إجراء تمت مراجعته", "reviewed")}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {hasDemoData && <DemoDataBanner lang={lang} />}

          <div className="section-header">
            <h2 className="section-title">⭐ {t(lang, "الخدمات الأكثر طلباً", "Most requested services")}</h2>
            <Link href="/services" className="section-link">
              {t(lang, "عرض الكل ←", "View all →")}
            </Link>
          </div>
          <div className="grid-cards">
            {popular.map((service) => (
              <ServiceCard
                key={service.id}
                service={toServicePayload(service, uiLang(lang))}
                lang={lang}
                showPopularBadge
              />
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">🏛 {t(lang, "أقسام الخدمات", "Service categories")}</h2>
            <Link href="/services" className="section-link">
              {t(lang, "الدليل الكامل ←", "Full directory →")}
            </Link>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 }}>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/services?category=${category.id}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-lg)",
                  padding: "20px 16px",
                  textAlign: "center",
                  boxShadow: "var(--shadow-sm)",
                  opacity: category._count.services ? 1 : 0.6,
                }}
              >
                <div style={{ fontSize: "2rem", marginBottom: 10 }}>{category.icon}</div>
                <div style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)" }}>
                  {lang === "ar" ? category.titleAr : category.titleEn}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                  {category._count.services
                    ? t(lang, `${category._count.services} إجراء`, `${category._count.services} procedures`)
                    : t(lang, "قريباً", "Coming soon")}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

    </main>
  );
}
