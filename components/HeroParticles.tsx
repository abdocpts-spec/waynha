"use client";

import { useEffect, useRef } from "react";

/**
 * خلفية قسم البداية في الصفحة الرئيسية:
 * - نقاط متناثرة تطير وتتجمع لتشكّل رمز شعار وينها (من السؤال إلى المكان)
 *   فوق العنوان، على شكل شاشة نقطية (dot matrix).
 * - غبار نقاط خفيف يتحرك في تيار هادئ في كامل القسم.
 * - المؤشر أو الإصبع يبعثر نقاط الشعار، ثم ترجع لمكانها.
 *
 * مكان الشعار يحدده العنصر .hero-mark-slot داخل القسم.
 * مع prefers-reduced-motion يُرسم الشعار مكتملاً بدون حركة.
 */

// ألوان الشعار (brand/README.md)
const COLORS = {
  light: { pin: "#1A56DB", teal: "#0E9F87", dust: ["26,86,219", "14,159,135"] },
  dark: { pin: "#5B8DEF", teal: "#2DD4BF", dust: ["91,141,239", "45,212,191"] },
};

// هندسة الرمز في مربع 100×100 (نفس brand/svg)، والإطار المقصوص حوله
const PIN = "M72 58C72 58 54 41 54 28A18 18 0 1 1 90 28C90 41 72 58 72 58Z M72 21A7 7 0 1 0 72 35A7 7 0 1 0 72 21Z";
const ROUTE = "M22 80C22 60 40 66 52 58S70 44 70 40";
const QMARK = "M23.5 79A3.5 3.5 0 0 0 16.5 79Q16.5 82 20 83.2L20 84.6";
const BOX = { x: 5, y: 6, w: 89, h: 91 };

// ---------- Simplex noise 2D/3D (seeded) ----------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise3D(seed: number) {
  const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0, 1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1, 0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);
  const rand = mulberry32(seed);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = p[i];
    p[i] = p[j];
    p[j] = t;
  }
  const perm = new Uint8Array(512);
  const pm12 = new Uint8Array(512);
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    pm12[i] = perm[i] % 12;
  }
  const F3 = 1 / 3;
  const G3 = 1 / 6;
  return (xin: number, yin: number, zin: number) => {
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    const s = (xin + yin + zin) * F3;
    const i = Math.floor(xin + s), j = Math.floor(yin + s), k = Math.floor(zin + s);
    const t = (i + j + k) * G3;
    const x0 = xin - (i - t), y0 = yin - (j - t), z0 = zin - (k - t);
    let i1, j1, k1, i2, j2, k2;
    if (x0 >= y0) {
      if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
      else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    } else {
      if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
      else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
      else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }
    const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2 * G3, y2 = y0 - j2 + 2 * G3, z2 = z0 - k2 + 2 * G3;
    const x3 = x0 - 1 + 3 * G3, y3 = y0 - 1 + 3 * G3, z3 = z0 - 1 + 3 * G3;
    const ii = i & 255, jj = j & 255, kk = k & 255;
    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 > 0) { const g = pm12[ii + perm[jj + perm[kk]]] * 3; t0 *= t0; n0 = t0 * t0 * (grad3[g] * x0 + grad3[g + 1] * y0 + grad3[g + 2] * z0); }
    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 > 0) { const g = pm12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3; t1 *= t1; n1 = t1 * t1 * (grad3[g] * x1 + grad3[g + 1] * y1 + grad3[g + 2] * z1); }
    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 > 0) { const g = pm12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3; t2 *= t2; n2 = t2 * t2 * (grad3[g] * x2 + grad3[g + 1] * y2 + grad3[g + 2] * z2); }
    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 > 0) { const g = pm12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3; t3 *= t3; n3 = t3 * t3 * (grad3[g] * x3 + grad3[g + 1] * y3 + grad3[g + 2] * z3); }
    return 32 * (n0 + n1 + n2 + n3);
  };
}

type Target = { x: number; y: number; teal: boolean };

