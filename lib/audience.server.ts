import "server-only";
import { cookies } from "next/headers";
import { AUDIENCE_COOKIE, parseAudience, type Audience } from "@/lib/audience";
import type { CurrentUser } from "@/lib/auth/session";

/** اختيار الزائر في صفحة الترحيب (كوكي جلسة: يزول بإغلاق المتصفح فيُسأل في كل زيارة). */
export async function getAudience(): Promise<Audience | null> {
  return parseAudience((await cookies()).get(AUDIENCE_COOKIE)?.value);
}

/**
 * النوع المستخدم لترشيح الخدمات: اختيار الزائر في هذه الزيارة أولاً،
 * وإن لم يوجد فنوع حسابه (الأدمن بلا ترشيح).
 */
export function effectiveRole(audience: Audience | null, user: CurrentUser | null): Audience | null {
  if (audience) return audience;
  return user?.role === "CITIZEN" || user?.role === "FOREIGNER" ? user.role : null;
}
