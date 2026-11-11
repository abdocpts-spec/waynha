import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SaveServiceButton from "@/components/account/SaveServiceButton";
import { toOfficePayload, toServicePayload } from "@/lib/ai/contextBuilder";
import { directionsUrl, formatDate, isOfficeOpen, osmEmbedUrl } from "@/lib/format";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";
import { getService, officesForService } from "@/lib/search/serviceSearch";

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
  const lang = await getLang();

  const record = await getService(id);
  if (!record) notFound();

  const service = toServicePayload(record, lang);
  const offices = (await officesForService(record)).map((office) => toOfficePayload(office, lang));
  const nearest = offices[0];

  return (
    <main>
      <div className="service-header">
        <div className="container">
          <div className="verified-badge">
            {service.isDemo
              ? `⚠️ ${t(lang, "بيانات تجريبية — تأكد من الجهة الرسمية", "Demo data — confirm with the authority")}`
              : service.verified
                ? `✅ ${t(lang, "معلومة موثقة", "Verified information")}`
                : `⏳ ${t(lang, "قيد المراجعة", "Under review")}`}
          </div>
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
            <SaveServiceButton id={record.id} lang={lang} />
          </div>
          <div style={{ fontSize: "0.88rem", opacity: 0.85, marginTop: 16 }}>
            {t(lang, "آخر مراجعة:", "Last reviewed:")} {formatDate(service.lastReviewedAt, lang)} ·{" "}
            {t(lang, "المصدر:", "Source:")} {service.source}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 60 }}>
        <div className="layout-grid">
          <div>
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
                    <a className="btn-primary" style={{ fontSize: "0.85rem" }} href={directionsUrl(nearest)} target="_blank" rel="noopener noreferrer">
                      {t(lang, "فتح Google Maps", "Open Google Maps")}
                    </a>
                    <Link className="btn-outline" href={`/offices?service=${service.id}`}>
                      {t(lang, `كل الجهات (${offices.length})`, `All offices (${offices.length})`)}
                    </Link>
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
