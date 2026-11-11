import type { OfficePayload, ServicePayload } from "@/lib/ai/contextBuilder";
import type { QuickReply } from "@/lib/search/clarify";

/** رسالة في المحادثة كما تُخزن في الواجهة وتُرسل للخادم. */
export type ChatRole = "user" | "assistant";

export type ChatTurn = {
  role: ChatRole;
  content: string;
};

/** البيانات المهيكلة القادمة من PostgreSQL (لا يخترعها الذكاء الاصطناعي). */
export type ChatStructuredData = {
  matchedService: ServicePayload | null;
  offices: OfficePayload[];
  quickReplies: QuickReply[];
  requiresClarification: boolean;
};

/** أول سطر في الاستجابة المتدفقة. */
export type ChatMeta = ChatStructuredData & { type: "meta" };

export type ChatDelta = { type: "delta"; text: string };
export type ChatDone = { type: "done" };
export type ChatError = { type: "error"; message: string };

export type ChatStreamEvent = ChatMeta | ChatDelta | ChatDone | ChatError;

/** استجابة غير متدفقة (عند إرسال stream: false) */
export type ChatJsonResponse = ChatStructuredData & { message: string };
