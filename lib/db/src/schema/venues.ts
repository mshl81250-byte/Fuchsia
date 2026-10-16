import { mysqlTable, int, varchar, text, double, boolean, timestamp, date, index, uniqueIndex } from "drizzle-orm/mysql-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const venueOwnersTable = mysqlTable("venue_owners", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  businessName: text("business_name").notNull(),
  contactPhone: varchar("contact_phone", { length: 40 }).notNull(),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [uniqueIndex("venue_owners_user_uq").on(table.userId)]);

export const venuesTable = mysqlTable("venues", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  nameAr: text("name_ar").notNull(),
  description: text("description"),
  city: varchar("city", { length: 120 }).notNull(),
  address: text("address").notNull(),
  capacity: int("capacity").notNull(),
  dailyPrice: double("daily_price").notNull(),
  audienceScope: varchar("audience_scope", { length: 16 }).notNull().default("both"),
  primaryImageUrl: text("primary_image_url").notNull(),
  images: text("images").notNull().default("[]"),
  amenities: varchar("amenities", { length: 4000 }).notNull().default("[]"),
  rules: text("rules"),
  isPublished: boolean("is_published").notNull().default(false),
  rating: double("rating").notNull().default(0),
  reviewCount: int("review_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("venues_owner_published_idx").on(table.ownerId, table.isPublished),
  index("venues_city_published_idx").on(table.city, table.isPublished),
]);

export const venueStaffTable = mysqlTable("venue_staff", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  userId: int("user_id").notNull(),
  role: varchar("role", { length: 24 }).notNull().default("manager"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("venue_staff_owner_user_uq").on(table.ownerId, table.userId),
  index("venue_staff_user_active_idx").on(table.userId, table.isActive),
]);

/** Weekly owner-defined operating hours; actual date conflicts live in bookings/blackouts. */
export const venueAvailabilityTable = mysqlTable("venue_availability", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venue_id").notNull(),
  audienceScope: varchar("audience_scope", { length: 16 }).notNull().default("both"),
  weekDay: int("week_day").notNull(),
  period: varchar("period", { length: 16 }).notNull().default("all_day"),
  isOpen: boolean("is_open").notNull().default(true),
  startTime: varchar("start_time", { length: 5 }),
  endTime: varchar("end_time", { length: 5 }),
}, (table) => [uniqueIndex("venue_availability_slot_uq").on(table.venueId, table.audienceScope, table.weekDay, table.period)]);

export const venueBlackoutsTable = mysqlTable("venue_blackouts", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venue_id").notNull(),
  audienceScope: varchar("audience_scope", { length: 16 }).notNull().default("both"),
  startDate: date("start_date", { mode: "string" }).notNull(),
  endDate: date("end_date", { mode: "string" }).notNull(),
  reason: text("reason"),
  createdByUserId: int("created_by_user_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("venue_blackouts_range_idx").on(table.venueId, table.startDate, table.endDate)]);

export const venueBookingsTable = mysqlTable("venue_bookings", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venue_id").notNull(),
  customerUserId: int("customer_user_id").notNull(),
  audience: varchar("audience", { length: 16 }).notNull(),
  reservationAt: timestamp("reservation_at").notNull(),
  bookingDays: int("booking_days").notNull().default(1),
  partySize: int("party_size").notNull(),
  customerName: text("customer_name").notNull(),
  customerPhone: varchar("customer_phone", { length: 40 }).notNull(),
  dailyPriceSnapshot: double("daily_price_snapshot").notNull(),
  totalAmount: double("total_amount").notNull(),
  paymentType: varchar("payment_type", { length: 16 }).notNull().default("deposit"),
  paymentAmount: double("payment_amount").notNull(),
  platformFee: double("platform_fee").notNull().default(1000),
  paymentWalletId: int("payment_wallet_id"),
  transactionReference: varchar("transaction_reference", { length: 120 }),
  paymentReceiptUrl: text("payment_receipt_url"),
  paymentStatus: varchar("payment_status", { length: 24 }).notNull().default("pending_review"),
  status: varchar("status", { length: 32 }).notNull().default("pending"),
  idempotencyKey: varchar("idempotency_key", { length: 128 }).notNull(),
  expiresAt: timestamp("expires_at"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("venue_bookings_venue_date_idx").on(table.venueId, table.reservationAt),
  index("venue_bookings_status_date_idx").on(table.status, table.reservationAt),
  index("venue_bookings_customer_date_idx").on(table.customerUserId, table.reservationAt),
  uniqueIndex("venue_bookings_idempotency_uq").on(table.idempotencyKey),
]);

export const venueBookingEventsTable = mysqlTable("venue_booking_events", {
  id: int("id").autoincrement().primaryKey(),
  bookingId: int("booking_id").notNull(),
  actorUserId: int("actor_user_id"),
  actorType: varchar("actor_type", { length: 24 }).notNull().default("system"),
  eventType: varchar("event_type", { length: 48 }).notNull(),
  fromStatus: varchar("from_status", { length: 32 }),
  toStatus: varchar("to_status", { length: 32 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [index("venue_booking_events_booking_idx").on(table.bookingId, table.createdAt)]);

export const venuePayoutsTable = mysqlTable("venue_payouts", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("owner_id").notNull(),
  bookingId: int("booking_id").notNull(),
  amount: double("amount").notNull(),
  currency: varchar("currency", { length: 8 }).notNull().default("YER"),
  status: varchar("status", { length: 24 }).notNull().default("pending"),
  transactionReference: varchar("transaction_reference", { length: 120 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  settledAt: timestamp("settled_at"),
}, (table) => [
  uniqueIndex("venue_payouts_booking_uq").on(table.bookingId),
  index("venue_payouts_owner_status_idx").on(table.ownerId, table.status),
]);

export const insertVenueSchema = createInsertSchema(venuesTable).omit({ id: true, createdAt: true, updatedAt: true, rating: true, reviewCount: true });
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type Venue = typeof venuesTable.$inferSelect;
export type VenueOwner = typeof venueOwnersTable.$inferSelect;
export type VenueBooking = typeof venueBookingsTable.$inferSelect;
