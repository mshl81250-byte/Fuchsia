import { pool } from "@workspace/db";
import type { RowDataPacket } from "mysql2";

export type DeliverySettings = {
  baseFee: number;
  perKm: number;
  freeKm: number;
  originLatitude: number;
  originLongitude: number;
  originAddress: string;
  supportPhone: string;
  supportWhatsapp: string;
  supportEmail: string;
};

const DEFAULTS: DeliverySettings = { baseFee: 200, perKm: 80, freeKm: 0, originLatitude: 15.3694, originLongitude: 44.1910, originAddress: "صنعاء - اليمن", supportPhone: "", supportWhatsapp: "", supportEmail: "" };
let tableReady: Promise<void> | null = null;

async function ensureTable(): Promise<void> {
  if (!tableReady) {
    tableReady = pool.query(`CREATE TABLE IF NOT EXISTS delivery_settings (
      id TINYINT PRIMARY KEY,
      base_fee DOUBLE NOT NULL DEFAULT 200,
      per_km DOUBLE NOT NULL DEFAULT 80,
      free_km DOUBLE NOT NULL DEFAULT 0,
      origin_latitude DOUBLE NOT NULL DEFAULT 15.3694,
      origin_longitude DOUBLE NOT NULL DEFAULT 44.1910,
      origin_address VARCHAR(500) NULL,
      support_phone VARCHAR(40) NULL,
      support_whatsapp VARCHAR(40) NULL,
      support_email VARCHAR(320) NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`).then(async () => {
      await pool.query("INSERT IGNORE INTO delivery_settings (id) VALUES (1)");
    }).then(() => undefined);
  }
  await tableReady;
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  await ensureTable();
  const [rows] = await pool.query<(DeliverySettings & RowDataPacket)[]>("SELECT base_fee AS baseFee, per_km AS perKm, free_km AS freeKm, origin_latitude AS originLatitude, origin_longitude AS originLongitude, COALESCE(origin_address, '') AS originAddress, COALESCE(support_phone, '') AS supportPhone, COALESCE(support_whatsapp, '') AS supportWhatsapp, COALESCE(support_email, '') AS supportEmail FROM delivery_settings WHERE id = 1");
  const row = rows[0];
  return row ? {
    baseFee: Number(row.baseFee), perKm: Number(row.perKm), freeKm: Number(row.freeKm),
    originLatitude: Number(row.originLatitude), originLongitude: Number(row.originLongitude),
    originAddress: String(row.originAddress || ""), supportPhone: String(row.supportPhone || ""), supportWhatsapp: String(row.supportWhatsapp || ""), supportEmail: String(row.supportEmail || ""),
  } : DEFAULTS;
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(bLat - aLat);
  const dLng = radians(bLng - aLng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(aLat)) * Math.cos(radians(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function deliveryQuote(latitude: number, longitude: number) {
  const settings = await getDeliverySettings();
  const distance = distanceKm(settings.originLatitude, settings.originLongitude, latitude, longitude);
  const chargeableKm = Math.max(0, distance - settings.freeKm);
  const fee = Math.max(0, Math.ceil(settings.baseFee + chargeableKm * settings.perKm));
  return { fee, distanceKm: Number(distance.toFixed(2)), chargeableKm: Number(chargeableKm.toFixed(2)), settings };
}

export async function updateDeliverySettings(input: Partial<DeliverySettings>): Promise<DeliverySettings> {
  await ensureTable();
  const current = await getDeliverySettings();
  const next = {
    baseFee: Number.isFinite(input.baseFee) ? Math.max(0, Number(input.baseFee)) : current.baseFee,
    perKm: Number.isFinite(input.perKm) ? Math.max(0, Number(input.perKm)) : current.perKm,
    freeKm: Number.isFinite(input.freeKm) ? Math.max(0, Number(input.freeKm)) : current.freeKm,
    originLatitude: Number.isFinite(input.originLatitude) ? Number(input.originLatitude) : current.originLatitude,
    originLongitude: Number.isFinite(input.originLongitude) ? Number(input.originLongitude) : current.originLongitude,
    originAddress: typeof input.originAddress === "string" ? input.originAddress.trim().slice(0, 500) : current.originAddress,
    supportPhone: typeof input.supportPhone === "string" ? input.supportPhone.trim().slice(0, 40) : current.supportPhone,
    supportWhatsapp: typeof input.supportWhatsapp === "string" ? input.supportWhatsapp.trim().slice(0, 40) : current.supportWhatsapp,
    supportEmail: typeof input.supportEmail === "string" ? input.supportEmail.trim().slice(0, 320) : current.supportEmail,
  };
  await pool.query("UPDATE delivery_settings SET base_fee = ?, per_km = ?, free_km = ?, origin_latitude = ?, origin_longitude = ?, origin_address = ?, support_phone = ?, support_whatsapp = ?, support_email = ? WHERE id = 1", [next.baseFee, next.perKm, next.freeKm, next.originLatitude, next.originLongitude, next.originAddress, next.supportPhone, next.supportWhatsapp, next.supportEmail]);
  return next;
}
