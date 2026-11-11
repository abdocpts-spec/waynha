"use client";

import { useEffect } from "react";
import { addRecentSearch } from "@/lib/preferences";

/** يسجّل عبارة البحث في «آخر عمليات البحث» (على هذا الجهاز فقط). لا يرسم شيئاً. */
export default function RecordSearch({ query }: { query: string }) {
  useEffect(() => {
    addRecentSearch(query);
  }, [query]);
  return null;
}
