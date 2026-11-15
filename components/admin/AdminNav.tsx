"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/auth/actions";

/** القائمة الجانبية للوحة الإدارة. */
export default function AdminNav({ name, newReports }: { name: string; newReports: number }) {
  const pathname = usePathname();
  const items = [
    { href: "/admin", icon: "📊", label: "نظرة عامة" },
    { href: "/admin/services", icon: "📋", label: "الخدمات ومراحل الاعتماد" },
    { href: "/admin/reports", icon: "⚠️", label: "بلاغات المستخدمين", badge: newReports },
    { href: "/admin/users", icon: "👥", label: "المستخدمون" },
  ];
  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  return (
    <aside className="sidebar" aria-label="قائمة لوحة الإدارة">
      <div className="sidebar-menu">
        <div className="admin-who">
          <strong>🛡️ لوحة الإدارة</strong>
          <small>{name}</small>
        </div>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className={`sidebar-item${isActive(item.href) ? " active" : ""}`}>
            <span aria-hidden="true">{item.icon}</span> {item.label}
            {item.badge ? <span className="count-badge">{item.badge}</span> : null}
          </Link>
        ))}
        <Link href="/" className="sidebar-item">
          <span aria-hidden="true">🏠</span> العودة للموقع
        </Link>
        <form action={logout}>
          <button type="submit" className="sidebar-item sidebar-logout">
            <span aria-hidden="true">🚪</span> تسجيل الخروج
          </button>
        </form>
      </div>
    </aside>
  );
}
