"use client";

import type { LatLng } from "@/lib/maps/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
let loading: Promise<any> | null = null;

/** يحمّل Google Maps JavaScript API مرة واحدة (يتطلب مفتاحاً مقيّداً بنطاق الموقع). */
export function loadGoogleMaps(key: string, lang: string): Promise<any> {
  const w = window as any;
  if (w.google?.maps?.Map) return Promise.resolve(w.google.maps);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    const cb = "__waynhaGmapsReady";
    w[cb] = () => resolve(w.google.maps);
    const s = document.createElement("script");
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=${cb}&language=${lang}&loading=async`;
    s.async = true;
    s.onerror = () => { loading = null; reject(new Error("google-maps-load-failed")); };
    document.head.appendChild(s);
  });
  return loading;
}

export type RoadInfo = { distanceText: string; durationText: string };

/** مسافة ووقت القيادة الفعليان من Google (لا نقدّر شيئاً بأنفسنا). تعيد null إن لم تتوفر النتيجة. */
export async function roadInfo(gm: any, origin: LatLng, dests: { id: number; lat: number; lng: number }[]): Promise<Map<number, RoadInfo>> {
  const out = new Map<number, RoadInfo>();
  if (dests.length === 0) return out;
  try {
    const svc = new gm.DistanceMatrixService();
    const res = await svc.getDistanceMatrix({
      origins: [origin],
      destinations: dests.map((d) => ({ lat: d.lat, lng: d.lng })),
      travelMode: "DRIVING",
    });
    res.rows?.[0]?.elements?.forEach((el: any, i: number) => {
      if (el.status === "OK") out.set(dests[i].id, { distanceText: el.distance.text, durationText: el.duration.text });
    });
  } catch {
    /* الخدمة غير مفعّلة على المفتاح: نكتفي بالمسافة الجوية المحسوبة */
  }
  return out;
}
