"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";

type Item = { href: string; icon: string; label: string; badge?: number; badgeHint?: string };

/** القائمة الجانبية للوحة الإدارة: مجموعات واضحة، سطر واحد لكل عنصر، وعدّادات للمهام المعلّقة. */
export default function AdminNav({
  name,
  newReports,
  pendingReviews,
  needsReview,
}: {
  name: string;
  newReports: number;
  pendingReviews: number;
  needsReview: number;
}) {
  const pathname = usePathname();
  const groups: { title: string; items: Item[] }[] = [
    { title: "الرئيسية", items: [{ href: "/admin", icon: "📊", label: "نظرة عامة" }] },
    {
      title: "المحتوى",
      items: [
        { href: "/admin/services", icon: "📋", label: "الخدمات" },
        { href: "/admin/offices", icon: "📍", label: "مواقع الجهات" },
      ],
    },
    {
      title: "المراجعة والمتابعة",
      items: [
        { href: "/admin/reliability", icon: "🛡️", label: "موثوقية المعلومات", badge: needsReview, badgeHint: "خدمات تحتاج مراجعة" },
        { href: "/admin/reviews", icon: "📎", label: "مستندات الزبائن", badge: pendingReviews, badgeHint: "طلبات بانتظار المراجعة" },
        { href: "/admin/reports", icon: "⚠️", label: "بلاغات المستخدمين", badge: newReports, badgeHint: "بلاغات جديدة" },
      ],
    },
    { title: "النظام", items: [{ href: "/admin/users", icon: "👥", label: "المستخدمون" }] },
  ];
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("");

  return (
    <aside className="sidebar admin-nav" aria-label="قائمة لوحة الإدارة">
      <div className="admin-who">
        <span className="admin-avatar" aria-hidden="true">{initials}</span>
        <span className="admin-who-text">
          <strong>{name}</strong>
          <small>مدير النظام</small>
        </span>
      </div>

      <nav className="admin-nav-groups">
        {groups.map((g) => (
          <div key={g.title} className="admin-nav-group">
            <div className="admin-nav-title">{g.title}</div>
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`admin-nav-item${isActive(item.href) ? " active" : ""}`}
                aria-current={isActive(item.href) ? "page" : undefined}
              >
                <span className="admin-nav-icon" aria-hidden="true">{item.icon}</span>
                <span className="admin-nav-label">{item.label}</span>
                {item.badge ? (
                  <span className="admin-nav-badge" title={item.badgeHint} aria-label={`${item.badge} ${item.badgeHint ?? ""}`}>
                    {item.badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="admin-nav-foot">
        <Link href="/" className="admin-nav-item subtle">
          <span className="admin-nav-icon" aria-hidden="true">🏠</span>
          <span className="admin-nav-label">العودة للموقع</span>
        </Link>
        <form action={logout}>
          <button type="submit" className="admin-nav-item subtle danger">
            <span className="admin-nav-icon" aria-hidden="true">🚪</span>
            <span className="admin-nav-label">تسجيل الخروج</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
