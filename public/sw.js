// =============================================================
// sw.js — Kill switch لـ Service Worker قديم.
//
// النموذج الأولي (prototype/) كان يسجّل Service Worker على نفس العنوان
// ويحتفظ بنسخة من index.html القديم بمساعده القديم (ردود بالكلمات المفتاحية).
// لو اتفتح على localhost:3000 قبل، ممكن يعرض الصفحة القديمة بدل تطبيق Next.js.
//
// المتصفح يتحقق من هذا الملف تلقائياً، فيستبدل القديم بهذا:
// يمسح كل الكاش، يلغي تسجيل نفسه، ويعيد تحميل الصفحات المفتوحة.
// تطبيق وينها (Next.js) لا يستخدم Service Worker.
// =============================================================

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) client.navigate(client.url);
    })(),
  );
});
