/**
 * سكربت مضمَّن يعمل أثناء قراءة الصفحة قبل أول رسم (مثل ضبط المظهر).
 * حسب دليل Next.js «Preventing flash before hydration»: نجعله text/javascript على
 * الخادم و text/plain في المتصفح، حتى لا يحذّر React من وسم <script> أثناء الرسم
 * في المتصفح (السكربت نفذ أصلاً أثناء تحميل الصفحة).
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
