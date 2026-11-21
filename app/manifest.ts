import type { MetadataRoute } from "next";

/** يجعل الموقع قابلاً للتثبيت على الهاتف كتطبيق (PWA): أيقونة على الشاشة الرئيسية وفتح بدون شريط المتصفح. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "وينها | WAYNHA — دليلك للخدمات الحكومية الليبية",
    short_name: "وينها",
    description: "دليل إرشادي مستقل للإجراءات والخدمات الحكومية في ليبيا، مع مساعد ذكي يفهم اللهجة الليبية.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "ar",
    dir: "rtl",
    background_color: "#f0f4ff",
    theme_color: "#1a56db",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
