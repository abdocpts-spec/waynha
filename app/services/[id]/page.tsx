import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SaveServiceButton from "@/components/account/SaveServiceButton";
import ProcedureTracker, { StartProcedureButton } from "@/components/ProcedureTracker";
import PrepareChecklist from "@/components/PrepareChecklist";
import ReportForm from "@/components/ReportForm";
import { toOfficePayload, toServicePayload } from "@/lib/ai/contextBuilder";
import { directionsUrl, isOfficeOpen, osmEmbedUrl } from "@/lib/format";
import { t, uiLang } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { getService, officesForService } from "@/lib/search/serviceSearch";
import { ReliabilitySection } from "@/components/ReliabilityBadge";
import { RELIABILITY_META } from "@/lib/reliability";

export const dynamic = "force-dynamic";

/** عنوان تبويب المتصفح باسم الخدمة (بدل عنوان الموقع العام). */
export async function generateMetadata(props: PageProps<"/services/[id]">): Promise<Metadata> {
  const { id } = await props.params;
  const [lang, record] = await Promise.all([getLang(), getService(id)]);
  if (!record) return {};
  const title = lang === "ar" ? record.titleAr : record.titleEn;
  return { title: `${title} | ${lang === "ar" ? "وينها" : "WAYNHA"}` };
}

