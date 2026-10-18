import assert from "node:assert/strict";
import test from "node:test";
import { paymentStatusForVenueBooking, validateVenueBookingTransition } from "./venue-booking-lifecycle.js";

test("allows an unexpired pending booking to be confirmed", () => {
  const now = new Date("2026-10-18T10:00:00.000Z");
  assert.deepEqual(validateVenueBookingTransition("pending", "confirmed", { expiresAt: new Date("2026-10-18T11:00:00.000Z"), now }), { ok: true, from: "pending", to: "confirmed" });
});

test("rejects confirmation after the hold expires", () => {
  const now = new Date("2026-10-18T12:00:00.000Z");
  const result = validateVenueBookingTransition("pending", "confirmed", { expiresAt: new Date("2026-10-18T11:00:00.000Z"), now });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "HOLD_EXPIRED");
});

test("requires a reason when rejecting a booking", () => {
  const result = validateVenueBookingTransition("pending", "rejected", { reason: " " });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "REASON_REQUIRED");
});

test("prevents reopening rejected bookings or skipping the lifecycle", () => {
  assert.equal(validateVenueBookingTransition("rejected", "confirmed").ok, false);
  assert.equal(validateVenueBookingTransition("pending", "completed").ok, false);
});

test("allows completion only after confirmation", () => {
  assert.deepEqual(validateVenueBookingTransition("confirmed", "completed"), { ok: true, from: "confirmed", to: "completed" });
});

test("maps payment state consistently", () => {
  assert.equal(paymentStatusForVenueBooking("confirmed", "pending_review"), "approved");
  assert.equal(paymentStatusForVenueBooking("completed", "approved"), "approved");
  assert.equal(paymentStatusForVenueBooking("rejected", "pending_review"), "rejected");
});
