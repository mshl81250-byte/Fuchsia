import { boolean, double, index, int, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const userAddressesTable = mysqlTable("user_addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  label: varchar("label", { length: 80 }).notNull().default("المنزل"),
  recipientName: varchar("recipient_name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 40 }).notNull(),
  address: text("address").notNull(),
  notes: text("notes"),
  latitude: double("latitude"),
  longitude: double("longitude"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("user_addresses_user_created_idx").on(table.userId, table.createdAt),
  index("user_addresses_default_idx").on(table.userId, table.isDefault),
]);

export type UserAddress = typeof userAddressesTable.$inferSelect;
