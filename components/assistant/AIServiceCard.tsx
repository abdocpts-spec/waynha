"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { OfficePayload, ServicePayload } from "@/lib/ai/contextBuilder";
import ReliabilityBadge from "@/components/ReliabilityBadge";
import { OUTDATED_NOTE, RELIABILITY_META } from "@/lib/reliability";
import { directionsUrl, distanceKm, formatDistance, isOfficeOpen } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";

/**
 * بطاقة الخدمة داخل المحادثة.
 * كل ما فيها يأتي من PostgreSQL مباشرة — لا من نص الذكاء الاصطناعي.
 */
export default function AIServiceCard({
  service,
  offices: allOffices,
  lang,
}: {
  service: ServicePayload;
  offices: OfficePayload[];
  lang: Lang;
}) {
  // الترتيب بالقرب يتم في المتصفح فقط بعد موافقة المستخدم؛ الموقع لا يُرسل ولا يُحفظ
  const [here, setHere] = useState<{ lat: number; lng: number } | null>(null);
  const [locMsg, setLocMsg] = useState("");
  const offices = useMemo(
    () => (here ? [...allOffices].sort((a, b) => distanceKm(here, a) - distanceKm(here, b)) : allOffices),
    [allOffices, here],
  );
  function locate() {
    if (!("geolocation" in navigator)) return setLocMsg(t(lang, "تعذّر تحديد الموقع.", "Location is unavailable."));
    navigator.geolocation.getCurrentPosition(
      (pos) => { setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocMsg(""); },
      () => setLocMsg(t(lang, "لم تسمح بالموقع — افتح الخريطة واختر مدينتك.", "Location not allowed — open the map and choose your city.")),
      { timeout: 12000, maximumAge: 60000 },
    );
  }
  const steps = service.steps.slice(0, 4);
  const documents = service.documents.slice(0, 4);

  return (
    <div className="ai-service-card">
      <div className="ai-service-top">
        <div className="ai-service-icon" style={{ background: `${service.category.color}1a` }}>
          {service.icon}
        </div>
        <div>
          <div className="ai-service-title">{service.title}</div>
          <div className="ai-service-dept">🏢 {service.department}</div>
        </div>
      </div>

      <div className="ai-service-meta">
        <span>💰 {service.fees}</span>
        <span>⏱ {service.duration}</span>
        <span>🕒 {service.hours}</span>
      </div>
      <div className="card-rel" style={{ padding: "0 16px 8px" }}>
        <ReliabilityBadge reliability={service.reliability} lang={lang} serviceId={service.id} />
      </div>

      {documents.length > 0 && (
        <div className="ai-service-section">
          <h4>📄 {t(lang, "شن تحتاج؟", "What you need")}</h4>
          <ul>
            {documents.map((document) => (
              <li key={document}>
                <span style={{ color: "var(--success)" }}>✓</span>
                <span>{document}</span>
              </li>
            ))}
            {service.documents.length > documents.length && (
              <li style={{ color: "var(--text-light)" }}>
                {t(
                  lang,
                  `+ ${service.documents.length - documents.length} مستندات أخرى`,
                  `+ ${service.documents.length - documents.length} more documents`,
                )}
              </li>
            )}
          </ul>
        </div>
      )}

      {steps.length > 0 && (
        <div className="ai-service-section">
          <h4>🪜 {t(lang, "شن الخطوات؟", "Steps")}</h4>
          <ul>
            {steps.map((step, index) => (
              <li key={step}>
                <strong style={{ color: "var(--primary)" }}>{index + 1}.</strong>
                <span>{step}</span>
              </li>
            ))}
            {service.steps.length > steps.length && (
              <li style={{ color: "var(--text-light)" }}>
                {t(
                  lang,
                  `+ ${service.steps.length - steps.length} خطوات أخرى`,
                  `+ ${service.steps.length - steps.length} more steps`,
                )}
              </li>
            )}
          </ul>
        </div>
      )}

      {offices.length > 0 && (
        <div className="ai-service-section">
          <h4>📍 {t(lang, "وين تمشي؟", "Where to go")}</h4>
          <ul>
            {offices.slice(0, 2).map((office) => (
              <li key={office.id} style={{ flexDirection: "column", gap: 2 }}>
                <span style={{ color: "var(--text-main)", fontWeight: 600 }}>
                  {office.name}{" "}
                  <span className={isOfficeOpen(office) ? "status-open" : "status-closed"} style={{ fontSize: "0.72rem", padding: "2px 8px", borderRadius: 999 }}>
                    {isOfficeOpen(office)
                      ? t(lang, "مفتوح الآن", "Open now")
                      : t(lang, "مغلق الآن", "Closed now")}
                  </span>
                </span>
                <span>{office.address || t(lang, "غير متوفر", "Not available")} — {office.city}</span>
                {here && (
                  <span>
                    🧭 {formatDistance(distanceKm(here, office), lang)}{" "}
                    <small>{t(lang, "بخط مستقيم (تقريبي)", "straight-line (approx.)")}</small>
                  </span>
                )}
                <span dir="ltr">☎ {office.phone || t(lang, "غير متوفر", "Not available")}</span>
                <span>🕒 {office.hours}</span>
                <span style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  <Link href={`/offices?office=${office.id}`} style={{ color: "var(--primary)", fontWeight: 600 }}>
                    {t(lang, "عرض على الخريطة", "Show on map")}
                  </Link>
                  <a
                    href={directionsUrl(office)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: "var(--primary)", fontWeight: 600 }}
                  >
                    {t(lang, "فتح Google Maps", "Open Google Maps")}
                  </a>
                </span>
              </li>
            ))}
          </ul>
          <button type="button" className="btn-outline" style={{ marginTop: 8 }} onClick={locate}>
            📍 {t(lang, "الأقرب إليّ", "Nearest to me")}
          </button>
          {locMsg && <p className="ai-note">{locMsg}</p>}
        </div>
      )}

      {service.isDemo && (
        <p className="ai-note">
          ⚠️{" "}
          {t(
            lang,
            "بيانات تجريبية للعرض — تأكد من الجهة الرسمية قبل ما تمشي.",
            "Demo data — confirm with the official authority before you go.",
          )}
        </p>
      )}
      {service.reliability.status !== "REVIEWED" && (
        <p className="ai-note">
          ⚠️{" "}
          {service.reliability.status === "OUTDATED"
            ? t(lang, OUTDATED_NOTE.ar, OUTDATED_NOTE.en)
            : t(lang, RELIABILITY_META[service.reliability.status].descAr, RELIABILITY_META[service.reliability.status].descEn)}
        </p>
      )}

      <div className="ai-service-actions">
        <Link href={`/services/${service.id}`} className="btn-primary" style={{ fontSize: "0.85rem", padding: "8px 18px" }}>
          {t(lang, "عرض تفاصيل الخدمة", "View service details")}
        </Link>
        {offices.length > 0 && (
          <Link href={`/offices?service=${service.id}`} className="btn-outline">
            🗺️ {t(lang, "وين نمشي؟ (الخريطة)", "Where to go? (map)")}
          </Link>
        )}
      </div>
    </div>
  );
}
