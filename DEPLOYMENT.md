# نشر وينها على الإنترنت (Vercel + Neon)

بعد النشر يعمل الموقع برابط ثابت `https://....vercel.app` بدون اللابتوب وبدون الواي فاي.
الحسابات المطلوبة مجانية: **Neon** (قاعدة البيانات) و**Vercel** (الموقع).

## 1) قاعدة البيانات على Neon
1. ادخل إلى https://neon.tech وأنشئ حساباً (يمكن الدخول بحساب GitHub).
2. أنشئ مشروعاً جديداً. اختر منطقة قريبة من الموقع: **AWS US East 2 (Ohio)** (أو أي منطقة؛ `vercel.json` مضبوط على `iad1` القريبة من Ohio).
3. من لوحة المشروع اضغط **Connect** وانسخ رابطين:
   - **Direct connection** (بدون `-pooler` في الاسم): تستخدمه لتطبيق الجداول من جهازك.
   - **Pooled connection** (فيه `-pooler`): تضعه في Vercel.

## 2) ملف بيئة للقاعدة السحابية (على جهازك فقط)
أنشئ ملفاً اسمه `.env.production` في مجلد المشروع (لا يُرفع إلى git) بهذا المحتوى:

```
DATABASE_URL="رابط Direct من Neon"
NATIONAL_ID_SECRET="سر جديد (انظر الأسفل)"
```

لتوليد سر جديد:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

## 3) تطبيق الجداول وتعبئة البيانات على Neon
نفّذ الأوامر بالترتيب في PowerShell من مجلد المشروع (المتغير `ENV_FILE` يجعل الأوامر تستخدم `.env.production` بدل `.env.local`):

```powershell
$env:ENV_FILE=".env.production"
npx prisma migrate deploy
npx prisma db seed
npx tsx scripts/add-passport-issuance.mts
npx tsx scripts/update-national-id.mts
npm run admin:create -- --login admin@waynha.ly --name "مدير وينها"
```

- الأمر الأخير ينشئ حساب الأدمن ويطبع كلمة مرور قوية مرة واحدة؛ احفظها.
- بعد الانتهاء أغلق النافذة أو نفّذ `Remove-Item Env:ENV_FILE` حتى لا تعمل أوامر لاحقة على القاعدة السحابية بالخطأ.

## 4) الموقع على Vercel
1. ادخل إلى https://vercel.com وسجّل الدخول بحساب GitHub.
2. **Add New → Project** ثم استورد مستودع `waynha`.
3. قبل الضغط على Deploy افتح **Environment Variables** وأضف:

| المتغير | القيمة |
|---|---|
| `DATABASE_URL` | رابط **Pooled** من Neon |
| `NATIONAL_ID_SECRET` | نفس السر الذي وضعته في `.env.production` |
| `GEMINI_API_KEY` | مفتاح Gemini (نفس الموجود في `.env.local`) |
| `GEMINI_MODEL` | `gemini-flash-lite-latest` |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.1-flash-lite` |
| `PRIVATE_ACCESS_KEY` | مفتاح الرابط الخاص (سلسلة عشوائية؛ اتركه فارغاً لفتح الموقع للجميع) |
| `SITE_URL` | عنوان الموقع بعد النشر (مثل `https://waynha.vercel.app`) |
| `GOOGLE_MAPS_API_KEY` | اختياري |

4. اضغط **Deploy**.
5. بعد أول نشر انسخ العنوان الذي أعطاك إياه Vercel، وضعه في `SITE_URL` (Settings → Environment Variables) ثم أعد النشر (Deployments → Redeploy).

## 5) الرابط الذي تعطيه للناس
إذا ضبطت `PRIVATE_ACCESS_KEY` فالموقع خاص: لا يفتحه إلا من معه الرابط الكامل:

```
https://عنوان-موقعك.vercel.app/?access=قيمة-المفتاح
```

وفي صفحة `/install` (بعد الدخول بالمفتاح) يظهر رمز QR يحمل المفتاح، ويمكن تثبيت التطبيق على الهاتف بالكامل (https).
لإلغاء الوصول لكل من أخذ الرابط: غيّر `PRIVATE_ACCESS_KEY` في Vercel وأعد النشر.

## ملاحظات
- حد حجم الملف المرفوع 4 ميغابايت (حد Vercel للطلب 4.5MB). الملفات المرفوعة تُحفظ في قاعدة البيانات.
- الحسابات المسجّلة على الجهاز المحلي لا تنتقل؛ يبدأ الموقع السحابي بحساب الأدمن الجديد فقط.
- كل `git push` إلى `main` ينشر نسخة جديدة تلقائياً على Vercel.
- الخطة المجانية كافية للتجربة والعرض؛ راقب الاستهلاك في لوحتي Vercel وNeon.
