/** نوع الزائر الذي يختاره في صفحة الترحيب: مواطن ليبي أو أجنبي (يُشارك بين الخادم والمتصفح). */

export type Audience = "CITIZEN" | "FOREIGNER";

export const AUDIENCE_COOKIE = "waynha-audience";

export function parseAudience(value: unknown): Audience | null {
  return value === "CITIZEN" || value === "FOREIGNER" ? value : null;
}
