import { prisma } from "@/lib/db";
import { createTtlCache } from "@/lib/cache";
import { contentWords, normalizeText, tokenize, tokenizeDetailed } from "@/lib/search/normalize";
import type { Prisma } from "@/lib/generated/prisma/client";

/**
 * البحث عن الخدمات في PostgreSQL (طبقة الاسترجاع في RAG).
 *
 * الخطوات: تطبيع السؤال → استخراج الكلمات ومرادفاتها الليبية →
 * ترشيح مبدئي في SQL (searchText + جدول الكلمات المفتاحية) → ترتيب بالنقاط.
 *
 * للتوسعة لاحقاً: يمكن استبدال الترشيح المبدئي ببحث دلالي (pgvector)
 * مع إبقاء نفس الواجهة `searchServices`.
 */

export const serviceInclude = {
  category: true,
  steps: { orderBy: { position: "asc" } },
  documents: { orderBy: { position: "asc" } },
  notes: { orderBy: { position: "asc" } },
  faqs: { orderBy: { position: "asc" } },
  keywords: true,
  relatedTo: { include: { to: true } },
} satisfies Prisma.ServiceInclude;

export type ServiceWithDetails = Prisma.ServiceGetPayload<{ include: typeof serviceInclude }>;

/** الحقول اللازمة للبحث والترتيب فقط — بدون الخطوات والمستندات والأسئلة الشائعة. */
export const serviceSummarySelect = {
  id: true,
  icon: true,
  categoryId: true,
  titleAr: true,
  titleEn: true,
  shortDescAr: true,
  shortDescEn: true,
  departmentAr: true,
  departmentEn: true,
  keywords: { select: { keyword: true } },
} satisfies Prisma.ServiceSelect;

export type ServiceSummary = Prisma.ServiceGetPayload<{ select: typeof serviceSummarySelect }>;

type Searchable = Pick<
  ServiceSummary,
  "titleAr" | "titleEn" | "shortDescAr" | "shortDescEn" | "departmentAr" | "departmentEn" | "keywords"
>;

export type ServiceMatch<S = ServiceWithDetails> = {
  service: S;
  score: number;
  /** كل كلمة مفيدة في السؤال وجدت ما يقابلها في هذه الخدمة */
  complete: boolean;
};

function candidateWhere(tokens: string[]): Prisma.ServiceWhereInput {
  return {
    OR: [
      ...tokens.map((token) => ({ searchText: { contains: token } })),
      { keywords: { some: { keyword: { in: tokens } } } },
    ],
  };
}

function rank<S extends Searchable>(query: string, candidates: S[], limit: number): ServiceMatch<S>[] {
  const words = contentWords(query);
  const normalizedQuery = normalizeText(query);
  const detailed = tokenizeDetailed(query);

  const scored = candidates.map((service) => {
    const title = normalizeText(`${service.titleAr} ${service.titleEn}`);
    const body = normalizeText(
      `${service.shortDescAr} ${service.shortDescEn} ${service.departmentAr} ${service.departmentEn}`,
    );
    const keywords = service.keywords.map((k) => k.keyword);

    let score = 0;
    const matched = new Set<string>();

    // عبارة مفتاحية كاملة داخل السؤال ("تجديد جواز") أقوى من كلمة واحدة
    for (const keyword of keywords) {
      if (keyword && normalizedQuery.includes(keyword)) {
        score += 3 * keyword.split(" ").length;
        for (const { word, variants } of detailed) {
          if (variants.some((variant) => keyword.includes(variant))) matched.add(word);
        }
      }
    }

    // كل كلمة في السؤال تُحتسب مرة واحدة، بأقوى صيغة طابقت
    for (const { word, variants } of detailed) {
      let best = 0;
      for (const variant of variants) {
        if (title.includes(variant)) best = Math.max(best, 2);
        else if (body.includes(variant)) best = Math.max(best, 1);
        else if (keywords.some((keyword) => keyword.includes(variant))) best = Math.max(best, 1);
      }
      if (best > 0) {
        score += best;
        matched.add(word);
      }
    }

    return {
      service,
      score,
      complete: words.length > 0 && words.every((word) => matched.has(word)),
    };
  });

  return scored
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** بحث كامل (مع كل التفاصيل) — لصفحات الموقع. */
export async function searchServices(query: string, limit = 5): Promise<ServiceMatch[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const candidates = await prisma.service.findMany({
    where: candidateWhere(tokens),
    include: serviceInclude,
  });
  return rank(query, candidates, limit);
}

/** البيانات العامة للخدمات تتغير نادراً، فنحتفظ بها دقائق قليلة في ذاكرة الخادم. */
const CACHE_TTL_MS = 5 * 60 * 1000;
const summaryCache = createTtlCache<ServiceSummary[]>(CACHE_TTL_MS);
const detailsCache = createTtlCache<ServiceWithDetails | null>(CACHE_TTL_MS);
const officesCache = createTtlCache<OfficeWithCity[]>(CACHE_TTL_MS);

/**
 * بحث خفيف للمساعد: يجلب حقول البحث فقط للخدمات المرشحة،
 * والتفاصيل الكاملة تُجلب لاحقاً للخدمة المختارة وحدها (getServiceCached).
 */
export async function searchServiceSummaries(
  query: string,
  limit = 5,
): Promise<ServiceMatch<ServiceSummary>[]> {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  const key = [...tokens].sort().join(" ");
  const candidates = await summaryCache(key, () =>
    prisma.service.findMany({ where: candidateWhere(tokens), select: serviceSummarySelect }),
  );
  return rank(query, candidates, limit);
}

/** أفضل نتيجة، فقط عندما تكون واضحة بما يكفي (وإلا نسأل المستخدم للتوضيح). */
export function confidentMatch<S>(matches: ServiceMatch<S>[]): ServiceMatch<S> | null {
  const [top, second] = matches;
  if (!top || !top.complete) return null;
  if (second && second.complete && second.score === top.score) return null;
  return top;
}

export async function getService(id: string): Promise<ServiceWithDetails | null> {
  return prisma.service.findUnique({ where: { id }, include: serviceInclude });
}

export function getServiceCached(id: string): Promise<ServiceWithDetails | null> {
  return detailsCache(id, () => getService(id));
}

export async function listServices(categoryId?: string): Promise<ServiceWithDetails[]> {
  return prisma.service.findMany({
    where: categoryId ? { categoryId } : undefined,
    include: serviceInclude,
    orderBy: [{ popular: "desc" }, { titleAr: "asc" }],
  });
}

export const officeInclude = {
  city: true,
  categories: { include: { category: true } },
} satisfies Prisma.OfficeInclude;

export type OfficeWithCity = Prisma.OfficeGetPayload<{ include: typeof officeInclude }>;

/** الجهات الحكومية المرتبطة بقسم الخدمة — لا يخترعها الذكاء الاصطناعي. */
export async function officesForService(service: {
  categoryId: string;
}): Promise<OfficeWithCity[]> {
  return prisma.office.findMany({
    where: { categories: { some: { categoryId: service.categoryId } } },
    include: officeInclude,
    orderBy: { id: "asc" },
  });
}

export async function listOffices(): Promise<OfficeWithCity[]> {
  return prisma.office.findMany({ include: officeInclude, orderBy: { id: "asc" } });
}

export function officesForCategoryCached(categoryId: string): Promise<OfficeWithCity[]> {
  return officesCache(`category:${categoryId}`, () => officesForService({ categoryId }));
}

export function listOfficesCached(): Promise<OfficeWithCity[]> {
  return officesCache("all", listOffices);
}
