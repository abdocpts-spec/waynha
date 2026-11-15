import Link from "next/link";
import DemoDataBanner from "@/components/DemoDataBanner";
import { toOfficePayload } from "@/lib/ai/contextBuilder";
import { directionsUrl, isOfficeOpen, osmEmbedUrl } from "@/lib/format";
import { t, uiLang } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";
import { getService, listOffices, officesForService } from "@/lib/search/serviceSearch";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الجهات الحكومية | وينها",
};

export default async function OfficesPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; office?: string }>;
}) {
  const lang = await getLang();
  const { service: serviceId, office: officeId } = await searchParams;

  const service = serviceId ? await getService(serviceId) : null;
  const records = service ? await officesForService(service) : await listOffices();
  const offices = records.map((office) => toOfficePayload(office, uiLang(lang)));

  const selected =
    offices.find((office) => String(office.id) === officeId) ?? offices[0] ?? null;

  return (
    <main>
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">📍 {t(lang, "الجهات الحكومية", "Government offices")}</h1>
          <p className="page-subtitle">
            {service
              ? t(
                  lang,
                  `الجهات المرتبطة بخدمة: ${lang === "ar" ? service.titleAr : service.titleEn}`,
                  `Offices related to: ${lang === "ar" ? service.titleAr : service.titleEn}`,
                )
              : t(
                  lang,
                  "كل الجهات المسجلة في قاعدة بيانات وينها.",
                  "All offices registered in the WAYNHA database.",
                )}
          </p>
        </div>
      </div>

      <div className="container section">
        {offices.some((office) => office.isDemo) && <DemoDataBanner lang={lang} />}

        {selected && (
          <div className="map-frame" style={{ height: 340, marginBottom: 28 }}>
            <iframe title={selected.name} src={osmEmbedUrl(selected)} loading="lazy" />
          </div>
        )}

        <div className="grid-cards">
          {offices.map((office) => (
            <div className="office-card" key={office.id} id={`office-${office.id}`}>
              <div className="office-head">
                <div>
                  <div className="office-name">{office.name}</div>
                  <div className="office-dept">{office.department}</div>
                </div>
                <span className={`status-pill ${isOfficeOpen(office) ? "status-open" : "status-closed"}`}>
                  {isOfficeOpen(office) ? t(lang, "مفتوح الآن", "Open now") : t(lang, "مغلق الآن", "Closed now")}
                </span>
              </div>
              <div className="office-row">
                <span aria-hidden="true">📍</span>
                <span>
                  {office.address} — {office.city}
                </span>
              </div>
              <div className="office-row">
                <span aria-hidden="true">🕒</span>
                <span>{office.hours}</span>
              </div>
              <div className="office-row">
                <span aria-hidden="true">☎</span>
                <a href={`tel:${office.phone}`} dir="ltr">{office.phone}</a>
              </div>
              <div className="office-actions">
                <Link className="btn-outline" href={`/offices?office=${office.id}`}>
                  {t(lang, "عرض على الخريطة", "Show on map")}
                </Link>
                <a
                  className="btn-primary"
                  style={{ fontSize: "0.85rem", padding: "8px 18px" }}
                  href={directionsUrl(office)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(lang, "فتح Google Maps", "Open Google Maps")}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
