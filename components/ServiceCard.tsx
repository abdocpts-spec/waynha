import Link from "next/link";
import ReliabilityBadge from "@/components/ReliabilityBadge";
import type { ServicePayload } from "@/lib/ai/contextBuilder";
import { t, type Lang } from "@/lib/i18n";

/** بطاقة خدمة في الشبكات (الرئيسية + الدليل + نتائج البحث) مع مؤشر موثوقية المعلومات. */
export default function ServiceCard({
  service,
  lang,
  showPopularBadge = false,
}: {
  service: ServicePayload;
  lang: Lang;
  showPopularBadge?: boolean;
}) {
  return (
    <div className="card card-wrap">
      <Link href={`/services/${service.id}`} className="card-link" aria-label={service.title}>
        {showPopularBadge && <div className="badge">⭐ {t(lang, "الأكثر بحثاً", "Popular")}</div>}
        <div
          className="card-icon"
          style={{ color: service.category.color, background: `${service.category.color}18` }}
        >
          {service.icon}
        </div>
        <h3 className="card-title">{service.title}</h3>
        <p className="card-desc">{service.shortDesc}</p>
        <div className="card-meta">
          <span>⏱ {service.duration}</span>
          <span>💰 {service.fees}</span>
          {service.isDemo && <span style={{ color: "var(--warning)" }}>⚠️ {t(lang, "تجريبي", "Demo")}</span>}
        </div>
      </Link>
      <div className="card-rel">
        <ReliabilityBadge reliability={service.reliability} lang={lang} serviceId={service.id} />
      </div>
    </div>
  );
}
