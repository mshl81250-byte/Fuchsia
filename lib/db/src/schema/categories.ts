import { mysqlTable, text, varchar, int } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  icon: varchar("icon", { length: 64 }).notNull().default("sparkles"),
  color: text("color"),
  imageUrl: text("image_url"),
  productCount: int("product_count").notNull().default(0),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;
