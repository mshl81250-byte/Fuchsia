import { mysqlTable, text, varchar, int, boolean, timestamp, double } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const usersTable = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  fullName: text("full_name").notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: text("password_hash"),
  phone: text("phone"),
  avatarUrl: text("avatar_url"),
  address: text("address"),
  isGuest: boolean("is_guest").notNull().default(false),
  rewardPoints: int("reward_points").notNull().default(0),
  referralCode: varchar("referral_code", { length: 64 }).unique(),
  referredBy: int("referred_by"),
  tier: varchar("tier", { length: 32 }).notNull().default("silver"),
  totalSpent: double("total_spent").notNull().default(0),
  lastSpinDate: text("last_spin_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const emailVerificationCodesTable = mysqlTable("email_verification_codes", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  fullName: text("full_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  phone: text("phone"),
  codeHash: text("code_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: int("attempts").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const favoritesTable = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  productId: int("product_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rewardTransactionsTable = mysqlTable("reward_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  points: int("points").notNull(),
  description: text("description").notNull(),
  orderId: int("order_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const spinHistoryTable = mysqlTable("spin_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  spinDate: text("spin_date").notNull(),
  reward: text("reward").notNull(),
  rewardValue: text("reward_value").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
export type EmailVerificationCode = typeof emailVerificationCodesTable.$inferSelect;
export type Favorite = typeof favoritesTable.$inferSelect;
export type RewardTransaction = typeof rewardTransactionsTable.$inferSelect;
export type SpinHistory = typeof spinHistoryTable.$inferSelect;
