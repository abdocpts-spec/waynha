import Link from "next/link";
import { reviewProcedure } from "@/lib/admin/actions";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { ReviewStatus } from "@/lib/generated/prisma/enums";

const LABEL: Record<ReviewStatus, { text: string; cls: string }> = {
  NONE: { text: "لم تُرسل", cls: "pill-gray" },
  PENDING: { text: "بانتظار المراجعة", cls: "pill-amber" },
  NEEDS_CHANGES: { text: "طُلب تعديل", cls: "pill-red" },
  APPROVED: { text: "تمت المراجعة", cls: "pill-green" },
};
const FILTERS: ReviewStatus[] = ["PENDING", "NEEDS_CHANGES", "APPROVED"];

const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** مراجعة مستندات الزبائن: قبول الاكتمال أو طلب تعديل. (مراجعة وينها وليست قبولاً رسمياً من الجهة.) */
export default async function AdminReviews({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = FILTERS.includes(status as ReviewStatus) ? (status as ReviewStatus) : "PENDING";

  const rows = await prisma.procedureProgress.findMany({
    where: { reviewStatus: filter },
    include: {
      user: { select: { name: true, role: true } },
      service: { select: { titleAr: true, icon: true, documents: { select: { textAr: true }, orderBy: { position: "asc" } } } },
      files: { orderBy: { id: "asc" }, select: { id: true, name: true, size: true } },
    },
    orderBy: { submittedAt: "asc" },
    take: 100,
  });

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">مراجعة مستندات الزبائن</h1>
          <div className="date-text">
            راجع اكتمال المستندات حسب دليل الخدمة. القبول يفتح للزبون المرحلة التالية، وهو ليس قبولاً رسمياً من الجهة الحكومية.
          </div>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        {FILTERS.map((s) => (
          <Link key={s} href={`/admin/reviews?status=${s}`} className={`chip${filter === s ? " active" : ""}`}>
            {LABEL[s].text}
          </Link>
        ))}
      </div>

      <div className="admin-list">
        {rows.length === 0 && <div className="list-empty">لا توجد طلبات هنا.</div>}
        {rows.map((r) => (
          <div key={r.id} className="dash-card admin-row" style={{ alignItems: "stretch" }}>
            <div className="admin-row-main">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                <span className={`pill ${LABEL[r.reviewStatus].cls}`}>{LABEL[r.reviewStatus].text}</span>
                <span className="list-item-sub">
                  {r.submittedAt ? `أُرسل ${formatDate(r.submittedAt.toISOString(), "ar")}` : ""}
                </span>
              </div>
              <div className="list-item-title">
                {r.service.icon} {r.service.titleAr}
              </div>
              <div className="list-item-sub">
                الزبون: {r.user.name} ({r.user.role === "FOREIGNER" ? "أجنبي" : "مواطن"})
              </div>

              <details style={{ margin: "10px 0" }}>
                <summary style={{ cursor: "pointer", fontWeight: 700 }}>المستندات المطلوبة في الدليل ({r.service.documents.length})</summary>
                <ul style={{ margin: "6px 0 0", paddingInlineStart: 20 }}>
                  {r.service.documents.map((d) => (
                    <li key={d.textAr}>{d.textAr}</li>
                  ))}
                </ul>
              </details>

              <div className="review-files">
                {r.files.map((f) => (
                  <a key={f.id} href={`/api/procedure-files/${f.id}`} target="_blank" rel="noopener noreferrer">
                    📄 {f.name} <small>({kb(f.size)})</small>
                  </a>
                ))}
                {r.files.length === 0 && <span className="list-item-sub">لا ملفات.</span>}
              </div>
              {r.reviewStatus === "NEEDS_CHANGES" && r.reviewNote && (
                <p className="report-message">ملاحظتك للزبون: {r.reviewNote}</p>
              )}
            </div>

            {r.reviewStatus === "PENDING" && (
              <div className="admin-row-actions" style={{ flexDirection: "column", alignItems: "stretch", minWidth: 260 }}>
                <form action={reviewProcedure} className="inline-form" style={{ display: "block" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="APPROVE" />
                  <button type="submit" className="btn-option active" style={{ width: "100%" }}>
                    ✓ قبول (المستندات مكتملة)
                  </button>
                </form>
                <form action={reviewProcedure} className="inline-form" style={{ display: "block" }}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="decision" value="CHANGES" />
                  <textarea
                    name="note"
                    className="setting-input"
                    rows={2}
                    required
                    minLength={3}
                    maxLength={500}
                    placeholder="ما المطلوب تعديله؟ (تصل للزبون)"
                    style={{ width: "100%", marginBottom: 6 }}
                  />
                  <button type="submit" className="btn-option" style={{ width: "100%" }}>
                    ↩ إرسال طلب تعديل للزبون
                  </button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
