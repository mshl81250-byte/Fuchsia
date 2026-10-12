import { and, desc, eq } from "drizzle-orm";
import {
  db,
  notificationsTable,
  orderItemsTable,
  ordersTable,
  usersTable,
} from "@workspace/db";
import { appendOrderStatusEvent } from "./order-tracking";
import { createCustomerNotification } from "./notifications";
import { logger } from "./logger";

const REMINDER_TYPE = "rental_return_due";
const OVERDUE_TYPE = "rental_return_overdue";
const ACTIVE_RENTAL_STATUSES = new Set(["rental_out", "rental_return_pending", "rental_late"]);
let running = false;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function notifyOnce(input: {
  order: typeof ordersTable.$inferSelect;
  type: string;
  title: string;
  message: string;
  email?: string | null;
}) {
  const [existing] = await db.select({ id: notificationsTable.id })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.orderId, input.order.id), eq(notificationsTable.type, input.type)))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(1);
  if (existing) return false;
  await createCustomerNotification({
    sessionId: input.order.sessionId,
    orderId: input.order.id,
    type: input.type,
    title: input.title,
    message: input.message,
    customerName: input.order.customerName,
    phone: input.order.customerPhone,
    email: input.email,
  });
  return true;
}

export async function runRentalReturnReminders(): Promise<void> {
  if (running) return;
  running = true;
  try {
    const today = todayIso();
    const tomorrow = addDays(today, 1);
    const orders = await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(500);
    for (const order of orders) {
      if (!ACTIVE_RENTAL_STATUSES.has(order.status)) continue;
      const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, order.id));
      const rentalItems = items.filter((item) => item.fulfillmentType === "rental" && item.rentalEndDate);
      if (rentalItems.length === 0) continue;
      const returnDate = rentalItems.map((item) => item.rentalEndDate!).sort().at(-1)!;
      const [customer] = order.userId
        ? await db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, order.userId))
        : [];

      if (returnDate === tomorrow) {
        await notifyOnce({
          order,
          type: REMINDER_TYPE,
          title: "موعد استرجاع الإيجار غدًا",
          message: `نذكّركم بأن موعد استرجاع عناصر الإيجار للطلب رقم ${order.id} هو غدًا (${returnDate}). يرجى تجهيز الكوش أو الطاولات للاستلام.`,
          email: customer?.email,
        });
      } else if (returnDate < today) {
        if (order.status !== "rental_late") {
          await db.update(ordersTable).set({ status: "rental_late" }).where(eq(ordersTable.id, order.id));
          await appendOrderStatusEvent(order.id, "rental_late", "system");
        }
        await notifyOnce({
          order: { ...order, status: "rental_late" },
          type: OVERDUE_TYPE,
          title: "تأخر استرجاع الإيجار",
          message: `تجاوز موعد استرجاع عناصر الإيجار للطلب رقم ${order.id} (${returnDate}). يرجى التواصل مع فوشيا لترتيب الاسترجاع.`,
          email: customer?.email,
        });
      }
    }
  } catch (error) {
    logger.error({ err: error }, "Rental return reminder worker failed");
  } finally {
    running = false;
  }
}

export function startRentalReturnReminderWorker(): void {
  void runRentalReturnReminders();
  const intervalMs = 15 * 60 * 1000;
  setInterval(() => void runRentalReturnReminders(), intervalMs);
}
