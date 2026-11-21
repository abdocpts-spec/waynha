import { NextResponse, type NextRequest } from "next/server";

/**
 * بوابة الرابط الخاص: عندما يُضبط PRIVATE_ACCESS_KEY في .env.local، لا يفتح الموقع من الإنترنت
 * (مثلاً عبر نفقٍ عام) إلا لمن معه الرابط الذي يحمل المفتاح: https://...?access=المفتاح
 *
 * - الطلبات المحلية (localhost والشبكة المحلية) لا تتأثر.
 * - بعد أول فتح بالمفتاح يُحفظ في كوكي، فتعمل بقية الصفحات والتطبيق المثبّت بدون إعادة المفتاح.
 * - ملف التعريف وأيقونات التطبيق مستثناة لأن المتصفح يطلبها بدون كوكي أثناء التثبيت.
 */
const COOKIE = "waynha-access";
const PUBLIC_FILES = new Set(["/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/favicon.ico"]);
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const DENIED_HTML = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>رابط خاص | وينها</title>
<style>body{font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f0f4ff;color:#0f172a;text-align:center;padding:24px}
div{max-width:380px}h1{font-size:1.4rem}p{color:#475569;line-height:1.8}</style></head>
<body><div><h1>🔒 هذا رابط خاص</h1><p>هذه النسخة من وينها متاحة فقط لمن لديه الرابط الكامل الذي أُرسل إليه.<br>اطلب الرابط من صاحب المشروع.</p></div></body></html>`;

export function proxy(request: NextRequest) {
  const key = process.env.PRIVATE_ACCESS_KEY?.trim();
  if (!key) return NextResponse.next();

  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  // (Next نفسه يضيف x-forwarded-for لكل طلب، فلا نعتمد عليه؛ cloudflared يضيف cf-connecting-ip)
  const viaTunnel = request.headers.has("cf-connecting-ip");
  if (LOCAL_HOST.test(host) && !viaTunnel) return NextResponse.next();

  const { pathname, searchParams } = request.nextUrl;
  if (PUBLIC_FILES.has(pathname)) return NextResponse.next();

  const cookie = request.cookies.get(COOKIE)?.value ?? "";
  if (cookie && safeEqual(cookie, key)) return NextResponse.next();

  const given = searchParams.get("access") ?? "";
  if (given && safeEqual(given, key)) {
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    const clean = new URL(`${proto}://${host}${pathname}`);
    searchParams.forEach((value, name) => {
      if (name !== "access") clean.searchParams.set(name, value);
    });
    const res = NextResponse.redirect(clean);
    res.cookies.set(COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      secure: proto === "https",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  return new NextResponse(DENIED_HTML, {
    status: 403,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
