import Link from "next/link";
import { formatDate } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import {
  LIMITS_NOTE,
  OUTDATED_NOTE,
  RELIABILITY_META,
  type ReliabilityPayload,
} from "@/lib/reliability";

/** يعرض اسم الحالة مع أيقونة ونص، فلا يعتمد المستخدم على اللون وحده. */
function label(r: ReliabilityPayload, lang: Lang, short = true) {
  const m = RELIABILITY_META[r.status];
  return `${m.icon} ${short ? t(lang, m.shortAr, m.shortEn) : t(lang, m.ar, m.en)}`;
}

function SourceList({ r, lang }: { r: ReliabilityPayload; lang: Lang }) {
  if (r.sources.length === 0) return <span>{t(lang, "لا يوجد مصدر مسجّل.", "No source is recorded.")}</span>;
  return (
    <ul className="rel-sources">
      {r.sources.map((s, i) => (
        <li key={i}>
          <strong>{s.name}</strong> <span className="rel-sub">({s.type})</span>
          {s.accessedAt && (
            <span className="rel-sub">
              {" "}
              · {t(lang, "اطُّلع عليه", "accessed")} {formatDate(s.accessedAt, lang)}
            </span>
          )}
          {s.url && (
            <>
              {" "}
              <a href={s.url} target="_blank" rel="noopener noreferrer nofollow">
                {t(lang, "فتح المصدر ↗", "Open source ↗")}
              </a>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * مؤشر مختصر قابل للضغط: يبيّن الحالة، وعند فتحه المصدر وتاريخ المراجعة.
 * يعمل بدون JavaScript (عنصر details).
 */
export default function ReliabilityBadge({
  reliability: r,
  lang,
  serviceId,
}: {
  reliability: ReliabilityPayload;
  lang: Lang;
  serviceId?: string;
}) {
  const m = RELIABILITY_META[r.status];
  return (
    <details className={`rel rel-${m.tone}`}>
      <summary className="rel-pill" aria-label={t(lang, "حالة موثوقية المعلومات: ", "Information reliability: ") + t(lang, m.ar, m.en)}>
        {label(r, lang)}
      </summary>
      <div className="rel-pop">
        <p className="rel-title">{label(r, lang, false)}</p>
        <p>{t(lang, m.descAr, m.descEn)}</p>
        <p>
          <strong>{t(lang, "المصدر:", "Source:")}</strong>
        </p>
        <SourceList r={r} lang={lang} />
        <p>
          <strong>{t(lang, "آخر مراجعة:", "Last reviewed:")}</strong>{" "}
          {r.lastReviewedAt ? formatDate(r.lastReviewedAt, lang) : t(lang, "لم تُسجَّل مراجعة بعد", "No review recorded yet")}
        </p>
        {r.status === "OUTDATED" && <p className="rel-warn">{t(lang, OUTDATED_NOTE.ar, OUTDATED_NOTE.en)}</p>}
        <p className="rel-sub">{t(lang, LIMITS_NOTE.ar, LIMITS_NOTE.en)}</p>
        {serviceId && (
          <Link href={`/services/${serviceId}#reliability`} className="rel-more">
            {t(lang, "تفاصيل الموثوقية", "Reliability details")}
          </Link>
        )}
      </div>
    </details>
  );
}

/** قسم «موثوقية المعلومات» في صفحة تفاصيل الخدمة. */
export function ReliabilitySection({ reliability: r, lang }: { reliability: ReliabilityPayload; lang: Lang }) {
  const m = RELIABILITY_META[r.status];
  return (
    <section className="content-card" id="reliability" aria-labelledby="reliability-title">
      <h2 className="content-title" id="reliability-title">
        🛡️ {t(lang, "موثوقية المعلومات", "Information reliability")}
      </h2>
      <div className={`rel-status rel-${m.tone}`}>
        <span className="rel-pill" style={{ cursor: "default" }}>
          {label(r, lang, false)}
        </span>
        <p style={{ margin: "8px 0 0" }}>{t(lang, m.descAr, m.descEn)}</p>
      </div>
      <dl className="rel-grid">
        <div>
          <dt>{t(lang, "حالة المعلومات", "Status")}</dt>
          <dd>{t(lang, m.ar, m.en)}</dd>
        </div>
        <div>
          <dt>{t(lang, "آخر مراجعة", "Last reviewed")}</dt>
          <dd>{r.lastReviewedAt ? formatDate(r.lastReviewedAt, lang) : t(lang, "لا توجد مراجعة مسجّلة", "No review recorded")}</dd>
        </div>
        {r.nextReviewAt && (
          <div>
            <dt>{t(lang, "المراجعة القادمة", "Next review")}</dt>
            <dd>{formatDate(r.nextReviewAt, lang)}</dd>
          </div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <dt>{t(lang, "مصدر المعلومات", "Source of information")}</dt>
          <dd>
            <SourceList r={r} lang={lang} />
          </dd>
        </div>
      </dl>
      {(r.status === "OUTDATED" || r.status === "NEEDS_REVIEW") && (
        <p className="rel-warn">{t(lang, OUTDATED_NOTE.ar, OUTDATED_NOTE.en)}</p>
      )}
      <p className="rel-note">ℹ️ {t(lang, LIMITS_NOTE.ar, LIMITS_NOTE.en)}</p>
    </section>
  );
}
