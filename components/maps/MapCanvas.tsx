"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { loadGoogleMaps } from "@/lib/maps/google";
import { LIBYA_CENTER, type LatLng } from "@/lib/maps/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type CanvasMarker = { id: number; lat: number; lng: number; label: string };

type Engine = {
  setMarkers(markers: CanvasMarker[], selectedId: number | null): void;
  setUser(p: LatLng | null): void;
  setPick(p: LatLng | null): void;
  fit(markers: CanvasMarker[], user: LatLng | null): void;
  panTo(p: LatLng): void;
  destroy(): void;
};

type Props = {
  /** مفتاح Google Maps؛ بدونه تُستخدم خريطة OpenStreetMap (Leaflet) */
  googleKey?: string;
  lang: string;
  markers: CanvasMarker[];
  selectedId: number | null;
  user?: LatLng | null;
  pick?: LatLng | null;
  onSelect?: (id: number) => void;
  onPick?: (p: LatLng) => void;
  onGoogle?: (gm: any) => void;
  /** تغيّر هذه القيمة = إعادة ضبط حدود الخريطة على النتائج */
  fitKey: string;
  label: string;
  className?: string;
};

export default function MapCanvas(props: Props) {
  const { googleKey, lang, markers, selectedId, user = null, pick = null, fitKey, label, className } = props;
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<Engine | null>(null);
  const cb = useRef(props);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    cb.current = props;
  });

  useEffect(() => {
    let dead = false;
    const el = host.current;
    if (!el) return;

    async function init(node: HTMLDivElement) {
      try {
        let eng: Engine;
        if (googleKey) {
          const gm = await loadGoogleMaps(googleKey, lang);
          if (dead) return;
          const map = new gm.Map(node, {
            center: LIBYA_CENTER,
            zoom: 6,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: "greedy",
          });
          const pins = new Map<number, any>();
          let userPin: any = null;
          let pickPin: any = null;
          map.addListener("click", (e: any) => cb.current.onPick?.({ lat: e.latLng.lat(), lng: e.latLng.lng() }));
          eng = {
            setMarkers(list, sel) {
              pins.forEach((m) => m.setMap(null));
              pins.clear();
              for (const m of list) {
                const pin = new gm.Marker({
                  map,
                  position: { lat: m.lat, lng: m.lng },
                  title: m.label,
                  zIndex: m.id === sel ? 10 : 1,
                  icon:
                    m.id === sel
                      ? { path: gm.SymbolPath.CIRCLE, scale: 11, fillColor: "#0f766e", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 }
                      : undefined,
                });
                pin.addListener("click", () => cb.current.onSelect?.(m.id));
                pins.set(m.id, pin);
              }
            },
            setUser(p) {
              userPin?.setMap(null);
              userPin = p
                ? new gm.Marker({
                    map,
                    position: p,
                    icon: { path: gm.SymbolPath.CIRCLE, scale: 8, fillColor: "#2563eb", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 3 },
                  })
                : null;
            },
            setPick(p) {
              pickPin?.setMap(null);
              pickPin = p ? new gm.Marker({ map, position: p }) : null;
            },
            fit(list, u) {
              const pts = [...list.map((m) => ({ lat: m.lat, lng: m.lng })), ...(u ? [u] : [])];
              if (pts.length === 0) {
                map.setCenter(LIBYA_CENTER);
                map.setZoom(6);
                return;
              }
              if (pts.length === 1) {
                map.setCenter(pts[0]);
                map.setZoom(14);
                return;
              }
              const b = new gm.LatLngBounds();
              pts.forEach((p) => b.extend(p));
              map.fitBounds(b, 48);
            },
            panTo(p) {
              map.panTo(p);
            },
            destroy() {
              pins.forEach((m) => m.setMap(null));
            },
          };
          cb.current.onGoogle?.(gm);
        } else {
          const L = (await import("leaflet")).default;
          if (dead) return;
          const map = L.map(node).setView([LIBYA_CENTER.lat, LIBYA_CENTER.lng], 6);
          L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
            attribution: "© OpenStreetMap",
          }).addTo(map);
          const group = L.layerGroup().addTo(map);
          let userPin: any = null;
          let pickPin: any = null;
          const icon = (sel: boolean) =>
            L.divIcon({
              className: "wmark-wrap",
              html: `<span class="wmark${sel ? " sel" : ""}"></span>`,
              iconSize: [30, 38],
              iconAnchor: [15, 36],
            });
          map.on("click", (e: any) => cb.current.onPick?.({ lat: e.latlng.lat, lng: e.latlng.lng }));
          eng = {
            setMarkers(list, sel) {
              group.clearLayers();
              for (const m of list) {
                L.marker([m.lat, m.lng], {
                  icon: icon(m.id === sel),
                  title: m.label,
                  zIndexOffset: m.id === sel ? 1000 : 0,
                  keyboard: true,
                })
                  .on("click", () => cb.current.onSelect?.(m.id))
                  .addTo(group);
              }
            },
            setUser(p) {
              userPin?.remove();
              userPin = p
                ? L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 3, fillColor: "#2563eb", fillOpacity: 1 }).addTo(map)
                : null;
            },
            setPick(p) {
              pickPin?.remove();
              pickPin = p ? L.marker([p.lat, p.lng], { icon: icon(true) }).addTo(map) : null;
            },
            fit(list, u) {
              const pts: [number, number][] = [
                ...list.map((m) => [m.lat, m.lng] as [number, number]),
                ...(u ? [[u.lat, u.lng] as [number, number]] : []),
              ];
              if (pts.length === 0) {
                map.setView([LIBYA_CENTER.lat, LIBYA_CENTER.lng], 6);
                return;
              }
              if (pts.length === 1) {
                map.setView(pts[0], 14);
                return;
              }
              map.fitBounds(pts, { padding: [40, 40], maxZoom: 15 });
            },
            panTo(p) {
              map.panTo([p.lat, p.lng]);
            },
            destroy() {
              map.remove();
            },
          };
          setTimeout(() => map.invalidateSize(), 200);
        }
        engine.current = eng;
        setReady(true);
      } catch {
        if (!dead) setError(true);
      }
    }
    void init(el);

    return () => {
      dead = true;
      engine.current?.destroy();
      engine.current = null;
      setReady(false);
    };
  }, [googleKey, lang]);

  useEffect(() => {
    if (ready) engine.current?.setMarkers(markers, selectedId);
  }, [ready, markers, selectedId]);
  useEffect(() => {
    if (ready) engine.current?.setUser(user);
  }, [ready, user]);
  useEffect(() => {
    if (ready) engine.current?.setPick(pick);
  }, [ready, pick]);
  useEffect(() => {
    // نعيد ضبط الحدود عند تغيّر النتائج فقط، لا عند اختيار جهة
    if (ready) engine.current?.fit(cb.current.markers, cb.current.user ?? null);
  }, [ready, fitKey]);
  useEffect(() => {
    if (!ready || selectedId == null) return;
    const m = cb.current.markers.find((x) => x.id === selectedId);
    if (m) engine.current?.panTo(m);
  }, [ready, selectedId]);

  return (
    <div className={`map-canvas ${className ?? ""}`} role="region" aria-label={label}>
      <div ref={host} className="map-canvas-host" />
      {!ready && !error && (
        <div className="map-canvas-state" aria-live="polite">
          …
        </div>
      )}
      {error && (
        <div className="map-canvas-state map-canvas-error" role="alert">
          ⚠️
        </div>
      )}
    </div>
  );
}
