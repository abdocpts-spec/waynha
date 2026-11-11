/**
 * كاش بسيط في ذاكرة الخادم مع مدة صلاحية (TTL).
 * يُستعمل فقط لبيانات الخدمات والجهات العامة — لا يُخزَّن فيه أي شيء خاص بالمستخدم.
 * يخزن الـ Promise نفسه، فالطلبات المتزامنة على نفس المفتاح تشترك في استعلام واحد.
 */
export function createTtlCache<T>(ttlMs: number, maxEntries = 200) {
  const entries = new Map<string, { value: Promise<T>; expires: number }>();

  return async function cached(key: string, load: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = entries.get(key);
    if (hit && hit.expires > now) return hit.value;

    const value = load();
    entries.set(key, { value, expires: now + ttlMs });
    // لا نحتفظ بنتيجة فاشلة
    value.catch(() => entries.delete(key));

    if (entries.size > maxEntries) {
      const oldest = entries.keys().next().value;
      if (oldest !== undefined) entries.delete(oldest);
    }
    return value;
  };
}
