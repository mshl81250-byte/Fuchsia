import { mysqlTable, text, varchar, double, int, boolean, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  price: double("price").notNull(),
  discountPrice: double("discount_price"),
  categoryId: int("category_id").notNull(),
  storeId: int("store_id").notNull(),
  imageUrl: text("image_url").notNull(),
  images: varchar("images", { length: 4000 }).notNull().default("[]"),
  videoUrl: text("video_url"),
  brand: text("brand"),
  inStock: boolean("in_stock").notNull().default(true),
  stockQuantity: int("stock_quantity"),
  rating: double("rating").notNull().default(0),
  reviewCount: int("review_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  deliveryDays: int("delivery_days"),
  tags: varchar("tags", { length: 4000 }).notNull().default("[]"),
  occasionTags: varchar("occasion_tags", { length: 4000 }).notNull().default("[]"),
  views: int("views").notNull().default(0),
  salesCount: int("sales_count").notNull().default(0),
  offerEndsAt: timestamp("offer_ends_at"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
