import OfficesExplorer from "@/components/maps/OfficesExplorer";
import { effectiveRole, getAudience } from "@/lib/audience.server";
import { getCurrentUser } from "@/lib/auth/session";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";
import { loadMapData } from "@/lib/maps/data";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "وين نمشي؟ | وينها",
};

export default async function OfficesPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string; office?: string }>;
}) {
  const [lang, user, audience, params] = await Promise.all([getLang(), getCurrentUser(), getAudience(), searchParams]);
  const data = await loadMapData(effectiveRole(audience, user));

  const serviceId = data.services.some((s) => s.id === params.service) ? params.service : undefined;
  const officeNum = Number(params.office);
  const officeId = data.offices.some((o) => o.id === officeNum) ? officeNum : undefined;
  // مفتاح Google Maps يصل للمتصفح بطبيعته؛ يجب تقييده بنطاق الموقع من لوحة Google Cloud
  const googleKey = process.env.GOOGLE_MAPS_API_KEY || undefined;

  return (
    <main>
      <div className="page-header">
        <div className="container">
          <h1 className="page-title">📍 {t(lang, "وين نمشي؟", "Where to go?")}</h1>
          <p className="page-subtitle">
            {t(
              lang,
              "الجهات المسجلة في قاعدة بيانات وينها، مرتبة حسب الخدمة والمدينة والقرب منك.",
              "Offices registered in the WAYNHA database, by service, city and distance from you.",
            )}
          </p>
        </div>
      </div>
      <div className="container section">
        <OfficesExplorer
          data={data}
          lang={lang}
          googleKey={googleKey}
          initialServiceId={serviceId}
          initialOfficeId={officeId}
        />
      </div>
    </main>
  );
}
