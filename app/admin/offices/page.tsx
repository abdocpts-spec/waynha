import Link from "next/link";
import { deleteOffice, setOfficeActive, setOfficeStatus } from "@/lib/admin/offices";
import { SERVICE_STATUS } from "@/lib/admin/labels";
import { prisma } from "@/lib/db";

/** إدارة مواقع الجهات: إضافة وتعديل ونشر وتعطيل وحذف. المواطن والأجنبي لا يصلان إلى هنا. */
export default async function AdminOffices({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const offices = await prisma.office.findMany({
    include: { city: true, _count: { select: { services: true } } },
    orderBy: [{ status: "asc" }, { nameAr: "asc" }],
  });

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">مواقع الجهات</h1>
          <div className="date-text">الجهة الجديدة تبدأ مسودة ولا تظهر على الخريطة حتى تُنشر. التعطيل يُخفيها بدون حذف.</div>
        </div>
        <Link href="/admin/offices/new" className="btn-primary">
          + إضافة جهة
        </Link>
      </div>

      {saved && (
        <p className="auth-privacy" role="status" style={{ textAlign: "start", marginTop: 0, marginBottom: 16 }}>
          ✓ تم حفظ الجهة «{saved}».
        </p>
      )}

      <div className="admin-list">
        {offices.length === 0 && <div className="list-empty">لا توجد جهات.</div>}
        {offices.map((o) => {
          const st = SERVICE_STATUS[o.status];
          return (
            <div key={o.id} className="dash-card admin-row" style={{ alignItems: "stretch" }}>
              <div className="admin-row-main">
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span className={`pill pill-${st.tone}`}>{st.label}</span>
                  {!o.active && <span className="pill pill-red">معطّلة</span>}
                  {o.isDemo && <span className="pill pill-gray">بيانات تجريبية</span>}
                </div>
                <div className="list-item-title">{o.nameAr}</div>
                <div className="list-item-sub" dir="ltr" style={{ textAlign: "start" }}>{o.nameEn}</div>
                <div className="list-item-sub">
                  {o.city.nameAr} — {o._count.services} خدمة — {o.lat.toFixed(4)}, {o.lng.toFixed(4)}
                </div>
              </div>
              <div className="admin-row-actions" style={{ flexDirection: "column", alignItems: "stretch", minWidth: 200 }}>
                <Link href={`/admin/offices/${o.id}`} className="btn-option active" style={{ textAlign: "center" }}>
                  ✎ تعديل
                </Link>
                {o.status !== "PUBLISHED" ? (
                  <form action={setOfficeStatus}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value={o.status === "DRAFT" ? "IN_REVIEW" : "PUBLISHED"} />
                    <button type="submit" className="btn-option" style={{ width: "100%" }}>
                      {o.status === "DRAFT" ? "إرسال للمراجعة" : "اعتماد ونشر ✓"}
                    </button>
                  </form>
                ) : (
                  <form action={setOfficeStatus}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="status" value="DRAFT" />
                    <button type="submit" className="btn-option" style={{ width: "100%" }}>
                      إيقاف النشر (مسودة)
                    </button>
                  </form>
                )}
                <form action={setOfficeActive}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="active" value={o.active ? "0" : "1"} />
                  <button type="submit" className="btn-option" style={{ width: "100%" }}>
                    {o.active ? "تعطيل" : "إعادة تفعيل"}
                  </button>
                </form>
                <form action={deleteOffice}>
                  <input type="hidden" name="id" value={o.id} />
                  <button type="submit" className="btn-option" style={{ width: "100%", color: "var(--danger, #b91c1c)" }}>
                    🗑 حذف نهائي
                  </button>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
