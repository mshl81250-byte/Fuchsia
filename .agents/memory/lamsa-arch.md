---
name: Lamsa App Architecture
description: Key decisions for the لمسة beauty delivery app — auth flow, routing guards, payment enum, admin/vendor login
---

## Auth Flow
- SHA256 hash with `lamsa_salt_2024` suffix (no bcrypt)
- Stored in `localStorage` as `lamsa_user` + `lamsa_token`
- Splash → Auth guard: check `lamsa_onboarded` first, then `lamsa_user`
- Admin gate: client-side only, credentials `admin@lamsa.ye` / `admin123`, stored in `lamsa_admin`
- Vendor gate: matches `storeNameAr` or `store.phone` via `/api/vendor/login`, stored in `lamsa_vendor` as JSON

**Why:** Simple auth for MVP in Yemen market; no OAuth providers available.

## Routing
- `/splash` → onboarding (3 slides), sets `lamsa_onboarded`
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

## DB Tables Added
- `usersTable` — fullName, email, passwordHash, phone, isGuest, rewardPoints, referralCode, address, avatarUrl
- `favoritesTable` — userId, productId
- `rewardTransactionsTable` — userId, points, description, orderId
