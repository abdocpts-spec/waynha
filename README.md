# وينها | WAYNHA

منصة إرشادية للإجراءات والخدمات الحكومية في ليبيا، مع **مساعد ذكي حقيقي** مبني على
Google Gemini + PostgreSQL.

> وينها منصة إرشادية مستقلة وليست جهة حكومية.

## التقنيات

| الطبقة | التقنية |
| --- | --- |
| الواجهة | Next.js 16 (App Router) + React 19 + TypeScript |
| التصميم | نظام تصميم وينها الأصلي (`app/design-system.css`) — RTL للعربي و LTR للإنجليزي |
| قاعدة البيانات | PostgreSQL + Prisma 7 |
| الذكاء الاصطناعي | Google Gemini عبر `@google/genai` — **من الخادم فقط** |

## التشغيل

```bash
npm install
cp .env.example .env.local     # ثم ضع GEMINI_API_KEY
npm run db:start               # PostgreSQL محلي (لا يحتاج تثبيت)
npx prisma migrate deploy      # إنشاء الجداول
npm run db:seed                # تعبئة البيانات التجريبية
npm run dev                    # http://localhost:3000
```

أوامر مساعدة:

| الأمر | الوظيفة |
| --- | --- |
| `npm run db:start` / `db:stop` / `db:status` | إدارة قاعدة البيانات المحلية |
| `npm run db:seed` | إعادة تعبئة البيانات من `prisma/seed-data.json` |
| `npm run test:search` | اختبار طبقة البحث (بدون Gemini) |
| `npm run test:assistant` | اختبار المساعد كاملاً (يحتاج المفتاح والخادم) |
| `npm run typecheck` / `lint` / `build` | الفحوصات |

## كيف يعمل المساعد (RAG)

```
سؤال المستخدم
   ↓  Gemini (نموذج سريع) يستخرج النية وعبارة بحث فصيحة   → lib/ai/intent.ts
   ↓  البحث في PostgreSQL (تطبيع عربي + مرادفات ليبية)      → lib/search/*
   ↓  بناء WAYNHA CONTEXT من بيانات الخدمة والجهات          → lib/ai/contextBuilder.ts
   ↓  Gemini يصيغ الإجابة من هذا السياق فقط                 → app/api/ai/chat/route.ts
   ↓  بث الرد تدريجياً (NDJSON) + بطاقة خدمة من قاعدة البيانات
```

**قاعدة صارمة:** الخطوات والمستندات والرسوم والجهات تُعرض في الواجهة من قاعدة البيانات
مباشرة، لا من نص النموذج. والـ system prompt يمنع اختراع أي معلومة حكومية.

## البيانات

كل السجلات المعبّأة حالياً `isDemo = true` أي **بيانات تجريبية** (مصدرها النموذج الأولي،
وأرقام الهواتف فيها أرقام مثال). الواجهة تعرض تنبيهاً، والمساعد ينبّه المستخدم كذلك.
بعد التحقق من أي خدمة، غيّر `isDemo` إلى `false`.

## الأمان

- `GEMINI_API_KEY` يُقرأ في الخادم فقط (`lib/ai/gemini.ts`)، ولا يصل للمتصفح أبداً.
- تحقق من المدخلات بـ zod، وحد أقصى 1000 حرف للرسالة.
- Rate limiting بسيط داخل الذاكرة (15 طلب/دقيقة لكل IP).
- لا تُعرض أخطاء المزوّد للمستخدم، ولا تُسجَّل نصوص المستخدمين في اللوقز.
- ردود النموذج تُعرض كنص عادي (بدون `dangerouslySetInnerHTML`).
