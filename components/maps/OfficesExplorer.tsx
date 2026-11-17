"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import MapCanvas from "@/components/maps/MapCanvas";
import { distanceKm, formatDistance, isOfficeOpen } from "@/lib/format";
import { t, type Lang } from "@/lib/i18n";
import { roadInfo, type RoadInfo } from "@/lib/maps/google";
import type { LatLng, MapData, MapOffice } from "@/lib/maps/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const DAYS = {
  ar: ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
  en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
};

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[ً-ٰٟ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();

type LocState = "idle" | "asking" | "ok" | "denied" | "unavailable";

export default function OfficesExplorer({
  data,
  lang,
  googleKey,
  initialServiceId,
  initialOfficeId,
}: {
  data: MapData;
  lang: Lang;
  googleKey?: string;
  initialServiceId?: string;
  initialOfficeId?: number;
}) {
  const ar = lang === "ar";
  const pick = useCallback((a: string, e: string) => (ar ? a : e), [ar]);
  const L = useCallback((a: string, e: string) => t(lang, a, e), [lang]);

  const [q, setQ] = useState("");
  const [cityId, setCityId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [serviceId, setServiceId] = useState(initialServiceId ?? "");
  const [nearOnly, setNearOnly] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedId, setSelectedId] = useState<number | null>(initialOfficeId ?? null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [user, setUser] = useState<LatLng | null>(null);
  const [loc, setLoc] = useState<LocState>("idle");
  const [road, setRoad] = useState<Map<number, RoadInfo>>(new Map());
  const [gm, setGm] = useState<any>(null);
  const cityRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const serviceById = useMemo(() => new Map(data.services.map((s) => [s.id, s])), [data.services]);
  const cityById = useMemo(() => new Map(data.cities.map((c) => [c.id, c])), [data.cities]);
  const activeService = serviceId ? serviceById.get(serviceId) : undefined;

  const results = useMemo(() => {
    const nq = norm(q);
    let list = data.offices.filter((o) => {
      if (serviceId && !o.serviceIds.includes(serviceId)) return false;
      if (cityId && o.cityId !== cityId) return false;
      if (categoryId && !o.serviceIds.some((id) => serviceById.get(id)?.categoryId === categoryId)) return false;
      if (nq) {
        const city = cityById.get(o.cityId);
        const hay = norm(
          [
            o.nameAr, o.nameEn, o.departmentAr, o.departmentEn, o.addressAr, o.addressEn, city?.nameAr, city?.nameEn,
            ...o.serviceIds.flatMap((id) => {
              const s = serviceById.get(id);
              return s ? [s.titleAr, s.titleEn] : [];
            }),
          ].join(" "),
        );
        if (!nq.split(/\s+/).every((w) => hay.includes(w))) return false;
      }
      return true;
    });
    const withDist = list.map((o) => ({ o, km: user ? distanceKm(user, o) : null }));
    if (user) withDist.sort((a, b) => (a.km as number) - (b.km as number));
    else withDist.sort((a, b) => a.o.nameAr.localeCompare(b.o.nameAr, "ar"));
    list = withDist.map((x) => x.o);
    const shown = nearOnly && user ? withDist.slice(0, 3) : withDist;
    return shown;
  }, [data.offices, serviceId, cityId, categoryId, q, user, nearOnly, serviceById, cityById]);

  const markers = useMemo(
    () => results.map(({ o }) => ({ id: o.id, lat: o.lat, lng: o.lng, label: pick(o.nameAr, o.nameEn) })),
    [results, pick],
  );
  const fitKey = useMemo(() => `${results.map((r) => r.o.id).join(",")}|${user ? "u" : ""}`, [results, user]);
  const selected = results.find((r) => r.o.id === selectedId) ?? null;

  // مسافة ووقت القيادة الفعليان (Google فقط) لأقرب خمس جهات
  useEffect(() => {
    if (!gm || !user) return;
    let dead = false;
    const top = results.slice(0, 5).map(({ o }) => ({ id: o.id, lat: o.lat, lng: o.lng }));
    roadInfo(gm, user, top).then((m) => {
      if (!dead) setRoad(m);
    });
    return () => {
      dead = true;
    };
  }, [gm, user, results]);

  function locate() {
    if (!("geolocation" in navigator)) {
      setLoc("unavailable");
      return;
    }
    setLoc("asking");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        // الموقع يبقى في ذاكرة الصفحة فقط ولا يُرسل ولا يُحفظ
        setUser({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoc("ok");
        setNearOnly(false);
      },
      (err) => {
        setLoc(err.code === err.PERMISSION_DENIED ? "denied" : "unavailable");
        cityRef.current?.focus();
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  }

  function select(id: number) {
    setSelectedId(id);
    document.getElementById(`omap-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function schedule(o: MapOffice): string | null {
    if (!o.openTime || !o.closeTime || o.openDays.length === 0) return null;
    const d = [...o.openDays].sort((a, b) => a - b);
    const names = DAYS[ar ? "ar" : "en"];
    const contiguous = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
    const range = contiguous && d.length > 2 ? `${names[d[0]]} – ${names[d[d.length - 1]]}` : d.map((v) => names[v]).join("، ");
    return `${range} (${o.openTime} - ${o.closeTime})`;
  }

  function mapsLinks(o: MapOffice) {
    const dest = `${o.lat},${o.lng}`;
    const dir = `https://www.google.com/maps/dir/?api=1&destination=${dest}${user ? `&origin=${user.lat},${user.lng}` : ""}&travelmode=driving`;
    const open = o.mapsUrl && /^https:\/\/(www\.)?(google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(o.mapsUrl)
      ? o.mapsUrl
      : `https://www.google.com/maps/search/?api=1&query=${dest}`;
    return { dir, open };
  }

  const NA = L("غير متوفر", "Not available");

  function renderCard(o: MapOffice, km: number | null, float = false) {
    const sched = schedule(o);
    const { dir, open } = mapsLinks(o);
    const rd = road.get(o.id);
    const hasHours = Boolean(sched);
    const isOpen = hasHours && isOfficeOpen(o);
    const svcs = o.serviceIds.map((id) => serviceById.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const isExp = expanded === o.id;
    return (
      <article
        key={float ? `f${o.id}` : o.id}
        id={float ? undefined : `omap-${o.id}`}
        className={`omap-card${selectedId === o.id ? " selected" : ""}`}
        onClick={() => setSelectedId(o.id)}
      >
        <header className="omap-card-head">
          <div>
            <h3 className="omap-name">{pick(o.nameAr, o.nameEn)}</h3>
            <div className="omap-name-alt" lang={ar ? "en" : "ar"} translate="no">
              {ar ? o.nameEn : o.nameAr}
            </div>
          </div>
          {hasHours && (
            <span className={`status-pill ${isOpen ? "status-open" : "status-closed"}`}>
              {isOpen ? L("مفتوح الآن", "Open now") : L("مغلق الآن", "Closed now")}
            </span>
          )}
        </header>

        <ul className="omap-rows">
          <li><span aria-hidden="true">🏙️</span> {pick(cityById.get(o.cityId)?.nameAr ?? "", cityById.get(o.cityId)?.nameEn ?? "") || NA}</li>
          <li><span aria-hidden="true">📍</span> {pick(o.addressAr, o.addressEn) || NA}</li>
          <li>
            <span aria-hidden="true">☎</span>{" "}
            {o.phone ? <a href={`tel:${o.phone}`} dir="ltr">{o.phone}</a> : NA}
          </li>
          <li><span aria-hidden="true">🕒</span> {sched ?? NA}</li>
          {km != null && (
            <li className="omap-dist">
              <span aria-hidden="true">🧭</span>{" "}
              {rd ? (
                <>
                  {L("بالسيارة", "By car")}: <strong>{rd.distanceText}</strong> · <strong>{rd.durationText}</strong>
                  <small> (Google)</small>
                </>
              ) : (
                <>
                  <strong>{formatDistance(km, ar ? "ar" : "en")}</strong>{" "}
                  <small>{L("بخط مستقيم (تقريبي، وليس مسار الطريق)", "straight-line (approx., not road distance)")}</small>
                </>
              )}
            </li>
          )}
        </ul>

        {o.isDemo && (
          <p className="omap-demo">
            ⚠️ {L("بيانات تجريبية للعرض — لا تعتمد عليها قبل التأكد من الجهة.", "Demo data — confirm with the authority before relying on it.")}
          </p>
        )}

        {isExp && (
          <div className="omap-details">
            <div><strong>{L("الجهة التابعة لها", "Department")}:</strong> {pick(o.departmentAr, o.departmentEn) || NA}</div>
            <div className="omap-svc-title"><strong>{L("الخدمات التي تقدمها", "Services provided")} ({svcs.length}):</strong></div>
            {svcs.length === 0 ? (
              <div>{NA}</div>
            ) : (
              <ul className="omap-svc-list">
                {svcs.map((s) => (
                  <li key={s.id}>
                    <a href={`/services/${s.id}`}>{s.icon} {pick(s.titleAr, s.titleEn)}</a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="omap-actions">
          <button type="button" className="btn-outline" aria-expanded={isExp} onClick={(e) => { e.stopPropagation(); setExpanded(isExp ? null : o.id); setSelectedId(o.id); }}>
            {isExp ? L("إخفاء التفاصيل", "Hide details") : L("عرض التفاصيل", "View details")}
          </button>
          <a className="btn-primary" href={dir} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            🧭 {L("الاتجاهات", "Directions")}
          </a>
          <a className="btn-outline" href={open} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
            🗺️ {L("فتح في Google Maps", "Open in Google Maps")}
          </a>
        </div>
      </article>
    );
  }

  const resetAll = () => { setQ(""); setCityId(""); setCategoryId(""); setServiceId(""); setNearOnly(false); };
  const filtered = Boolean(q || cityId || categoryId || serviceId);

  return (
    <div className="omap">
      <div className="omap-filters" role="search">
        <input
          type="search"
          className="form-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={L("ابحث باسم الجهة أو الخدمة…", "Search by office or service name…")}
          aria-label={L("بحث", "Search")}
        />
        <select className="form-input" value={serviceId} onChange={(e) => setServiceId(e.target.value)} aria-label={L("الخدمة", "Service")}>
          <option value="">{L("كل الخدمات", "All services")}</option>
          {data.services.map((s) => (
            <option key={s.id} value={s.id}>{s.icon} {pick(s.titleAr, s.titleEn)}</option>
          ))}
        </select>
        <select className="form-input" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} aria-label={L("نوع الخدمة", "Service type")}>
          <option value="">{L("كل أنواع الخدمات", "All service types")}</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {pick(c.titleAr, c.titleEn)}</option>
          ))}
        </select>
        <select ref={cityRef} className={`form-input${loc === "denied" ? " omap-attn" : ""}`} value={cityId} onChange={(e) => setCityId(e.target.value)} aria-label={L("المدينة", "City")}>
          <option value="">{L("كل المدن", "All cities")}</option>
          {data.cities.map((c) => (
            <option key={c.id} value={c.id}>{pick(c.nameAr, c.nameEn)}</option>
          ))}
        </select>
      </div>

      <div className="omap-toolbar">
        <button type="button" className="btn-primary" onClick={locate} disabled={loc === "asking"}>
          📍 {loc === "asking" ? L("جارٍ تحديد موقعك…", "Locating…") : user ? L("حدّث موقعي", "Update my location") : L("الأقرب إليّ", "Nearest to me")}
        </button>
        {user && (
          <label className="omap-check">
            <input type="checkbox" checked={nearOnly} onChange={(e) => setNearOnly(e.target.checked)} />
            {L("أقرب 3 جهات فقط", "Nearest 3 only")}
          </label>
        )}
        {filtered && (
          <button type="button" className="btn-outline" onClick={resetAll}>
            ✕ {L("مسح الفلاتر", "Clear filters")}
          </button>
        )}
        <div className="omap-view" role="group" aria-label={L("طريقة العرض", "View")}>
          <button type="button" className={view === "map" ? "active" : ""} aria-pressed={view === "map"} onClick={() => setView("map")}>🗺️ {L("خريطة", "Map")}</button>
          <button type="button" className={view === "list" ? "active" : ""} aria-pressed={view === "list"} onClick={() => setView("list")}>☰ {L("قائمة", "List")}</button>
        </div>
      </div>

      <p className="omap-hint" role="status" aria-live="polite">
        {loc === "denied" && `🔒 ${L("لم تسمح بتحديد الموقع — اختر مدينتك من القائمة أعلاه لعرض الجهات القريبة.", "Location was not allowed — choose your city above to see nearby offices.")}`}
        {loc === "unavailable" && `⚠️ ${L("تعذّر تحديد موقعك. اختر مدينتك يدوياً.", "Could not get your location. Please choose your city manually.")}`}
        {loc === "ok" && `✅ ${L("تم الترتيب حسب القرب. موقعك لا يُحفظ ولا يُرسل لأي جهة.", "Sorted by distance. Your location is not stored or sent anywhere.")}`}
        {loc === "idle" && `ℹ️ ${L("لن نطلب موقعك إلا عند ضغط «الأقرب إليّ».", "We only ask for your location when you press “Nearest to me”.")}`}
      </p>

      {activeService && (
        <div className="omap-service-banner">
          {activeService.icon} {L("الجهات التي تقدم خدمة", "Offices providing")}: <strong>{pick(activeService.titleAr, activeService.titleEn)}</strong>
        </div>
      )}

      <div className={`omap-body view-${view}`}>
        {view === "map" && (
          <div className="omap-map">
            <MapCanvas
              googleKey={googleKey}
              lang={ar ? "ar" : "en"}
              markers={markers}
              selectedId={selectedId}
              user={user}
              onSelect={select}
              onGoogle={setGm}
              fitKey={fitKey}
              label={L("خريطة الجهات", "Offices map")}
            />
            {selected && (
              <div className="omap-float" aria-live="polite">
                {renderCard(selected.o, selected.km, true)}
                <button type="button" className="omap-float-close" aria-label={L("إغلاق", "Close")} onClick={() => setSelectedId(null)}>✕</button>
              </div>
            )}
          </div>
        )}

        <div className="omap-list" ref={listRef}>
          <div className="omap-count">
            {L(`${results.length} جهة`, `${results.length} office${results.length === 1 ? "" : "s"}`)}
          </div>
          {results.length === 0 && (
            <div className="omap-empty">
              {serviceId && data.offices.every((o) => !o.serviceIds.includes(serviceId))
                ? L("لا توجد جهات مسجّلة لهذه الخدمة بعد.", "No offices are registered for this service yet.")
                : L("لا توجد جهات تطابق بحثك.", "No offices match your search.")}
            </div>
          )}
          {results.map(({ o, km }) => renderCard(o, km))}
        </div>
      </div>

      <p className="omap-disclaimer">
        ℹ️ {L("وينها منصة إرشادية مستقلة وغير مرتبطة رسمياً بأي جهة حكومية. تحقق من العنوان وساعات العمل مع الجهة قبل الذهاب.", "WAYNHA is an independent guidance platform, not officially affiliated with any government body. Confirm address and hours with the office before you go.")}
      </p>
    </div>
  );
}
