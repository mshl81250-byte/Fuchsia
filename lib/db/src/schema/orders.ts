import { mysqlTable, text, varchar, double, int, boolean, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: int("user_id"),
  status: varchar("status", { length: 64 }).notNull().default("received"),
  total: double("total").notNull(),
  subtotal: double("subtotal").notNull().default(0),
  deliveryFee: double("delivery_fee").notNull().default(500),
  discount: double("discount").notNull().default(0),
  deliveryAddress: text("delivery_address"),
  deliveryLatitude: double("delivery_latitude"),
  deliveryLongitude: double("delivery_longitude"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  paymentMethod: varchar("payment_method", { length: 64 }).notNull().default("cash_on_delivery"),
  paymentType: varchar("payment_type", { length: 64 }).notNull().default("cash_on_delivery"),
  paymentStatus: varchar("payment_status", { length: 64 }).notNull().default("unpaid"),
  paymentWalletId: int("payment_wallet_id"),
  paymentAmount: double("payment_amount").notNull().default(0),
  remainingAmount: double("remaining_amount").notNull().default(0),
  transactionReference: text("transaction_reference"),
  paymentReceiptUrl: text("payment_receipt_url"),
  couponCode: text("coupon_code"),
  notes: text("notes"),
  isGift: boolean("is_gift").notNull().default(false),
  giftRecipientName: text("gift_recipient_name"),
  giftMessage: text("gift_message"),
  giftCardStyle: text("gift_card_style"),
  hidePrice: boolean("hide_price").notNull().default(false),
  scheduledDelivery: timestamp("scheduled_delivery"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const orderItemsTable = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("order_id").notNull(),
  productId: int("product_id").notNull(),
  productName: text("product_name").notNull(),
  price: double("price").notNull(),
  quantity: int("quantity").notNull(),
  imageUrl: text("image_url").notNull(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
