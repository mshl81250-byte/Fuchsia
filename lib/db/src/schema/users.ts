import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  address: text("address"),
  isGuest: boolean("is_guest").notNull().default(false),
  rewardPoints: integer("reward_points").notNull().default(0),
  referralCode: text("referral_code").unique(),
  referredBy: integer("referred_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const favoritesTable = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rewardTransactionsTable = pgTable("reward_transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  points: integer("points").notNull(),
  description: text("description").notNull(),
  orderId: integer("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type Favorite = typeof favoritesTable.$inferSelect;
export type RewardTransaction = typeof rewardTransactionsTable.$inferSelect;
