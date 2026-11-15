import Link from "next/link";
import { notFound } from "next/navigation";
import ServiceEditor, { type ServiceDraft } from "@/components/admin/ServiceEditor";
import { prisma } from "@/lib/db";

const join = (rows: { textAr: string; textEn: string }[], key: "textAr" | "textEn") => rows.map((r) => r[key]).join("\n");

export default async function EditService({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isNew = id === "new";
  const categories = await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, titleAr: true } });

  let draft: ServiceDraft;
  if (isNew) {
    draft = {
      id: "", categoryId: categories[0]?.id ?? "", icon: "📄", audience: "ALL",
      titleAr: "", titleEn: "", shortDescAr: "", shortDescEn: "", departmentAr: "", departmentEn: "",
      feesAr: "", feesEn: "", durationAr: "", durationEn: "", hoursAr: "", hoursEn: "",
      eligibilityAr: "", eligibilityEn: "", sourceAr: "", sourceEn: "",
      stepsAr: "", stepsEn: "", documentsAr: "", documentsEn: "", notesAr: "", notesEn: "", keywords: "",
    };
  } else {
    const s = await prisma.service.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { position: "asc" } },
        documents: { orderBy: { position: "asc" } },
        notes: { orderBy: { position: "asc" } },
        keywords: true,
      },
    });
    if (!s) notFound();
    draft = {
      id: s.id, categoryId: s.categoryId, icon: s.icon, audience: s.audience,
      titleAr: s.titleAr, titleEn: s.titleEn, shortDescAr: s.shortDescAr, shortDescEn: s.shortDescEn,
      departmentAr: s.departmentAr, departmentEn: s.departmentEn, feesAr: s.feesAr, feesEn: s.feesEn,
      durationAr: s.durationAr, durationEn: s.durationEn, hoursAr: s.hoursAr, hoursEn: s.hoursEn,
      eligibilityAr: s.eligibilityAr, eligibilityEn: s.eligibilityEn, sourceAr: s.sourceAr, sourceEn: s.sourceEn,
      stepsAr: join(s.steps, "textAr"), stepsEn: join(s.steps, "textEn"),
      documentsAr: join(s.documents, "textAr"), documentsEn: join(s.documents, "textEn"),
      notesAr: join(s.notes, "textAr"), notesEn: join(s.notes, "textEn"),
      keywords: s.keywords.map((k) => k.keyword).join("\n"),
    };
  }

  return (
    <>
      <div className="dash-header">
        <div>
          <h1 className="welcome-text">{isNew ? "إضافة خدمة جديدة" : `تعديل: ${draft.titleAr}`}</h1>
          <div className="date-text">
            {isNew
              ? "الخدمة الجديدة تُحفظ مسودة، ثم ترسلها للمراجعة وتعتمدها من قائمة الخدمات."
              : "التعديل لا يغيّر مرحلة الاعتماد. إن غيّرت معلومة جوهرية، أرسلها للمراجعة من قائمة الخدمات."}
          </div>
        </div>
        <Link href="/admin/services" className="btn-outline">
          ← رجوع للقائمة
        </Link>
      </div>
      <ServiceEditor draft={draft} isNew={isNew} categories={categories} />
    </>
  );
}
