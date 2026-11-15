import Link from "next/link";
import DemoDataBanner from "@/components/DemoDataBanner";
import HeroParticles from "@/components/HeroParticles";
import HomeSearch from "@/components/HomeSearch";
import Lander from "@/components/Lander";
import ServiceCard from "@/components/ServiceCard";
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
  const verifiedCount = services.filter((service) => service.verified).length;
  const hasDemoData = services.some((service) => service.isDemo);

  const steps = [
    {
      ar: ["اسأل بلغتك", "اكتب مشكلتك باللهجة الليبية، والمساعد يفهمك."],
      en: ["Ask in your words", "Describe your need in plain Libyan Arabic."],
    },
    {
      ar: ["نلقّالك الإجراء", "نبحث في قاعدة بيانات وينها عن الخدمة المناسبة."],
      en: ["We find the procedure", "We search the WAYNHA database for the right service."],
    },
    {
      ar: ["اعرف المطلوب", "الخطوات والمستندات والرسوم قدامك."],
      en: ["Know what you need", "Steps, documents and fees, all in one place."],
    },
    {
      ar: ["امشي بثقة", "نحددلك أقرب جهة حكومية وأوقات دوامها."],
      en: ["Go with confidence", "We show the nearest office and its working hours."],
    },
  ];

  return (
    <main>
      <section className="hero">
        <HeroParticles />
        <div className="container">
          {/* مكان رمز الشعار الذي تشكّله النقاط في HeroParticles */}
          <div className="hero-mark-slot" aria-hidden="true" />
          <h1>
            {t(lang, "مش عارف وين تمشي؟", "Don't know where to go?")}
            <br />
            <span>{t(lang, "وينها تدلّك.", "WAYNHA shows you.")}</span>
          </h1>
          <p className="subtitle">
            {t(
              lang,
              "اسأل مساعد وينها بلهجتك، ويجاوبك من قاعدة بيانات الإجراءات الحكومية.",
              "Ask the WAYNHA assistant in your own words — answers come from the procedures database.",
            )}
          </p>

          <HomeSearch lang={lang} />

          <div className="stats-bar" style={{ marginTop: 48 }}>
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
              <span className="stat-txt">{t(lang, "إجراء موثق", "verified")}</span>
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

      <section className="section how-it-works-section">
        <div className="container">
          <h2 className="section-title" style={{ textAlign: "center", marginBottom: 48 }}>
            {t(lang, "كيف تستخدم وينها؟", "How WAYNHA works")}
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
            {steps.map((step, index) => (
              <div className="how-step" key={step.en[0]}>
                <div className="how-step-num">{index + 1}</div>
                <h3 style={{ marginBottom: 10, fontWeight: 700 }}>{lang === "ar" ? step.ar[0] : step.en[0]}</h3>
                <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: 200, margin: "0 auto" }}>
                  {lang === "ar" ? step.ar[1] : step.en[1]}
                </p>
              </div>
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

      <section className="section">
        <div className="container">
          <div className="ai-promo-wrap">
            <div className="ai-icon-large">🤖</div>
            <h2 style={{ fontSize: "2.1rem", marginBottom: 16, fontWeight: 800, position: "relative" }}>
              {t(lang, "اسأل مساعد وينها", "Ask the WAYNHA assistant")}
            </h2>
            <p
              style={{
                fontSize: "1.05rem",
                opacity: 0.92,
                maxWidth: 540,
                margin: "0 auto 32px",
                lineHeight: 1.7,
                position: "relative",
              }}
            >
              {t(
                lang,
                "مساعد ذكي يفهم اللهجة الليبية، ويجاوبك من معلومات الإجراءات الموجودة في وينها فقط.",
                "An AI assistant that understands Libyan Arabic and answers strictly from WAYNHA's procedure data.",
              )}
            </p>
            <Link
              href="/assistant"
              className="btn-primary"
              style={{
                background: "rgba(255,255,255,0.2)",
                border: "2px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(10px)",
                fontSize: "1.05rem",
                padding: "14px 36px",
                position: "relative",
              }}
            >
              💬 {t(lang, "تحدث مع وينها الآن", "Chat with WAYNHA now")}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
