"use client";

import { useActionState, useMemo, useState } from "react";
import MapCanvas from "@/components/maps/MapCanvas";
import { saveOffice, type OfficeFormState } from "@/lib/admin/offices";
import { inLibya, LIBYA_CENTER, parseMapsUrl, type LatLng } from "@/lib/maps/types";

export type OfficeDraft = {
  id: string;
  nameAr: string;
  nameEn: string;
  departmentAr: string;
  departmentEn: string;
  cityId: string;
  addressAr: string;
  addressEn: string;
  phone: string;
  lat: string;
  lng: string;
  mapsUrl: string;
  openDays: number[];
  openTime: string;
  closeTime: string;
  temporarilyClosed: boolean;
  active: boolean;
  isDemo: boolean;
  status: "DRAFT" | "IN_REVIEW" | "PUBLISHED";
  serviceIds: string[];
};

const DAY_NAMES = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** نموذج إضافة/تعديل جهة مع تحديد الموقع بالنقر على الخريطة. */
export default function OfficeEditor({
  draft,
  cities,
  services,
  googleKey,
}: {
  draft: OfficeDraft;
  cities: { id: string; nameAr: string; nameEn: string }[];
  services: { id: string; icon: string; titleAr: string }[];
  googleKey?: string;
}) {
  const [state, action, pending] = useActionState<OfficeFormState, FormData>(saveOffice, undefined);
  const [lat, setLat] = useState(draft.lat);
  const [lng, setLng] = useState(draft.lng);
  const [mapsUrl, setMapsUrl] = useState(draft.mapsUrl);
  const [cityId, setCityId] = useState(draft.cityId);
  const [filter, setFilter] = useState("");
  const [urlMsg, setUrlMsg] = useState("");

  const point: LatLng | null = useMemo(() => {
    const p = { lat: Number(lat), lng: Number(lng) };
    return lat !== "" && lng !== "" && inLibya(p) ? p : null;
  }, [lat, lng]);

  function onPick(p: LatLng) {
    setLat(p.lat.toFixed(6));
    setLng(p.lng.toFixed(6));
  }

  function fromUrl() {
    const p = parseMapsUrl(mapsUrl);
    if (p) {
      onPick(p);
      setUrlMsg("✓ تم أخذ الإحداثيات من الرابط.");
    } else {
      setUrlMsg("لا توجد إحداثيات في هذا الرابط (الروابط المختصرة لا تحملها). انقر على الخريطة بدلاً من ذلك.");
    }
  }

  const shown = services.filter((s) => !filter || s.titleAr.includes(filter));

  return (
    <form action={action} className="office-form dash-card" style={{ padding: 20 }}>
      <input type="hidden" name="id" value={draft.id} />

      <div className="grid-2">
        <label>
          اسم الجهة (عربي)
          <input name="nameAr" className="form-input" defaultValue={draft.nameAr} required dir="rtl" />
        </label>
        <label>
          اسم الجهة (English)
          <input name="nameEn" className="form-input" defaultValue={draft.nameEn} required dir="ltr" />
        </label>
        <label>
          الجهة التابعة لها (عربي)
          <input name="departmentAr" className="form-input" defaultValue={draft.departmentAr} dir="rtl" />
        </label>
        <label>
          Department (English)
          <input name="departmentEn" className="form-input" defaultValue={draft.departmentEn} dir="ltr" />
        </label>
      </div>

      <div className="grid-2">
        <label>
          المدينة
          <select name="cityId" className="form-input" value={cityId} onChange={(e) => setCityId(e.target.value)} required>
            {cities.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nameAr} — {c.nameEn}
              </option>
            ))}
            <option value="__new">+ مدينة جديدة…</option>
          </select>
        </label>
        <label>
          رقم الهاتف (اتركه فارغاً إن لم يتوفر)
          <input name="phone" className="form-input" defaultValue={draft.phone} dir="ltr" inputMode="tel" />
        </label>
      </div>
      {cityId === "__new" && (
        <div className="grid-2">
          <label>
            اسم المدينة (عربي)
            <input name="newCityAr" className="form-input" dir="rtl" />
          </label>
          <label>
            City name (English)
            <input name="newCityEn" className="form-input" dir="ltr" />
          </label>
        </div>
      )}

      <div className="grid-2">
        <label>
          العنوان (عربي)
          <input name="addressAr" className="form-input" defaultValue={draft.addressAr} dir="rtl" />
        </label>
        <label>
          Address (English)
          <input name="addressEn" className="form-input" defaultValue={draft.addressEn} dir="ltr" />
        </label>
      </div>

      <fieldset style={{ border: "1px solid var(--border-color)", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
        <legend style={{ fontWeight: 800, padding: "0 6px" }}>📍 الموقع على الخريطة</legend>
        <label>
          رابط Google Maps (اختياري)
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              name="mapsUrl"
              className="form-input"
              style={{ flex: 1, minWidth: 220 }}
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              dir="ltr"
              placeholder="https://www.google.com/maps/place/…/@32.88,13.19,17z"
            />
            <button type="button" className="btn-outline" onClick={fromUrl}>
              استخراج الإحداثيات
            </button>
          </div>
          {urlMsg && <small role="status">{urlMsg}</small>}
        </label>
        <div className="grid-2">
          <label>
            خط العرض (Latitude)
            <input name="lat" className="form-input" value={lat} onChange={(e) => setLat(e.target.value)} dir="ltr" inputMode="decimal" required />
          </label>
          <label>
            خط الطول (Longitude)
            <input name="lng" className="form-input" value={lng} onChange={(e) => setLng(e.target.value)} dir="ltr" inputMode="decimal" required />
          </label>
        </div>
        <small>انقر على الخريطة لتحديد موقع الجهة بدقة (تكبير الخريطة أولاً يعطي دقة أعلى).</small>
        <MapCanvas
          className="map-picker"
          googleKey={googleKey}
          lang="ar"
          markers={[]}
          selectedId={null}
          pick={point}
          onPick={onPick}
          fitKey={point ? `${point.lat.toFixed(3)},${point.lng.toFixed(3)}` : `${LIBYA_CENTER.lat}`}
          label="اختيار موقع الجهة"
        />
      </fieldset>

      <fieldset style={{ border: "1px solid var(--border-color)", borderRadius: 12, padding: 14, display: "grid", gap: 12 }}>
        <legend style={{ fontWeight: 800, padding: "0 6px" }}>🕒 ساعات العمل (اتركها فارغة إن لم تتوفر)</legend>
        <div className="days-row">
          {DAY_NAMES.map((n, i) => (
            <label key={i}>
              <input type="checkbox" name="openDays" value={i} defaultChecked={draft.openDays.includes(i)} /> {n}
            </label>
          ))}
        </div>
        <div className="grid-2">
          <label>
            من
            <input type="time" name="openTime" className="form-input" defaultValue={draft.openTime} dir="ltr" />
          </label>
          <label>
            إلى
            <input type="time" name="closeTime" className="form-input" defaultValue={draft.closeTime} dir="ltr" />
          </label>
        </div>
        <label style={{ flexDirection: "row", gap: 8, alignItems: "center", fontWeight: 500 }}>
          <input type="checkbox" name="temporarilyClosed" defaultChecked={draft.temporarilyClosed} /> مغلقة مؤقتاً بقرار إداري
        </label>
      </fieldset>

      <fieldset style={{ border: "1px solid var(--border-color)", borderRadius: 12, padding: 14, display: "grid", gap: 10 }}>
        <legend style={{ fontWeight: 800, padding: "0 6px" }}>📋 الخدمات التي تقدمها الجهة</legend>
        <input className="form-input" placeholder="ابحث في الخدمات…" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="بحث في الخدمات" />
        <div className="svc-pick">
          {services.map((s) => (
            <label key={s.id} style={{ display: filter && !s.titleAr.includes(filter) ? "none" : "flex" }}>
              <input type="checkbox" name="serviceIds" value={s.id} defaultChecked={draft.serviceIds.includes(s.id)} /> {s.icon} {s.titleAr}
            </label>
          ))}
          {shown.length === 0 && <span>لا نتائج.</span>}
        </div>
      </fieldset>

      <div className="grid-2">
        <label>
          حالة النشر
          <select name="status" className="form-input" defaultValue={draft.status}>
            <option value="DRAFT">مسودة (غير ظاهرة)</option>
            <option value="IN_REVIEW">قيد المراجعة (غير ظاهرة)</option>
            <option value="PUBLISHED">منشورة (ظاهرة للزوار)</option>
          </select>
        </label>
        <div style={{ display: "grid", gap: 8, alignContent: "end" }}>
          <label style={{ flexDirection: "row", gap: 8, alignItems: "center", fontWeight: 500 }}>
            <input type="checkbox" name="active" defaultChecked={draft.active} /> مفعّلة (إلغاء التفعيل يخفيها بدون حذف)
          </label>
          <label style={{ flexDirection: "row", gap: 8, alignItems: "center", fontWeight: 500 }}>
            <input type="checkbox" name="isDemo" defaultChecked={draft.isDemo} /> بيانات تجريبية (تظهر للزوار بتنبيه)
          </label>
        </div>
      </div>

      {state?.error && (
        <p className="form-error" role="alert" style={{ color: "var(--danger, #b91c1c)", fontWeight: 700 }}>
          {state.error}
        </p>
      )}
      <div>
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? "جارٍ الحفظ…" : "حفظ الجهة"}
        </button>
      </div>
    </form>
  );
}
