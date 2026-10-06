import { db, orderStatusEventsTable } from "@workspace/db";

const STATUS_MESSAGES: Record<string, string> = {
  received: "تم استلام الطلب.",
  preparing: "بدأ تجهيز الطلب.",
  delivering: "الطلب في الطريق إلى عنوان التسليم.",
  delivered: "تم تسليم الطلب.",
  cancelled: "تم إلغاء الطلب.",
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
