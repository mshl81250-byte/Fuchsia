import assert from "node:assert/strict";
import test from "node:test";
import { canManageVenueBookings, visibleVenueBookingsPermission } from "./venue-partner-permissions.js";

test("an active venue owner can manage venues independently of store permissions", () => {
  assert.equal(canManageVenueBookings("partner", '{"venueBookings":false}', "active"), true);
  assert.equal(visibleVenueBookingsPermission("partner", '{"venueBookings":false}', "active"), true);
});

test("a non-owner partner with an explicit denial remains blocked", () => {
  assert.equal(canManageVenueBookings("partner", '{"venueBookings":false}', null), false);
  assert.equal(visibleVenueBookingsPermission("partner", '{"venueBookings":false}', "pending"), false);
});

test("legacy and customer accounts keep the compatible default", () => {
  assert.equal(canManageVenueBookings("customer", null, null), true);
  assert.equal(canManageVenueBookings("partner", "not-json", null), true);
});
