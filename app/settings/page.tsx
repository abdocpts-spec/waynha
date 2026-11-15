import SettingsPanel, { type SectionId } from "@/components/account/SettingsPanel";
import { prisma } from "@/lib/db";
import { t } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth/session";
import { getLang } from "@/lib/i18n.server";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "الإعدادات والوصولية | وينها",
};

const SECTIONS: SectionId[] = ["accessibility", "appearance", "account", "language"];

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const [lang, user] = await Promise.all([getLang(), getCurrentUser()]);
  const { section } = await searchParams;
  const initialSection = SECTIONS.includes(section as SectionId) ? (section as SectionId) : "accessibility";
  const cities = await prisma.city.findMany({ orderBy: { nameAr: "asc" }, select: { id: true, nameAr: true, nameEn: true } });

  return (
    <main>
      <div className="page-header" style={{ marginBottom: 40 }}>
        <div className="container">
          <h1 className="page-title">{t(lang, "الإعدادات والوصولية", "Settings and accessibility")}</h1>
        </div>
      </div>
      <div className="container" style={{ marginBottom: 60 }}>
        <SettingsPanel key={initialSection} lang={lang} cities={cities} initialSection={initialSection}
          account={user ? { name: user.name, login: user.login, cityId: user.cityId, role: user.role } : null}
        />
      </div>
    </main>
  );
}
