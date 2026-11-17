import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type LinkResult = "OK" | "BROKEN" | "UNCHECKED";

function isPrivateIp(ip: string): boolean {
  if (ip.includes(":")) {
    const v = ip.toLowerCase();
    return v === "::1" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:127.") || v.startsWith("::ffff:10.") || v.startsWith("::ffff:192.168.");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
  );
}

/**
 * فحص أولي لرابط مصدر (للأدمن فقط): هل يستجيب؟ لا يعني نجاحه صحة المعلومة.
 * يرفض العناوين الداخلية (حماية SSRF) ولا يتتبع إعادة التوجيه.
 */
export async function checkLink(raw: string): Promise<LinkResult> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return "BROKEN";
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return "BROKEN";
  if (url.port && url.port !== "80" && url.port !== "443") return "UNCHECKED";

  try {
    const host = url.hostname.replace(/^\[|\]$/g, "");
    const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
    if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) return "UNCHECKED";
  } catch {
    return "BROKEN"; // الدومين غير موجود
  }

  const headers = { "user-agent": "WaynhaLinkCheck/1.0 (+source verification)" };
  try {
    let res = await fetch(url, { method: "HEAD", redirect: "manual", headers, signal: AbortSignal.timeout(7000) });
    if (res.status === 405 || res.status === 403 || res.status === 501) {
      res = await fetch(url, { method: "GET", redirect: "manual", headers, signal: AbortSignal.timeout(7000) });
      await res.body?.cancel();
    }
    if (res.status < 400) return "OK";
    if (res.status === 404 || res.status === 410) return "BROKEN";
    return "UNCHECKED"; // 401/403/429/5xx: لا نحكم عليه
  } catch {
    return "UNCHECKED"; // مهلة أو خطأ شبكة عابر
  }
}
