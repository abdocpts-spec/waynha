import LanderControls from "@/components/layout/LanderControls";
import BrandMark from "@/components/layout/BrandMark";
import { chooseAudience } from "@/lib/audience.actions";
import { t, type Lang } from "@/lib/i18n";

function LibyaFlag() {
  return (
    <svg width="72" height="48" viewBox="0 0 72 48" aria-hidden="true" style={{ borderRadius: 6 }}>
      <rect width="72" height="12" fill="#e70013" />
      <rect y="12" width="72" height="24" fill="#000" />
      <rect y="36" width="72" height="12" fill="#239e46" />
      <circle cx="34" cy="24" r="8" fill="#fff" />
      <circle cx="37" cy="24" r="6.5" fill="#000" />
      <path d="M41 24l1.9 1.4-.7-2.2 1.9-1.4h-2.3L41 19.600l-.8 2.200h-2.300l1.900 1.400-.7 2.200z" fill="#fff" />
    </svg>
  );
}

function Globe() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.800 2.600 4 5.600 4 9s-1.200 6.400-4 9c-2.800-2.600-4-5.600-4-9s1.200-6.400 4-9z" />
    </svg>
  );
}

/** صفحة الترحيب: بطاقتان بحجم الشاشة، أول ما يراه الزائر قبل بقية الموقع. */
export default function Lander({ lang, next }: { lang: Lang; next?: string }) {
  const options = [
    {
      value: "CITIZEN",
      icon: <LibyaFlag />,
      title: t(lang, "مواطن ليبي", "Libyan citizen"),
      desc: t(lang, "خدمات الجوازات والسجل المدني والمرور والتعليم…", "Passports, civil registry, traffic, education…"),
      cta: t(lang, "متابعة ←", "Continue →"),
      english: false,
    },
    {
      value: "FOREIGNER",
      icon: <Globe />,
      // بطاقة الأجنبي بالإنجليزية دائماً مهما كانت لغة الواجهة
      title: "Foreign resident",
      desc: "Residency, visas, work permits…",
      cta: "Continue →",
      english: true,
    },
  ];

  return (
    <main className="lander">
      <div className="lander-top">
        <span />
        <div className="lander-brand">
          <BrandMark size={44} />
          <h1>{t(lang, "وينها", "WAYNHA")}</h1>
          <p>{t(lang, "اختر نوعك للمتابعة", "Choose who you are to continue")}</p>
        </div>
        <LanderControls lang={lang} />
      </div>

      <form action={chooseAudience} className="lander-grid">
        {next && <input type="hidden" name="next" value={next} />}
        {options.map((o) => (
          <button
            key={o.value}
            type="submit"
            name="audience"
            value={o.value}
            className={`lander-card lander-card--${o.value.toLowerCase()}`}
            {...(o.english ? { lang: "en", dir: "ltr", translate: "no" as const } : {})}
          >
            <span className="lander-card-icon">{o.icon}</span>
            <strong>{o.title}</strong>
            <small>{o.desc}</small>
            <span className="lander-card-cta">{o.cta}</span>
          </button>
        ))}
      </form>
    </main>
  );
}
