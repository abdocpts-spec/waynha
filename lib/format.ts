import type { OfficePayload } from "@/lib/ai/contextBuilder";
import type { Lang } from "@/lib/i18n";

/**
 * حالة "مفتوح الآن" تُحسب من أوقات الدوام بتوقيت ليبيا،
 * مهما كان توقيت جهاز المستخدم.
 */
export function libyaNow(): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Tripoli",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "0";

  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isOfficeOpen(office: Pick<OfficePayload, "temporarilyClosed" | "openDays" | "openTime" | "closeTime">): boolean {
  if (office.temporarilyClosed) return false;
  const { day, minutes } = libyaNow();
  const toMinutes = (value: string) => {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };
  return (
    office.openDays.includes(day) &&
    minutes >= toMinutes(office.openTime) &&
    minutes < toMinutes(office.closeTime)
  );
}

/** المسافة بالكيلومترات بين نقطتين (Haversine). */
export function distanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const rad = (value: number) => (value * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistance(km: number, lang: Lang): string {
  if (km < 1) return lang === "ar" ? `${Math.round(km * 1000)} م` : `${Math.round(km * 1000)} m`;
  return lang === "ar" ? `${km.toFixed(1)} كم` : `${km.toFixed(1)} km`;
}

export function formatDate(value: string | null, lang: Lang): string {
  if (!value) return lang === "ar" ? "غير محدد" : "Not specified";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(lang === "ar" ? "ar-LY" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
    numberingSystem: "latn",
  });
}

export function directionsUrl(office: { lat: number; lng: number }): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${office.lat},${office.lng}`;
}

export function osmEmbedUrl(office: { lat: number; lng: number }): string {
  const d = 0.01;
  const bbox = [office.lng - d, office.lat - d, office.lng + d, office.lat + d].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${office.lat},${office.lng}`;
}
