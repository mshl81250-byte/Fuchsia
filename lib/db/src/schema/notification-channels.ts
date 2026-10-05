import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";

export const notificationChannelSettingsTable = pgTable("notification_channel_settings", {
  id: serial("id").primaryKey(),
  channel: text("channel").notNull().unique(),
  enabled: boolean("enabled").notNull().default(false),
  provider: text("provider").notNull(),
  sender: text("sender"),
  template: text("template").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type NotificationChannelSettings = typeof notificationChannelSettingsTable.$inferSelect;