/** يرسم الرمز في كانفس مخفي ويأخذ منه نقطة لكل خلية من شبكة بحجم step. */
function sampleLogo(size: number, step: number): Target[] {
  const s = size / BOX.h;
  const w = Math.ceil(BOX.w * s), h = Math.ceil(BOX.h * s);
  // مساحة الشعار مخفية أو صغيرة جداً (مثلاً في الوضع المبسط): لا نرسم شعاراً
  if (w < 8 || h < 8) return [];
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const c = off.getContext("2d", { willReadFrequently: true });
  if (!c) return [];
  c.setTransform(s, 0, 0, s, -BOX.x * s, -BOX.y * s);
  // المسار المنقّط (فيروزي = قناة الأخضر)
  c.strokeStyle = "rgb(0,255,0)";
  c.lineWidth = 5;
  c.lineCap = "round";
  c.setLineDash([1, 9]);
  c.stroke(new Path2D(ROUTE));
  c.setLineDash([]);
  // كرة السؤال وفيها «؟» مفرّغة
  c.fillStyle = "rgb(0,255,0)";
  c.beginPath();
  c.arc(20, 82, 11, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = "destination-out";
  // أعرض قليلاً من ملف الشعار حتى تبقى «؟» مقروءة بعد تحويلها لنقاط
  c.lineWidth = 3.2;
  c.lineJoin = "round";
  c.stroke(new Path2D(QMARK));
  c.beginPath();
  c.arc(20, 88.6, 2, 0, Math.PI * 2);
  c.fill();
  c.globalCompositeOperation = "source-over";
  // الدبوس (أزرق = قناة الأزرق)
  c.fillStyle = "rgb(0,0,255)";
  c.fill(new Path2D(PIN), "evenodd");

  const data = c.getImageData(0, 0, w, h).data;
  const out: Target[] = [];
  for (let y = step / 2; y < h; y += step) {
    for (let x = step / 2; x < w; x += step) {
      const i = (Math.floor(y) * w + Math.floor(x)) * 4;
      if (data[i + 3] < 140) continue;
      out.push({ x: x - w / 2, y: y - h / 2, teal: data[i + 1] > data[i + 2] });
    }
  }
  return out;
}

export default function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !host || !ctx) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;
    const noise = makeNoise3D((Math.random() * 1e9) | 0);

    let W = 0, H = 0, dpr = 1, z = 0, frameNo = 0;
    let dark = false;
    let running = false;
    let visible = true;
    let raf = 0;
    const pointer = { x: -9999, y: -9999, active: false };

    // نقاط الشعار
    let n = 0, dot = 2;
    let PX = new Float32Array(0), PY = new Float32Array(0), VX = new Float32Array(0), VY = new Float32Array(0);
    let TX = new Float32Array(0), TY = new Float32Array(0), DELAY = new Float32Array(0);
    let TEAL = new Uint8Array(0);
    // الغبار
    let m = 0;
    let DX = new Float32Array(0), DY = new Float32Array(0), DA = new Float32Array(0), DL = new Float32Array(0);
    let DC = new Uint8Array(0);

    const spawnDust = (i: number) => {
      DX[i] = Math.random() * W;
      DY[i] = Math.random() * H;
      DA[i] = 0;
      DL[i] = 200 + Math.random() * 400;
      DC[i] = Math.random() < 0.6 ? 0 : 1;
    };

    const layout = (scatter: boolean) => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = host.clientWidth;
      H = host.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // مكان وحجم الشعار من العنصر .hero-mark-slot
      const slot = host.querySelector<HTMLElement>(".hero-mark-slot");
      const hr = host.getBoundingClientRect();
      const sr = slot?.getBoundingClientRect();
      const size = sr ? Math.min(sr.height, 220) : 180;
      const cx = sr ? sr.left - hr.left + sr.width / 2 : W / 2;
      const cy = sr ? sr.top - hr.top + sr.height / 2 : H * 0.25;
      // شبكة أدق = شعار أوضح (خاصة علامة «؟» الصغيرة)
      const step = size >= 180 ? 3.2 : 2.8;
      dot = step * 0.38;

      const targets = W > 0 && H > 0 ? sampleLogo(size, step) : [];
      const prevN = n;
      n = targets.length;
      const keep = !scatter && prevN === n;
      if (!keep) {
        PX = new Float32Array(n); PY = new Float32Array(n);
        VX = new Float32Array(n); VY = new Float32Array(n);
        DELAY = new Float32Array(n);
      }
      TX = new Float32Array(n); TY = new Float32Array(n); TEAL = new Uint8Array(n);
      for (let i = 0; i < n; i++) {
        const t = targets[i];
        TX[i] = cx + t.x;
        TY[i] = cy + t.y;
        TEAL[i] = t.teal ? 1 : 0;
        if (!keep) {
          // تبدأ متناثرة في كامل القسم، وتصل تدريجياً من المسار إلى الدبوس
          PX[i] = Math.random() * W;
          PY[i] = Math.random() * H;
          DELAY[i] = (t.teal ? 0 : 25) + Math.random() * 40;
        }
      }
      if (reduceMotion) {
        PX.set(TX);
        PY.set(TY);
        DELAY.fill(0);
      }

      m = Math.max(120, Math.min(700, Math.floor((W * H) / 2200)));
      DX = new Float32Array(m); DY = new Float32Array(m); DA = new Float32Array(m); DL = new Float32Array(m);
      DC = new Uint8Array(m);
      for (let i = 0; i < m; i++) {
        spawnDust(i);
        DA[i] = Math.random() * DL[i];
      }
    };

    const step = () => {
      frameNo++;
      z += 0.0012;
      const R = 80, R2 = R * R;
      for (let i = 0; i < n; i++) {
        if (frameNo < DELAY[i]) continue;
        // ارتعاش خفيف حول الهدف حتى يبدو الشعار «حياً»
        const jx = noise(TX[i] * 0.02, TY[i] * 0.02, z) * 0.9;
        const jy = noise(TY[i] * 0.02, TX[i] * 0.02, z + 9) * 0.9;
        let ax = (TX[i] + jx - PX[i]) * 0.045;
        let ay = (TY[i] + jy - PY[i]) * 0.045;
        if (pointer.active) {
          const dx = PX[i] - pointer.x, dy = PY[i] - pointer.y, d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d / R) * 6;
            ax += (dx / d) * f;
            ay += (dy / d) * f;
          }
        }
        VX[i] = (VX[i] + ax) * 0.82;
        VY[i] = (VY[i] + ay) * 0.82;
        PX[i] += VX[i];
        PY[i] += VY[i];
      }
      const drift = (root.getAttribute("dir") ?? "rtl") === "rtl" ? -0.25 : 0.25;
      for (let i = 0; i < m; i++) {
        const a = noise(DX[i] * 0.003, DY[i] * 0.003, z) * Math.PI * 2;
        DX[i] += Math.cos(a) * 0.5 + drift;
        DY[i] += Math.sin(a) * 0.5;
        if (++DA[i] > DL[i] || DX[i] < -4 || DX[i] > W + 4 || DY[i] < -4 || DY[i] > H + 4) spawnDust(i);
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const pal = dark ? COLORS.dark : COLORS.light;
      // الغبار: يظهر ويختفي بنعومة على طول عمره
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = `rgba(${pal.dust[c]},${dark ? 0.32 : 0.26})`;
        ctx.beginPath();
        for (let i = 0; i < m; i++) {
          if (DC[i] !== c) continue;
          const life = DA[i] / DL[i];
          if (life < 0.08 || life > 0.92) continue;
          ctx.rect(DX[i], DY[i], 1.6, 1.6);
        }
        ctx.fill();
      }
      // نقاط الشعار: دوائر صغيرة كشاشة نقطية
      for (let c = 0; c < 2; c++) {
        ctx.fillStyle = c ? pal.teal : pal.pin;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (TEAL[i] !== c || frameNo < DELAY[i]) continue;
          ctx.moveTo(PX[i] + dot, PY[i]);
          ctx.arc(PX[i], PY[i], dot, 0, Math.PI * 2);
        }
        ctx.fill();
      }
    };

    const frame = () => {
      if (!running) return;
      step();
      draw();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running || reduceMotion || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const refreshColors = () => {
      dark = root.getAttribute("data-theme") === "dark";
      if (!running) draw();
    };

    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.x = e.clientX - r.left;
      pointer.y = e.clientY - r.top;
      pointer.active = e.pointerType === "mouse" || e.buttons > 0;
    };
    const onLeave = () => {
      pointer.active = false;
    };

    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    let first = true;
    const ro = new ResizeObserver(() => {
      layout(first);
      first = false;
      if (reduceMotion) {
        frameNo = 1;
        draw();
      }
    });
    const mo = new MutationObserver(refreshColors);
    const onVisibility = () => (document.hidden ? stop() : start());

    dark = root.getAttribute("data-theme") === "dark";
    io.observe(host);
    ro.observe(host);
    mo.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerdown", onMove);
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerup", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    start();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      mo.disconnect();
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerdown", onMove);
      host.removeEventListener("pointerleave", onLeave);
      host.removeEventListener("pointerup", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="hero-particles" aria-hidden="true" />;
}
