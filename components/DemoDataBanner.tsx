import { t, type Lang } from "@/lib/i18n";

/** تنبيه واضح أن البيانات المعروضة تجريبية وليست مراجَعة مع الجهات. */
export default function DemoDataBanner({ lang }: { lang: Lang }) {
  return (
    <div className="demo-banner">
      <span aria-hidden="true">⚠️</span>
      <span>
        {t(
          lang,
          "البيانات المعروضة حالياً بيانات تجريبية للعرض، ولم تُراجَع مع الجهات الرسمية. تأكد من الجهة قبل ما تمشي.",
          "The data shown is demo data for preview only and has not been verified with official authorities.",
        )}
      </span>
    </div>
  );
}
