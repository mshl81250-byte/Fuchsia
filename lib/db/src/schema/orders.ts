import { pgTable, text, serial, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  userId: integer("user_id"),
  status: text("status").notNull().default("received"),
  total: real("total").notNull(),
  subtotal: real("subtotal").notNull().default(0),
  deliveryFee: real("delivery_fee").notNull().default(500),
  discount: real("discount").notNull().default(0),
  deliveryAddress: text("delivery_address"),
  deliveryLatitude: real("delivery_latitude"),
  deliveryLongitude: real("delivery_longitude"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  paymentMethod: text("payment_method").notNull().default("cash_on_delivery"),
  paymentType: text("payment_type").notNull().default("cash_on_delivery"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  paymentWalletId: integer("payment_wallet_id"),
  paymentAmount: real("payment_amount").notNull().default(0),
  remainingAmount: real("remaining_amount").notNull().default(0),
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
