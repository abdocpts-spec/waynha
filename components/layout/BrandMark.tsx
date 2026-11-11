/**
 * رمز شعار وينها (من السؤال إلى المكان).
 * نسختان: للمظهر الفاتح والداكن، ويُظهر الـ CSS المناسبة حسب <html data-theme>
 * حتى لا يومض الشعار عند التحميل. الملفات الأصلية في brand/svg.
 */
export default function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <span className="logo-mark" style={{ width: size, height: size }} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG ثابت صغير، لا يحتاج تحسين الصور */}
      <img className="logo-mark-light" src="/brand/waynha-icon-color.svg" alt="" width={size} height={size} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="logo-mark-dark" src="/brand/waynha-icon-dark.svg" alt="" width={size} height={size} />
    </span>
  );
}
