import { pgTable, text, serial, real, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const storesTable = pgTable("stores", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  logoUrl: text("logo_url").notNull(),
  coverUrl: text("cover_url"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isOpen: boolean("is_open").notNull().default(true),
  workingHours: text("working_hours"),
  phone: text("phone"),
  location: text("location"),
  isFeatured: boolean("is_featured").notNull().default(false),
  productCount: integer("product_count").notNull().default(0),
});

export const insertStoreSchema = createInsertSchema(storesTable).omit({ id: true });
export type InsertStore = z.infer<typeof insertStoreSchema>;
export type Store = typeof storesTable.$inferSelect;
