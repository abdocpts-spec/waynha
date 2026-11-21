import type { Metadata } from "next";
import { networkInterfaces } from "node:os";
import { headers } from "next/headers";
import QRCode from "qrcode";
import InstallButton from "@/components/InstallButton";
import { t } from "@/lib/i18n";
import { getLang } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang();
  return { title: `${t(lang, "ثبّت التطبيق", "Install the app")} | ${t(lang, "وينها", "WAYNHA")}` };
}

/** عنوان الموقع الذي يُرمَّز في الـQR: SITE_URL إن وُجد، وإلا عنوان الطلب الحالي. */
async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, "");
  if (fromEnv && /^https?:\/\//i.test(fromEnv)) return fromEnv;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (/^(localhost|127\.|\[::1\])/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}

/** عنوان الجهاز على الشبكة المحلية (192.168.x.x ...)؛ يفتحه الهاتف إذا كان على نفس الواي فاي. */
function lanAddress(): string | null {
  for (const list of Object.values(networkInterfaces())) {
    for (const net of list ?? []) {
      if (net.family === "IPv4" && !net.internal && /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(net.address)) return net.address;
    }
  }
  return null;
}

export default async function InstallPage() {
  const lang = await getLang();
  let origin = await siteOrigin();
  // على جهاز التطوير: نستبدل localhost بعنوان الشبكة المحلية حتى يفتح الهاتف الرابط
  let viaLan = false;
  const local = /^(https?):\/\/(localhost|127\.[\d.]+|\[::1\])(:\d+)?$/i.exec(origin);
  if (local) {
    const ip = lanAddress();
    if (ip) {
      origin = `${local[1]}://${ip}${local[3] ?? ""}`;
      viaLan = true;
    }
  }
  const isLocal = !viaLan && /^https?:\/\/(localhost|127\.|\[::1\])/i.test(origin);

  // الرابط الذي يفتحه الهاتف بعد مسح الرمز: الصفحة الرئيسية (قابلة للتثبيت كتطبيق)
  // الرابط الخاص: عند الوصول من الإنترنت (والبوابة مفعّلة) يحمل الرمز مفتاح الدخول ليفتح على هاتف جديد.
  // هذه الصفحة نفسها لا تُعرض إلا لمن يملك المفتاح أصلاً (انظر proxy.ts).
  const accessKey = process.env.PRIVATE_ACCESS_KEY?.trim();
  const shareUrl = accessKey && !viaLan && !isLocal ? `${origin}/?access=${accessKey}` : `${origin}/`;
  const svg = await QRCode.toString(shareUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    width: 260,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <main className="container install-page">
      <h1 className="section-title">📲 {t(lang, "ثبّت وينها على هاتفك", "Install WAYNHA on your phone")}</h1>
      <p className="install-lead">
        {t(
          lang,
          "امسح الرمز بكاميرا هاتفك لفتح وينها، ثم أضِفه إلى شاشتك الرئيسية ليعمل كتطبيق بدون تحميل من أي متجر.",
          "Scan the code with your phone camera to open WAYNHA, then add it to your home screen to use it like an app — no app store needed.",
        )}
      </p>

      <div className="install-grid">
        <section className="content-card install-qr">
          <div
            className="qr-box"
            role="img"
            aria-label={t(lang, "رمز QR لفتح وينها", "QR code to open WAYNHA")}
            // SVG مولَّد على الخادم من عنوان موقعنا فقط
            dangerouslySetInnerHTML={{ __html: svg }}
          />
          <p className="install-url" dir="ltr">{shareUrl}</p>
          {viaLan && (
            <p className="install-warn">
              📶{" "}
              {t(
                lang,
                "رابط تجريبي على شبكتك المحلية: يجب أن يكون هاتفك على نفس شبكة الواي فاي، وأن يبقى الكمبيوتر شغّالاً. (على أندرويد يُضاف كاختصار فقط؛ التثبيت الكامل يحتاج عنوان https بعد النشر.)",
                "Test link on your local network: your phone must be on the same Wi-Fi and this computer must stay on. (On Android it is added as a shortcut only; full install needs an https address after publishing.)",
              )}
            </p>
          )}
          {isLocal && (
            <p className="install-warn">
              ⚠️{" "}
              {t(
                lang,
                "هذا عنوان محلي (localhost) ولن يفتحه هاتفك. انشر الموقع على عنوان عام (أو اضبط SITE_URL في .env.local) ثم افتح هذه الصفحة من العنوان العام لتحصل على الرمز الصحيح.",
                "This is a local address (localhost) and your phone cannot open it. Publish the site on a public address (or set SITE_URL in .env.local) and open this page from there to get the right code.",
              )}
            </p>
          )}
          <InstallButton lang={lang} />
        </section>

        <div>
          <section className="content-card">
            <h2 className="content-title">🤖 {t(lang, "أندرويد (Chrome)", "Android (Chrome)")}</h2>
            <ol className="install-steps">
              <li>{t(lang, "امسح الرمز وافتح الرابط في Chrome.", "Scan the code and open the link in Chrome.")}</li>
              <li>{t(lang, "اضغط قائمة ⋮ في أعلى المتصفح.", "Tap the ⋮ menu at the top of the browser.")}</li>
              <li>{t(lang, "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».", "Choose “Install app” or “Add to Home screen”.")}</li>
              <li>{t(lang, "أكّد، وستجد أيقونة وينها على شاشتك.", "Confirm, and the WAYNHA icon appears on your home screen.")}</li>
            </ol>
          </section>

          <section className="content-card">
            <h2 className="content-title">🍎 {t(lang, "آيفون (Safari)", "iPhone (Safari)")}</h2>
            <ol className="install-steps">
              <li>{t(lang, "امسح الرمز وافتح الرابط في Safari (وليس متصفحاً آخر).", "Scan the code and open the link in Safari (not another browser).")}</li>
              <li>{t(lang, "اضغط زر المشاركة (مربع بسهم لأعلى).", "Tap the Share button (a square with an up arrow).")}</li>
              <li>{t(lang, "اختر «إضافة إلى الشاشة الرئيسية».", "Choose “Add to Home Screen”.")}</li>
              <li>{t(lang, "اضغط «إضافة».", "Tap “Add”.")}</li>
            </ol>
          </section>

          <p className="install-note">
            ℹ️{" "}
            {t(
              lang,
              "التطبيق المثبّت هو نفس الموقع: يحتاج اتصالاً بالإنترنت ويتحدّث تلقائياً، ولا يطلب أي صلاحيات.",
              "The installed app is the same website: it needs an internet connection, updates automatically, and asks for no permissions.",
            )}
          </p>
        </div>
      </div>
    </main>
  );
}
