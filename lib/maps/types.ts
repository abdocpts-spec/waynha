/** أنواع الخريطة المشتركة بين الخادم والمتصفح (بيانات عامة فقط من PostgreSQL). */

export type MapOffice = {
  id: number;
  nameAr: string;
  nameEn: string;
  departmentAr: string;
  departmentEn: string;
  cityId: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  lat: number;
  lng: number;
  openDays: number[];
  openTime: string;
  closeTime: string;
  temporarilyClosed: boolean;
  isDemo: boolean;
  mapsUrl: string | null;
  serviceIds: string[];
};

export type MapService = { id: string; icon: string; titleAr: string; titleEn: string; categoryId: string };
export type MapCity = { id: string; nameAr: string; nameEn: string };
export type MapCategory = { id: string; icon: string; titleAr: string; titleEn: string };

export type MapData = {
  offices: MapOffice[];
  services: MapService[];
  cities: MapCity[];
  categories: MapCategory[];
};

export type LatLng = { lat: number; lng: number };

/** حدود تقريبية لليبيا للتحقق من الإحداثيات المدخلة. */
export const LIBYA_BOUNDS = { minLat: 18, maxLat: 35, minLng: 8, maxLng: 26 };
export const LIBYA_CENTER: LatLng = { lat: 32.8872, lng: 13.1913 };
/** نطاق تحريك الخريطة: ليبيا مع هامش صغير؛ لا يمكن سحب الخريطة أو تصغيرها خارجه. */
export const LIBYA_MAP_BOUNDS = { south: 19.0, north: 33.8, west: 9.0, east: 25.5 };

export function inLibya(p: LatLng): boolean {
  return (
    Number.isFinite(p.lat) && Number.isFinite(p.lng) &&
    p.lat >= LIBYA_BOUNDS.minLat && p.lat <= LIBYA_BOUNDS.maxLat &&
    p.lng >= LIBYA_BOUNDS.minLng && p.lng <= LIBYA_BOUNDS.maxLng
  );
}

/** يستخرج الإحداثيات من رابط Google Maps الكامل (الروابط المختصرة maps.app.goo.gl لا تحمل إحداثيات). */
export function parseMapsUrl(url: string): LatLng | null {
  const patterns = [/@(-?\d+\.\d+),(-?\d+\.\d+)/, /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, /[?&](?:q|query|ll|destination)=(-?\d+\.\d+)(?:,|%2C)(-?\d+\.\d+)/];
  for (const re of patterns) {
    const m = re.exec(url);
    if (m) {
      const p = { lat: Number(m[1]), lng: Number(m[2]) };
      if (inLibya(p)) return p;
    }
  }
  return null;
}
