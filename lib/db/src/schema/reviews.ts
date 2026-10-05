import { mysqlTable, text, varchar, int, timestamp } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const reviewsTable = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("product_id").notNull(),
  customerName: varchar("customer_name", { length: 120 }).notNull().default("عميل"),
  rating: int("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertReviewSchema = createInsertSchema(reviewsTable).omit({ id: true, createdAt: true });
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviewsTable.$inferSelect;
