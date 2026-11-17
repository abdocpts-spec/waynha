"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { inLibya } from "@/lib/maps/types";
import { normalizeText } from "@/lib/search/normalize";
import { clearServiceCaches } from "@/lib/search/serviceSearch";

/**
 * إدارة مواقع الجهات. كل إجراء يتحقق من صلاحية الأدمن على الخادم؛
 * المواطن والأجنبي لا يملكون أي مسار لتعديل المواقع.
 */

export type OfficeFormState = { error?: string } | undefined;

const STATUSES = ["DRAFT", "IN_REVIEW", "PUBLISHED"] as const;
const time = z.string().trim().regex(/^([01]\d|2[0-3]):[0-5]\d$/).or(z.literal(""));
const MAPS_HOST = /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)/i;

const schema = z.object({
  nameAr: z.string().trim().min(2).max(160),
  nameEn: z.string().trim().min(2).max(160),
  departmentAr: z.string().trim().max(200).default(""),
  departmentEn: z.string().trim().max(200).default(""),
  addressAr: z.string().trim().max(300).default(""),
  addressEn: z.string().trim().max(300).default(""),
  phone: z.string().trim().max(40).regex(/^[0-9+\-\s()]*$/).default(""),
  lat: z.coerce.number(),
  lng: z.coerce.number(),
  mapsUrl: z.string().trim().max(500).default(""),
  openTime: time.default(""),
  closeTime: time.default(""),
  status: z.enum(STATUSES),
});

function refresh() {
  clearServiceCaches();
  revalidatePath("/offices");
  revalidatePath("/admin/offices");
  revalidatePath("/", "layout");
}

export async function saveOffice(_prev: OfficeFormState, form: FormData): Promise<OfficeFormState> {
  await requireAdmin();
  const idRaw = String(form.get("id") ?? "");
  const id = idRaw ? Number(idRaw) : null;
  if (idRaw && !Number.isInteger(id)) return { error: "معرّف غير صحيح." };

  const flat = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = schema.safeParse(flat);
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "");
    if (field.startsWith("name")) return { error: "اكتب اسم الجهة بالعربي والإنجليزي." };
    if (field === "lat" || field === "lng") return { error: "حدّد الموقع بالنقر على الخريطة أو أدخل خط العرض والطول." };
    if (field === "phone") return { error: "رقم الهاتف يحتوي أرقاماً وعلامات + - ( ) فقط." };
    if (field.endsWith("Time")) return { error: "اكتب الوقت بصيغة 08:30." };
    return { error: `تأكد من الحقل: ${field}` };
  }
  const d = parsed.data;
  if (!inLibya({ lat: d.lat, lng: d.lng })) return { error: "الإحداثيات خارج ليبيا. تأكد من النقطة على الخريطة." };
  if (d.mapsUrl && !MAPS_HOST.test(d.mapsUrl)) return { error: "رابط Google Maps غير صحيح (يجب أن يبدأ بـ https://www.google.com/maps أو maps.app.goo.gl)." };
  if (Boolean(d.openTime) !== Boolean(d.closeTime)) return { error: "أدخل وقت الفتح والإغلاق معاً أو اتركهما فارغين." };

  const openDays = [...new Set(form.getAll("openDays").map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort();

  // المدينة: موجودة أو جديدة
  let cityId = String(form.get("cityId") ?? "");
  const newAr = String(form.get("newCityAr") ?? "").trim();
  const newEn = String(form.get("newCityEn") ?? "").trim();
  if (cityId === "__new") {
    if (newAr.length < 2 || newEn.length < 2) return { error: "اكتب اسم المدينة الجديدة بالعربي والإنجليزي." };
    const city = await prisma.city.create({ data: { id: `c${Date.now().toString(36)}`, nameAr: newAr.slice(0, 80), nameEn: newEn.slice(0, 80) } });
    cityId = city.id;
  }
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) return { error: "اختر المدينة." };

  const requested = [...new Set(form.getAll("serviceIds").map(String))];
  const validServices = await prisma.service.findMany({ where: { id: { in: requested } }, select: { id: true } });
  const serviceIds = validServices.map((s) => s.id);

  const data = {
    nameAr: d.nameAr, nameEn: d.nameEn, departmentAr: d.departmentAr, departmentEn: d.departmentEn,
    addressAr: d.addressAr, addressEn: d.addressEn, phone: d.phone, cityId,
    lat: d.lat, lng: d.lng, mapsUrl: d.mapsUrl || null,
    openDays, openTime: d.openTime, closeTime: d.closeTime,
    temporarilyClosed: form.get("temporarilyClosed") === "on",
    active: form.get("active") === "on",
    isDemo: form.get("isDemo") === "on",
    status: d.status,
    searchText: normalizeText([d.nameAr, d.nameEn, d.departmentAr, d.departmentEn, d.addressAr, d.addressEn, city.nameAr, city.nameEn].join(" ")),
  };

  const saved = await prisma.$transaction(async (tx) => {
    if (id === null) {
      return tx.office.create({ data: { ...data, services: { create: serviceIds.map((serviceId) => ({ serviceId })) } } });
    }
    await tx.officeService.deleteMany({ where: { officeId: id } });
    await tx.officeService.createMany({ data: serviceIds.map((serviceId) => ({ officeId: id, serviceId })) });
    return tx.office.update({ where: { id }, data });
  });

  refresh();
  redirect(`/admin/offices?saved=${encodeURIComponent(saved.nameAr)}`);
}

export async function setOfficeActive(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.office.update({ where: { id }, data: { active: form.get("active") === "1" } });
  refresh();
}

export async function setOfficeStatus(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  const status = z.enum(STATUSES).parse(form.get("status"));
  if (!Number.isInteger(id)) return;
  await prisma.office.update({ where: { id }, data: { status } });
  refresh();
}

export async function deleteOffice(form: FormData) {
  await requireAdmin();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await prisma.office.deleteMany({ where: { id } });
  refresh();
}
