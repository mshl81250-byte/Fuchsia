import { db, notificationsTable } from "@workspace/db";

export async function createCustomerNotification(input: {
  sessionId: string;
  orderId?: number | null;
  type: string;
  title: string;
  message: string;
}) {
  if (!input.sessionId) return;
  await db.insert(notificationsTable).values({
    sessionId: input.sessionId,
    orderId: input.orderId ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
  });
}
