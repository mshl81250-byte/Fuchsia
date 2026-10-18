type PartnerPermissionSet = {
  venueBookings?: boolean;
};

/**
 * Venue ownership is an independent capability from store-partner permissions.
 * An administrator-approved venue owner must be able to use venue routes even
 * when the same account is not allowed to manage venue bookings for a store.
 */
export function canManageVenueBookings(
  accountType: string | null | undefined,
  partnerPermissionsJson: string | null | undefined,
  ownerStatus: string | null | undefined,
): boolean {
  if (ownerStatus === "active") return true;
  if (accountType !== "partner") return true;

  try {
    const permissions = JSON.parse(partnerPermissionsJson || "{}") as PartnerPermissionSet;
    return permissions.venueBookings !== false;
  } catch {
    return true;
  }
}

export function visibleVenueBookingsPermission(
  accountType: string | null | undefined,
  partnerPermissionsJson: string | null | undefined,
  ownerStatus: string | null | undefined,
): boolean {
  return canManageVenueBookings(accountType, partnerPermissionsJson, ownerStatus);
}
