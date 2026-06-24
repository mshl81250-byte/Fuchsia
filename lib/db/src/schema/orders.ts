import { pgTable, text, serial, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  status: text("status").notNull().default("received"),
  total: real("total").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(500),
  discount: real("discount").notNull().default(0),
  deliveryAddress: text("delivery_address"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  paymentMethod: text("payment_method").notNull().default("cash_on_delivery"),
  couponCode: text("coupon_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItemsTable = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: real("price").notNull(),
  quantity: integer("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
