import type { RowDataPacket } from "mysql2";

export type RentalAvailabilityQueryable = {
  query: (sql: string, values?: unknown[]) => Promise<[RowDataPacket[], unknown]>;
};

const IGNORED_STATUSES = ["cancelled", "canceled", "refunded", "rejected", "expired", "rental_rejected", "rental_cancelled"];

export function addDateDays(dateOnly: string, days: number): string {
  const date = new Date(`${dateOnly}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function toDateOnly(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  }
  if (typeof value !== "string") return null;
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) return null;
  const date = new Date(`${match[0]}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) ? match[0] : null;
}

function dateKeys(startDate: string, endDate: string): string[] {
  const keys: string[] = [];
  const day = new Date(`${startDate}T00:00:00.000Z`);
  const last = new Date(`${endDate}T00:00:00.000Z`);
  while (day <= last && keys.length < 400) {
    keys.push(day.toISOString().slice(0, 10));
    day.setUTCDate(day.getUTCDate() + 1);
  }
  return keys;
}

export type RentalOccupancy = {
  maxReservedQuantity: number;
  maxMaintenanceQuantity: number;
  maxOccupiedQuantity: number;
  busiestDate: string | null;
  blockedThrough: string;
};

/**
 * Counts the peak occupied units on any individual day in a requested window.
 * A product's prep buffer is applied after each rental and after the candidate
 * rental; maintenance blocks count only on their explicitly configured dates.
 */
export async function getRentalOccupancy(
  queryable: RentalAvailabilityQueryable,
  productId: number,
  startDate: string,
  endDate: string,
  bufferDays: number,
  excludeOrderId?: number,
  candidateBufferDays: number = bufferDays,
): Promise<RentalOccupancy> {
  const boundedBuffer = Math.max(0, Math.min(14, Math.trunc(bufferDays)));
  const blockedThrough = addDateDays(endDate, Math.max(0, Math.min(14, Math.trunc(candidateBufferDays))));
  const statusPlaceholders = IGNORED_STATUSES.map(() => "?").join(",");
  const excludeClause = excludeOrderId ? "AND o.id <> ?" : "";
  const params: unknown[] = [productId, blockedThrough, boundedBuffer, startDate, ...IGNORED_STATUSES];
  if (excludeOrderId) params.push(excludeOrderId);
  const [bookingRows] = await queryable.query(
    `SELECT oi.rental_start_date, oi.rental_end_date, SUM(oi.quantity) AS quantity
     FROM order_items oi
     INNER JOIN orders o ON o.id = oi.order_id
     WHERE oi.product_id = ?
       AND oi.fulfillment_type = 'rental'
       AND oi.rental_start_date <= ?
       AND DATE_ADD(oi.rental_end_date, INTERVAL ? DAY) >= ?
       AND o.status NOT IN (${statusPlaceholders}) ${excludeClause}
     GROUP BY oi.order_id, oi.rental_start_date, oi.rental_end_date`,
    params,
  );
  const [maintenanceRows] = await queryable.query(
    `SELECT start_date, end_date, quantity FROM rental_maintenance_blocks
     WHERE product_id = ? AND start_date <= ? AND end_date >= ?`,
    [productId, blockedThrough, startDate],
  );

  const days = dateKeys(startDate, blockedThrough);
  const bookingByDay = new Map(days.map((day) => [day, 0]));
  const maintenanceByDay = new Map(days.map((day) => [day, 0]));
  for (const row of bookingRows) {
    const rentalStart = toDateOnly(row.rental_start_date);
    const rentalEndDate = toDateOnly(row.rental_end_date);
    // Legacy rows may contain a missing or driver-specific date representation.
    // Ignore incomplete rows instead of crashing availability for every customer.
    if (!rentalStart || !rentalEndDate) continue;
    const rentalEnd = addDateDays(rentalEndDate, boundedBuffer);
    const quantity = Math.max(0, Number(row.quantity || 0));
    for (const day of days) {
      if (day >= rentalStart && day <= rentalEnd) bookingByDay.set(day, (bookingByDay.get(day) || 0) + quantity);
    }
  }
  for (const row of maintenanceRows) {
    const blockStart = toDateOnly(row.start_date);
    const blockEnd = toDateOnly(row.end_date);
    if (!blockStart || !blockEnd) continue;
    const quantity = Math.max(0, Number(row.quantity || 0));
    for (const day of days) {
      if (day >= blockStart && day <= blockEnd) maintenanceByDay.set(day, (maintenanceByDay.get(day) || 0) + quantity);
    }
  }

  let maxReservedQuantity = 0;
  let maxMaintenanceQuantity = 0;
  let maxOccupiedQuantity = 0;
  let busiestDate: string | null = null;
  for (const day of days) {
    const reserved = bookingByDay.get(day) || 0;
    const maintenance = maintenanceByDay.get(day) || 0;
    if (reserved > maxReservedQuantity) maxReservedQuantity = reserved;
    if (maintenance > maxMaintenanceQuantity) maxMaintenanceQuantity = maintenance;
    if (reserved + maintenance > maxOccupiedQuantity) {
      maxOccupiedQuantity = reserved + maintenance;
      busiestDate = day;
    }
  }
  return { maxReservedQuantity, maxMaintenanceQuantity, maxOccupiedQuantity, busiestDate, blockedThrough };
}
