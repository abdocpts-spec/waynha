"use client";

import { useLayoutEffect } from "react";
import { applyPreferences } from "@/lib/preferences";

/**
 * يعيد تطبيق التفضيلات على <html> بعد تحميل React.
 * في وضع التطوير يعيد React Strict Mode تركيب <html> فيمسح الأصناف التي وضعها
 * PREFS_SCRIPT؛ هذا يرجعها قبل الرسم. في الإنتاج لا يغيّر شيئاً.
 */
export default function PrefsSync() {
  useLayoutEffect(() => {
    applyPreferences();
  }, []);
  return null;
}
