import { mysqlTable, text, double, int, boolean, timestamp, date, varchar } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const cartItemsTable = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: text("session_id").notNull(),
  productId: int("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: double("price").notNull(),
  quantity: int("quantity").notNull().default(1),
  fulfillmentType: varchar("fulfillment_type", { length: 16 }).notNull().default("sale"),
  rentalStartDate: date("rental_start_date", { mode: "string" }),
  rentalDays: int("rental_days"),
  rentalEndDate: date("rental_end_date", { mode: "string" }),
  rentalDeposit: double("rental_deposit").notNull().default(0),
  imageUrl: text("image_url").notNull(),
  giftWrapping: boolean("gift_wrapping").notNull().default(false),
  giftMessage: text("gift_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({ id: true, createdAt: true });
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;
