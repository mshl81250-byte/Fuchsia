import { db, orderStatusEventsTable } from "@workspace/db";

const STATUS_MESSAGES: Record<string, string> = {
  received: "تم استلام الطلب.",
  preparing: "بدأ تجهيز الطلب.",
  delivering: "الطلب في الطريق إلى عنوان التسليم.",
  delivered: "تم تسليم الطلب.",
  cancelled: "تم إلغاء الطلب.",
  rental_pending_confirmation: "تم استلام طلب الإيجار وبانتظار تأكيد التوفر.",
  rental_confirmed: "تم تأكيد توفر عناصر الإيجار.",
  rental_rejected: "نعتذر، عناصر الإيجار غير متوفرة في التاريخ المطلوب.",
  rental_preparing: "بدأ تجهيز عناصر الإيجار.",
  rental_out: "تم تسليم عناصر الإيجار للعميل.",
  rental_return_pending: "حان موعد ترتيب استرجاع عناصر الإيجار.",
  rental_returned: "تم استرجاع عناصر الإيجار.",
  rental_late: "تجاوز موعد استرجاع عناصر الإيجار.",
  rental_damaged: "تم تسجيل تلف ويجري مراجعة التأمين.",
};

export async function appendOrderStatusEvent(
  orderId: number,
  status: string,
  actorType: "system" | "admin" | "store" = "system",
): Promise<void> {
  await db.insert(orderStatusEventsTable).values({
    orderId,
    status,
    message: STATUS_MESSAGES[status] ?? "تم تحديث حالة الطلب.",
    actorType,
  });
}
