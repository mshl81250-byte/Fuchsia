import { mysqlTable, text, int, varchar, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** A reservation request is pending until the store confirms availability. */
export const tableReservationsTable = mysqlTable("table_reservations", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: int("user_id"),
  storeId: int("store_id").notNull(),
  reservationAt: timestamp("reservation_at").notNull(),
  partySize: int("party_size").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  occasion: text("occasion"),
  notes: text("notes"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTableReservationSchema = createInsertSchema(tableReservationsTable).omit({ id: true, createdAt: true });
export type InsertTableReservation = z.infer<typeof insertTableReservationSchema>;
export type TableReservation = typeof tableReservationsTable.$inferSelect;
