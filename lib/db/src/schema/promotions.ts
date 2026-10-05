import { mysqlTable, text, varchar, double, boolean, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const bannersTable = mysqlTable("banners", {
  id: int("id").autoincrement().primaryKey(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  imageUrl: text("image_url").notNull(),
  linkType: text("link_type"),
  linkId: int("link_id"),
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: int("sort_order").notNull().default(0),
});

export const couponsTable = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 32 }).notNull().default("percentage"),
  discountValue: double("discount_value").notNull(),
  minCartTotal: double("min_cart_total"),
  isActive: boolean("is_active").notNull().default(true),
  usageLimit: int("usage_limit"),
  usageCount: int("usage_count").notNull().default(0),
  expiresAt: timestamp("expires_at"),
});

export const insertBannerSchema = createInsertSchema(bannersTable).omit({ id: true });
export const insertCouponSchema = createInsertSchema(couponsTable).omit({ id: true });
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof bannersTable.$inferSelect;
export type Coupon = typeof couponsTable.$inferSelect;
