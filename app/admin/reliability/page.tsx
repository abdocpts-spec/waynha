import Link from "next/link";
import { REASON_LABEL } from "@/lib/admin/labels";
import { loadReliabilityRows } from "@/lib/admin/reliabilityData";
import { setCategoryInterval } from "@/lib/admin/reliability";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { RELIABILITY_META, type ReliabilityStatus } from "@/lib/reliability";

const STATUSES = Object.keys(RELIABILITY_META) as ReliabilityStatus[];
const PRIORITY = { high: ["عالية", "red"], medium: ["متوسطة", "amber"], low: ["منخفضة", "gray"] } as const;

/** إدارة موثوقية المعلومات: ما يحتاج مراجعة أولاً، وجدولة المراجعة حسب القسم. */
export default async function AdminReliability({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const [all, categories] = await Promise.all([
    loadReliabilityRows(),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, titleAr: true, icon: true, reviewIntervalDays: true } }),
  ]);
  const filter = STATUSES.includes(status as ReliabilityStatus) ? (status as ReliabilityStatus) : undefined;
  const attention = all.filter((r) => r.needsAttention && r.published);
  const rows = filter ? all.filter((r) => r.status === filter) : status === "all" ? all : all.filter((r) => r.needsAttention);
  const count = (s: ReliabilityStatus) => all.filter((r) => r.status === s).length;

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">إدارة موثوقية المعلومات</h1>
          <div className="date-text">
            الحالة تُحسب من المصادر والمراجعات المسجّلة فقط. نشر الخدمة أو تعديلها أو إضافة مصدر لا يمنحها «تمت المراجعة».
          </div>
        </div>
      </div>

      <div className="dash-card" style={{ marginBottom: 20 }} role="status">
        <strong>{attention.length} خدمات منشورة تحتاج إلى مراجعة</strong>
        <span className="list-item-sub"> (غير مراجَعة، قديمة، بلا مصدر، أو يقترب موعد مراجعتها)</span>
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <Link href="/admin/reliability" className={`chip${!status ? " active" : ""}`}>
          تحتاج انتباه ({all.filter((r) => r.needsAttention).length})
        </Link>
        {STATUSES.map((s) => (
          <Link key={s} href={`/admin/reliability?status=${s}`} className={`chip${filter === s ? " active" : ""}`}>
            {RELIABILITY_META[s].icon} {RELIABILITY_META[s].ar} ({count(s)})
          </Link>
        ))}
        <Link href="/admin/reliability?status=all" className={`chip${status === "all" ? " active" : ""}`}>
          الكل ({all.length})
        </Link>
      </div>

      <div className="admin-list">
        {rows.length === 0 && <div className="list-empty">لا توجد خدمات هنا.</div>}
        {rows.map((r) => {
          const m = RELIABILITY_META[r.status];
          return (
            <div key={r.id} className="dash-card admin-row">
              <div className="admin-row-main">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span className={`pill pill-${m.tone}`}>
                    {m.icon} {m.ar}
                  </span>
                  {r.dueSoon && <span className="pill pill-amber">⏳ يقترب موعد المراجعة</span>}
                  {r.priorityLabel && <span className={`pill pill-${PRIORITY[r.priorityLabel][1]}`}>أولوية {PRIORITY[r.priorityLabel][0]}</span>}
                  {!r.published && <span className="pill pill-gray">غير منشورة</span>}
                </div>
                <div className="list-item-title">
                  {r.icon} {r.titleAr}
                </div>
                <div className="list-item-sub">
                  {r.categoryAr} · المصادر: {r.sourceCount} · بلاغات مفتوحة: {r.openReports}
                  {r.lastReviewedAt && ` · آخر مراجعة: ${formatDate(r.lastReviewedAt.toISOString(), "ar")}${r.reviewerName ? ` (${r.reviewerName})` : ""}`}
                  {r.dueAt && ` · الموعد القادم: ${formatDate(r.dueAt.toISOString(), "ar")}`}
                </div>
                {r.reasons.length > 0 && <div className="list-item-sub">السبب: {r.reasons.map((x) => REASON_LABEL[x]).join("، ")}</div>}
              </div>
              <div className="admin-row-actions">
                <Link href={`/admin/reliability/${r.id}`} className="btn-option active">
                  مراجعة وإدارة
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dash-card" style={{ marginTop: 28 }}>
        <h2 className="dash-card-title" style={{ marginBottom: 6 }}>🗓️ مدة المراجعة الافتراضية حسب نوع الخدمة</h2>
        <p className="list-item-sub" style={{ marginTop: 0 }}>
          بعد هذه المدة من آخر مراجعة تظهر الخدمة «معلومات قديمة» (لا يعني ذلك أنها خاطئة، بل أنها تحتاج مراجعة).
        </p>
        <div className="list-group">
          {categories.map((c) => (
            <form key={c.id} action={setCategoryInterval} className="list-item" style={{ gap: 10, flexWrap: "wrap" }}>
              <input type="hidden" name="categoryId" value={c.id} />
              <span style={{ flex: 1 }}>
                {c.icon} {c.titleAr}
              </span>
              <input type="number" name="days" className="form-input" style={{ width: 110 }} min={7} max={1095} defaultValue={c.reviewIntervalDays} dir="ltr" aria-label={`مدة مراجعة ${c.titleAr} بالأيام`} />
              <span>يوم</span>
              <button type="submit" className="btn-option">
                حفظ
              </button>
            </form>
          ))}
        </div>
      </div>
    </>
  );
}
