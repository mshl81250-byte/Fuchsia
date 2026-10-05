import { mysqlTable, int, text, varchar, boolean, timestamp } from "drizzle-orm/mysql-core";

export const notificationChannelSettingsTable = mysqlTable("notification_channel_settings", {
  id: int("id").autoincrement().primaryKey(),
  channel: varchar("channel", { length: 64 }).notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  provider: text("provider").notNull(),
  sender: text("sender"),
  template: text("template").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NotificationChannelSettings = typeof notificationChannelSettingsTable.$inferSelect;
