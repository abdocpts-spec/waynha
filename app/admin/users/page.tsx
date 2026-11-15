import Link from "next/link";
import { setUserActive, setUserRole } from "@/lib/admin/actions";
import { ROLE } from "@/lib/admin/labels";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";
import type { Role } from "@/lib/generated/prisma/enums";

const ROLES = Object.keys(ROLE) as Role[];

export default async function AdminUsers({ searchParams }: { searchParams: Promise<{ role?: string }> }) {
  const admin = await requireAdmin();
  const { role } = await searchParams;
  const filter = ROLES.includes(role as Role) ? (role as Role) : undefined;
  const users = await prisma.user.findMany({
    where: filter ? { role: filter } : undefined,
    select: { id: true, name: true, login: true, role: true, active: true, createdAt: true, lastLoginAt: true, _count: { select: { reports: true } } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">المستخدمون</h1>
          <div className="date-text">الرقم الوطني للمواطن ورقم الإقامة للأجنبي يُحفظان كبصمة مشفّرة فقط، وكلمات المرور مشفّرة؛ لا يراها أحد، حتى الأدمن. لا نخزّن أرقام جوازات.</div>
        </div>
      </div>

      <div className="chip-row" style={{ marginBottom: 20 }}>
        <Link href="/admin/users" className={`chip${!filter ? " active" : ""}`}>
          الكل
        </Link>
        {ROLES.map((r) => (
          <Link key={r} href={`/admin/users?role=${r}`} className={`chip${filter === r ? " active" : ""}`}>
            {ROLE[r]}
          </Link>
        ))}
      </div>

      <div className="admin-list">
        {users.length === 0 && <div className="list-empty">لا يوجد مستخدمون.</div>}
        {users.map((u) => {
          const self = u.id === admin.id;
          return (
            <div key={u.id} className="dash-card admin-row">
              <div className="admin-row-main">
                <div className="list-item-title">
                  {u.name} {self && <span className="pill pill-blue">أنت</span>} {!u.active && <span className="pill pill-red">موقوف</span>}
                </div>
                <div className="list-item-sub">
                  <span dir="ltr">{u.login}</span> · {ROLE[u.role]} · سجّل في {formatDate(u.createdAt.toISOString(), "ar")}
                  {u.lastLoginAt && ` · آخر دخول ${formatDate(u.lastLoginAt.toISOString(), "ar")}`}
                  {u._count.reports > 0 && ` · ${u._count.reports} بلاغ`}
                </div>
              </div>
              {!self && (
                <div className="admin-row-actions">
                  <form action={setUserRole} className="inline-form">
                    <input type="hidden" name="id" value={u.id} />
                    <select name="role" defaultValue={u.role} className="setting-input admin-select" aria-label="نوع الحساب">
                      {ROLES.map((r) => (
                        <option key={r} value={r}>
                          {ROLE[r]}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="btn-option">
                      تغيير النوع
                    </button>
                  </form>
                  <form action={setUserActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <input type="hidden" name="active" value={u.active ? "0" : "1"} />
                    <button type="submit" className={`btn-option${u.active ? " btn-danger-outline" : ""}`}>
                      {u.active ? "إيقاف الحساب" : "تفعيل الحساب"}
                    </button>
                  </form>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
