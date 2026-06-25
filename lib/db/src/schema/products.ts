import { pgTable, text, serial, real, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  nameAr: text("name_ar").notNull(),
  nameEn: text("name_en"),
  description: text("description"),
  price: real("price").notNull(),
  discountPrice: real("discount_price"),
  categoryId: integer("category_id").notNull(),
  storeId: integer("store_id").notNull(),
  imageUrl: text("image_url").notNull(),
  images: text("images").notNull().default("[]"),
  videoUrl: text("video_url"),
  brand: text("brand"),
  inStock: boolean("in_stock").notNull().default(true),
  stockQuantity: integer("stock_quantity"),
  rating: real("rating").notNull().default(0),
  reviewCount: integer("review_count").notNull().default(0),
  isFeatured: boolean("is_featured").notNull().default(false),
  isNew: boolean("is_new").notNull().default(false),
  deliveryDays: integer("delivery_days"),
  tags: text("tags").notNull().default("[]"),
  occasionTags: text("occasion_tags").notNull().default("[]"),
  views: integer("views").notNull().default(0),
  salesCount: integer("sales_count").notNull().default(0),
  offerEndsAt: timestamp("offer_ends_at"),
});

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
