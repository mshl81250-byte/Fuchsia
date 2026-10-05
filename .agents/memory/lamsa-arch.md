---
name: Fuchsia app architecture
description: Full-stack Arabic women's events platform — brand, auth, routing, payment, DB decisions
---

## Brand
- **Arabic name:** فوشيا | **English:** Fuchsia (rebranded from لمسة/Lamsa)
- **Primary color:** `#D81B60` (fuchsia) — `hsl(336 76% 48%)`, replaces gold `#C9A84C`
- **Light background:** `#FFF0F6` | **Border:** `#F0D4E5` | **Accent:** `#F48FB1`
- **Tagline:** روعة المناسبات في مكان واحد

## Auth Flow
- SHA256 hash with `fuchsia_salt_2024` suffix (no bcrypt)
- Stored in `localStorage` as `fuchsia_user` + `fuchsia_token`
- Splash → Auth guard: check `fuchsia_onboarded` first, then `fuchsia_user`
- Admin gate: server-side API authentication with an HttpOnly session cookie; never store credentials in client code or localStorage.
- Vendor gate: matches `storeNameAr` or `store.phone` via `/api/vendor/login`, stored in `fuchsia_vendor` as JSON
- Guest emails: `زائر_{timestamp}@guest.fuchsia`
- Vendor token: SHA-256 of `{store.id}_vendor_fuchsia`

**Why:** Server-side sessions keep administrative credentials and authorization decisions out of the browser.

## Routing
- `/splash` → onboarding (3 slides: كوش، خطوبة، هدايا), sets `fuchsia_onboarded`
- `/auth` → login/register/guest (no Layout wrapper)
- `/admin` → no Layout wrapper, full-page sidebar dashboard
- `/vendor` → no Layout wrapper, full-page sidebar dashboard
- All other routes → Layout + ProtectedRoute (redirects to /splash if not onboarded, /auth if not logged in)

## Payment Methods Enum
`cash_on_delivery | jaib | flousy | mobile_money | jawali | cash | one_cash | bank_transfer`

## API Hooks — Query Keys Pattern
Hooks that take no params use `getXxxQueryKey()` with no args.
Hooks with params (vendor, favorites) require passing params object: `getVendorGetStatsQueryKey({ storeId })`.

**Why:** Generated Orval hooks require `queryKey` field in options — omitting it causes TS2741 error.

## Rewards Points
- 50 points on registration
- 10 points per 1000 YER spent on order
- 1 point = 2 YER value

## DB Tables
- `usersTable` — added `tier`, `totalSpent`, `lastSpinDate`
- `spinHistoryTable` — new table for lucky wheel
- `productsTable` — added `views`, `salesCount`, `occasionTags`, `offerEndsAt`, `videoUrl`
- `ordersTable` — added gift fields + `subtotal` + `userId`

## New API Endpoints (Phase 3)
- `/api/products/best-sellers` — by salesCount
- `/api/products/most-viewed` — by views
- `/api/products/by-occasion?tag=...` — occasionTags filter
- `/api/products/recommendations` — random featured
- `/api/rewards/spin` — daily lucky wheel (one spin/day enforced)
