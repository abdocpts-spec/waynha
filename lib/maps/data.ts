import "server-only";
import { prisma } from "@/lib/db";
import { publicOfficeWhere, visibleServiceWhere } from "@/lib/search/serviceSearch";
import type { Role } from "@/lib/generated/prisma/enums";
import type { MapData } from "@/lib/maps/types";

/** بيانات الخريطة العامة: جهات منشورة ومفعّلة فقط، وخدمات مرئية لهذا الزائر. */
export async function loadMapData(role?: Role | null): Promise<MapData> {
  const serviceWhere = visibleServiceWhere(role);
  const [offices, services, cities, categories] = await Promise.all([
    prisma.office.findMany({
      where: publicOfficeWhere,
      include: { services: { where: { service: serviceWhere }, select: { serviceId: true } } },
      orderBy: { id: "asc" },
    }),
    prisma.service.findMany({
      where: serviceWhere,
      select: { id: true, icon: true, titleAr: true, titleEn: true, categoryId: true },
      orderBy: [{ popular: "desc" }, { titleAr: "asc" }],
    }),
    prisma.city.findMany({ orderBy: { nameAr: "asc" } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, icon: true, titleAr: true, titleEn: true } }),
  ]);

  return {
    services,
    cities,
    categories,
    offices: offices.map((o) => ({
      id: o.id, nameAr: o.nameAr, nameEn: o.nameEn, departmentAr: o.departmentAr, departmentEn: o.departmentEn,
      cityId: o.cityId, addressAr: o.addressAr, addressEn: o.addressEn, phone: o.phone, lat: o.lat, lng: o.lng,
      openDays: o.openDays, openTime: o.openTime, closeTime: o.closeTime, temporarilyClosed: o.temporarilyClosed,
      isDemo: o.isDemo, mapsUrl: o.mapsUrl, serviceIds: o.services.map((s) => s.serviceId),
    })),
  };
}