export default async function ServicePage(props: PageProps<"/services/[id]">) {
  const { id } = await props.params;
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);

  const record = await getService(id);
  if (!record) notFound();

  const progress = user
    ? await prisma.procedureProgress.findUnique({ where: { userId_serviceId: { userId: user.id, serviceId: record.id } },
        include: { files: { orderBy: { id: "asc" }, select: { id: true, name: true, size: true } } },
      })
    : null;

  const service = toServicePayload(record, uiLang(lang));
  const offices = (await officesForService(record)).map((office) => toOfficePayload(office, uiLang(lang)));
  const nearest = offices[0];

  return (
    <main>
      <div className="service-header">
        <div className="container">
          <a href="#reliability" className="verified-badge">
            {RELIABILITY_META[service.reliability.status].icon}{" "}
            {t(lang, RELIABILITY_META[service.reliability.status].ar, RELIABILITY_META[service.reliability.status].en)}
          </a>
          {service.isDemo && (
            <div className="verified-badge" style={{ marginInlineStart: 8 }}>
              ⚠️ {t(lang, "بيانات تجريبية — تأكد من الجهة الرسمية", "Demo data — confirm with the authority")}
            </div>
          )}
          {record.status === "NEEDS_UPDATE" && (
            <div className="verified-badge" style={{ marginInlineStart: 8, background: "rgba(245,158,11,0.25)" }}>
              ⏳ {t(lang, "قد تكون بعض المعلومات قديمة — فريق وينها يراجعها الآن", "Some details may be outdated — the WAYNHA team is reviewing them")}
            </div>
          )}
          <h1 className="service-title">
            {service.icon} {service.title}
          </h1>
          <div className="service-dept">🏢 {service.department}</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link
              href={`/assistant?q=${encodeURIComponent(service.title)}`}
              className="btn-primary"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
            >
              💬 {t(lang, "اسأل وينها عن هذا الإجراء", "Ask WAYNHA about this")}
            </Link>
            <a
              href="#prepare"
              className="btn-primary"
              style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
            >
              🎒 {t(lang, "جهزني", "Get me ready")}
            </a>
            <SaveServiceButton id={record.id} lang={lang} />
            {!user ? (
              <Link
                href={`/login?next=${encodeURIComponent(`/services/${record.id}`)}`}
                className="btn-primary"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
              >
                🚀 {t(lang, "سجّل دخولك لمتابعة هذا الإجراء", "Sign in to track this procedure")}
              </Link>
            ) : progress ? (
              <a
                href="#tracker"
                className="btn-primary"
                style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.35)" }}
              >
                📍 {t(lang, "قيد المتابعة", "Tracking")}
              </a>
            ) : (
              <StartProcedureButton serviceId={record.id} lang={lang} />
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 60 }}>
        <div className="layout-grid">
          <div>
            {progress && (
              <ProcedureTracker
                lang={lang}
                serviceId={record.id}
                data={{
                  stage: progress.stage,
                  stageDates:
                    progress.stageDates && typeof progress.stageDates === "object" && !Array.isArray(progress.stageDates)
                      ? (progress.stageDates as Record<string, string>)
                      : {},
                  reminder: progress.reminderAt ? progress.reminderAt.toISOString().slice(0, 10) : "",
                  note: progress.note ?? "",
                  review: progress.reviewStatus,
                  reviewNote: progress.reviewNote ?? "",
                  files: progress.files,
                  requiredDocs: service.documents,
                }}
              />
            )}

            <PrepareChecklist
              serviceId={record.id}
              lang={lang}
              title={service.title}
              documents={service.documents}
              steps={service.steps}
              fees={service.fees}
              hours={service.hours}
              officeName={nearest?.name}
            />

            <ReliabilitySection reliability={service.reliability} lang={lang} />

            <div className="content-card">
              <h2 className="content-title">📋 {t(lang, "الخطوات", "Steps")}</h2>
              {service.steps.map((step, index) => (
                <div className="step-item" key={step}>
                  <div className="step-number">{index + 1}</div>
                  <div className="step-content">{step}</div>
                </div>
              ))}
            </div>

            <div className="content-card">
              <h2 className="content-title">📎 {t(lang, "المستندات المطلوبة", "Required documents")}</h2>
              <ul className="doc-list">
                {service.documents.map((document) => (
                  <li key={document}>
                    <span className="doc-check">✓</span>
                    <span>{document}</span>
                  </li>
                ))}
              </ul>
            </div>

            {service.notes.length > 0 && (
              <div
                className="content-card"
                style={{ background: "rgba(245, 158, 11, 0.05)", borderColor: "rgba(245, 158, 11, 0.25)" }}
              >
                <h2 className="content-title" style={{ color: "var(--warning)" }}>
                  ⚠️ {t(lang, "ملاحظات هامة", "Important notes")}
                </h2>
                <ul className="doc-list">
                  {service.notes.map((note) => (
                    <li key={note}>{note}</li>
                  ))}
                </ul>
              </div>
            )}

            {service.faqs.length > 0 && (
              <div className="content-card">
                <h2 className="content-title">❓ {t(lang, "أسئلة شائعة", "FAQ")}</h2>
                {service.faqs.map((faq) => (
                  <div className="faq-item" key={faq.question}>
                    <div className="faq-q">{faq.question}</div>
                    <div className="faq-a">{faq.answer}</div>
                  </div>
                ))}
              </div>
            )}

            <ReportForm serviceId={record.id} lang={lang} />
          </div>

          <div>
            <div className="content-card">
              <h2 className="content-title">ℹ️ {t(lang, "معلومات الخدمة", "Service info")}</h2>
              <div className="info-item">
                <span className="info-label">{t(lang, "الرسوم", "Fees")}</span>
                <span className="info-value" style={{ color: "var(--primary)" }}>{service.fees}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t(lang, "المدة المتوقعة", "Duration")}</span>
                <span className="info-value">{service.duration}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t(lang, "ساعات العمل", "Working hours")}</span>
                <span className="info-value">{service.hours}</span>
              </div>
              <div className="info-item">
                <span className="info-label">{t(lang, "المستفيدون", "Eligibility")}</span>
                <span className="info-value">{service.eligibility}</span>
              </div>
            </div>

            <div className="content-card">
              <h2 className="content-title">📍 {t(lang, "وين تمشي؟", "Where to go?")}</h2>
              {nearest ? (
                <>
                  <div className="map-frame">
                    <iframe title={nearest.name} src={osmEmbedUrl(nearest)} loading="lazy" />
                  </div>
                  <div className="office-name">{nearest.name}</div>
                  <p className="office-row">
                    {nearest.address} — {nearest.city}
                  </p>
                  <p className="office-row">🕒 {nearest.hours}</p>
                  <p className="office-row" dir="ltr">☎ {nearest.phone}</p>
                  <p style={{ marginTop: 6 }}>
                    <span className={`status-pill ${isOfficeOpen(nearest) ? "status-open" : "status-closed"}`}>
                      {isOfficeOpen(nearest) ? t(lang, "مفتوح الآن", "Open now") : t(lang, "مغلق الآن", "Closed now")}
                    </span>
                  </p>
                  <div className="office-actions" style={{ marginTop: 14 }}>
                    <Link className="btn-primary" style={{ fontSize: "0.85rem" }} href={`/offices?service=${service.id}`}>
                      📍 {t(lang, `وين نمشي؟ — الخريطة (${offices.length})`, `Where to go? — map (${offices.length})`)}
                    </Link>
                    <a className="btn-outline" href={directionsUrl(nearest)} target="_blank" rel="noopener noreferrer">
                      {t(lang, "فتح Google Maps", "Open Google Maps")}
                    </a>
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  {t(
                    lang,
                    "ما فيش جهة مسجلة لهذا القسم في قاعدة بيانات وينها لسه.",
                    "No office for this category is registered in the WAYNHA database yet.",
                  )}
                </p>
              )}
            </div>

            {service.related.length > 0 && (
              <div className="content-card">
                <h2 className="content-title">🔗 {t(lang, "إجراءات مرتبطة", "Related procedures")}</h2>
                <ul className="doc-list">
                  {service.related.map((related) => (
                    <li key={related.id}>
                      <Link href={`/services/${related.id}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
                        {related.icon} {related.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
