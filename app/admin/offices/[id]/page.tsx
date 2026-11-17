import Link from "next/link";
import { notFound } from "next/navigation";
import OfficeEditor, { type OfficeDraft } from "@/components/admin/OfficeEditor";
import { prisma } from "@/lib/db";

export default async function EditOffice({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const [cities, services] = await Promise.all([
    prisma.city.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.service.findMany({
      select: { id: true, icon: true, titleAr: true, status: true },
      orderBy: [{ categoryId: "asc" }, { titleAr: "asc" }],
    }),
  ]);

  let draft: OfficeDraft;
  if (isNew) {
    draft = {
      id: "", nameAr: "", nameEn: "", departmentAr: "", departmentEn: "", cityId: cities[0]?.id ?? "",
      addressAr: "", addressEn: "", phone: "", lat: "", lng: "", mapsUrl: "",
      openDays: [0, 1, 2, 3, 4], openTime: "", closeTime: "",
      temporarilyClosed: false, active: true, isDemo: false, status: "DRAFT", serviceIds: [],
    };
  } else {
    const num = Number(id);
    const o = Number.isInteger(num)
      ? await prisma.office.findUnique({ where: { id: num }, include: { services: { select: { serviceId: true } } } })
      : null;
    if (!o) notFound();
    draft = {
      id: String(o.id), nameAr: o.nameAr, nameEn: o.nameEn, departmentAr: o.departmentAr, departmentEn: o.departmentEn,
      cityId: o.cityId, addressAr: o.addressAr, addressEn: o.addressEn, phone: o.phone,
      lat: String(o.lat), lng: String(o.lng), mapsUrl: o.mapsUrl ?? "",
      openDays: o.openDays, openTime: o.openTime, closeTime: o.closeTime,
      temporarilyClosed: o.temporarilyClosed, active: o.active, isDemo: o.isDemo, status: o.status === "NEEDS_UPDATE" ? "PUBLISHED" : o.status,
      serviceIds: o.services.map((s) => s.serviceId),
    };
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">{isNew ? "إضافة جهة جديدة" : `تعديل: ${draft.nameAr}`}</h1>
          <div className="date-text">
            <Link href="/admin/offices">← كل الجهات</Link>
          </div>
        </div>
      </div>
      <OfficeEditor
        draft={draft}
        cities={cities}
        services={services.map((s) => ({ id: s.id, icon: s.icon, titleAr: s.titleAr }))}
        googleKey={process.env.GOOGLE_MAPS_API_KEY || undefined}
      />
    </>
  );
}
