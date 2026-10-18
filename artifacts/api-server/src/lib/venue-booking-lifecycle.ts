export const VENUE_BOOKING_STATUSES = ["pending", "confirmed", "rejected", "completed"] as const;
export type VenueBookingStatus = (typeof VENUE_BOOKING_STATUSES)[number];

const TRANSITIONS: Record<VenueBookingStatus, readonly VenueBookingStatus[]> = {
  pending: ["confirmed", "rejected"],
  confirmed: ["completed"],
  rejected: [],
  completed: [],
};

export type BookingTransitionErrorCode =
  | "INVALID_STATUS"
  | "NO_STATUS_CHANGE"
  | "INVALID_TRANSITION"
  | "REASON_REQUIRED"
  | "HOLD_EXPIRED";

export type BookingTransitionResult =
  | { ok: true; from: VenueBookingStatus; to: VenueBookingStatus }
  | { ok: false; code: BookingTransitionErrorCode; message: string };

export function isVenueBookingStatus(value: unknown): value is VenueBookingStatus {
  return typeof value === "string" && (VENUE_BOOKING_STATUSES as readonly string[]).includes(value);
}

export function validateVenueBookingTransition(
  fromValue: unknown,
  toValue: unknown,
  options: { reason?: string; expiresAt?: Date | null; now?: Date } = {},
): BookingTransitionResult {
  if (!isVenueBookingStatus(fromValue) || !isVenueBookingStatus(toValue)) {
    return { ok: false, code: "INVALID_STATUS", message: "حالة الحجز غير صحيحة" };
  }
  if (fromValue === toValue) {
    return { ok: false, code: "NO_STATUS_CHANGE", message: "الحجز موجود أصلًا بهذه الحالة" };
  }
  if (!TRANSITIONS[fromValue].includes(toValue)) {
    return { ok: false, code: "INVALID_TRANSITION", message: "لا يمكن الانتقال من حالة الحجز الحالية إلى الحالة المطلوبة" };
  }
  if (toValue === "rejected" && !options.reason?.trim()) {
    return { ok: false, code: "REASON_REQUIRED", message: "أدخل سبب رفض الحجز" };
  }
  if (fromValue === "pending" && toValue === "confirmed") {
    const now = options.now ?? new Date();
    if (!options.expiresAt || options.expiresAt.getTime() <= now.getTime()) {
      return { ok: false, code: "HOLD_EXPIRED", message: "انتهت مهلة الحجز؛ لا يمكن تأكيده بعد انتهاء الحجز المؤقت" };
    }
  }
  return { ok: true, from: fromValue, to: toValue };
}

export function paymentStatusForVenueBooking(status: VenueBookingStatus, current: string): string {
  if (status === "confirmed" || status === "completed") return "approved";
  if (status === "rejected") return "rejected";
  return current;
}
