import { mysqlTable, text, boolean, int } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentWalletsTable = mysqlTable("payment_wallets", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  accountNumber: text("account_number").notNull(),
  instructions: text("instructions"),
  iconUrl: text("icon_url"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
});
export const insertPaymentWalletSchema = createInsertSchema(paymentWalletsTable).omit({ id: true });
export type InsertPaymentWallet = z.infer<typeof insertPaymentWalletSchema>;
export type PaymentWallet = typeof paymentWalletsTable.$inferSelect;
