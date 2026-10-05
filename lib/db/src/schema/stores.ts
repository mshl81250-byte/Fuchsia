import { mysqlTable, text, double, int, boolean } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storesTable = mysqlTable("stores", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  logoUrl: text("logo_url").notNull(),
  coverUrl: text("cover_url"),
  rating: double("rating").notNull().default(0),
  reviewCount: int("review_count").notNull().default(0),
  isOpen: boolean("is_open").notNull().default(true),
  workingHours: text("working_hours"),
  phone: text("phone"),
  location: text("location"),
  isFeatured: boolean("is_featured").notNull().default(false),
  productCount: int("product_count").notNull().default(0),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
