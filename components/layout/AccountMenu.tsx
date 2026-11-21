"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/lib/auth/actions";
import type { Lang } from "@/lib/i18n";
import { toggleLightDark } from "@/lib/preferences";

type MenuUser = { name: string; role: "CITIZEN" | "FOREIGNER" | "ADMIN" } | null;

/**
 * قائمة الحساب المنسدلة (للكمبيوتر): تجمع لوحة التحكم والإدارة والإعدادات والمظهر وتسجيل الخروج
 * في مكان واحد بدل أزرار متفرقة في الترويسة.
 */
export default function AccountMenu({
  lang,
  user,
  initials,
  attention,
}: {
  lang: Lang;
  user: MenuUser;
  initials: string;
  attention: number;
}) {
  const ar = lang === "ar";
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleOpen = () => {
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
    setOpen((v) => !v);
  };

  const toggleTheme = () => {
    toggleLightDark();
    setDark(document.documentElement.getAttribute("data-theme") === "dark");
  };

  const roleLabel =
    user?.role === "ADMIN"
      ? ar ? "مدير النظام" : "Administrator"
      : user?.role === "FOREIGNER"
        ? ar ? "أجنبي" : "Foreigner"
        : ar ? "مواطن" : "Citizen";

  return (
    <div className="acct" ref={root}>
      {user ? (
        <button
          type="button"
          className="account-chip acct-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ar ? "قائمة الحساب" : "Account menu"}
          onClick={toggleOpen}
        >
          {initials}
          {attention > 0 && <span className="chip-dot" />}
        </button>
      ) : (
        <button
          type="button"
          className="icon-btn acct-trigger"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ar ? "القائمة" : "Menu"}
          onClick={toggleOpen}
        >
          <span aria-hidden="true">☰</span>
        </button>
      )}

      {open && (
        <div className="acct-menu" role="menu">
          {user && (
            <div className="acct-head">
              <strong>{user.name}</strong>
              <small>{roleLabel}</small>
            </div>
          )}
          {!user && (
            <Link href="/welcome" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
              <span aria-hidden="true">🔑</span> {ar ? "تسجيل الدخول" : "Sign in"}
            </Link>
          )}
          {user && (
            <Link href="/dashboard" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
              <span aria-hidden="true">📊</span> {ar ? "لوحة التحكم" : "Dashboard"}
              {attention > 0 && <span className="acct-count">{attention}</span>}
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link href="/admin" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
              <span aria-hidden="true">🛡️</span> {ar ? "لوحة الإدارة" : "Admin panel"}
            </Link>
          )}
          <Link href="/settings" role="menuitem" className="acct-item" onClick={() => setOpen(false)}>
            <span aria-hidden="true">⚙️</span> {ar ? "الإعدادات والوصولية" : "Settings & accessibility"}
          </Link>
          <button type="button" role="menuitem" className="acct-item" onClick={toggleTheme}>
            <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>{" "}
            {dark ? (ar ? "المظهر النهاري" : "Light mode") : ar ? "المظهر الليلي" : "Dark mode"}
          </button>
          {user && (
            <form action={logout} className="acct-foot">
              <button type="submit" role="menuitem" className="acct-item acct-danger">
                <span aria-hidden="true">🚪</span> {ar ? "تسجيل الخروج" : "Sign out"}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
