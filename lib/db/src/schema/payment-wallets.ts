import { pgTable, text, serial, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentWalletsTable = pgTable("payment_wallets", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  accountNumber: text("account_number").notNull(),
  instructions: text("instructions"),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
});
export const insertPaymentWalletSchema = createInsertSchema(paymentWalletsTable).omit({ id: true });
export type InsertPaymentWallet = z.infer<typeof insertPaymentWalletSchema>;
export type PaymentWallet = typeof paymentWalletsTable.$inferSelect;
