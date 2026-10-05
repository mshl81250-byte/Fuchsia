# فوشيا (Fuchsia)

منصة رقمية متكاملة متخصصة في تجهيز المناسبات النسائية والهدايا الفاخرة — كوش الأعراس، تجهيزات الخطوبة، الطاولات، الهدايا، والتغليف الفاخر.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Brand

- **Name (AR):** فوشيا
- **Name (EN):** Fuchsia
- **Primary color:** `#D81B60` (fuchsia/deep pink) — HSL: 336 76% 48%
- **Light background:** `#FFF0F6`
- **Border:** `#F0D4E5`
- **Accent:** `#F48FB1`
- **Tagline:** روعة المناسبات في مكان واحد
- **Admin email:** `admin@fuchsia.ye` / password is supplied through the secret `ADMIN_INITIAL_PASSWORD` during initial seeding.
- **localStorage keys:** `fuchsia_user`, `fuchsia_token`, `fuchsia_session_id`, `fuchsia_onboarded`, `fuchsia_admin`, `fuchsia_vendor`
- **Auth salt:** configured in server code; never use the seed password as a source-controlled value.
- **Guest email domain:** `@guest.fuchsia`

## Where things live

- `artifacts/lamsa/` — React+Vite frontend (folder name kept as-is, brand is Fuchsia)
- `artifacts/api-server/` — Express 5 API server
- `lib/db/` — Drizzle ORM schema + migrations
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for API contract)
- `lib/api-client-react/` — generated React Query hooks
- `lib/api-zod/` — generated Zod schemas

## Services & Sections

- **كوش الأعراس** — كلاسيكية، مودرن، ملكية، فاخرة، حسب الطلب
- **تجهيز الخطوبة** — صندوق خطوبة، ورود، شوكولاتة، عطور، إكسسوارات
- **الطاولات** — أعراس، خطوبة، ضيافة، مواليد، أعياد ميلاد
- **الهدايا** — زواج، خطوبة، تخرج، مواليد، شركات، حسب الطلب
- **التغليف** — فاخر، ملكي، أكريليك، ورود طبيعية، مخصص

## Architecture decisions

- Contract-first API: OpenAPI spec → generated client hooks + Zod schemas
- Auth: SHA-256 hash with `fuchsia_salt_2024` suffix, JWT-style token per session
- Guest users get `@guest.fuchsia` email domain
- All colors use `#D81B60` fuchsia replacing previous gold `#C9A84C`
- Folder remains `artifacts/lamsa/` for technical continuity — only brand/UI changed

## User preferences

- Brand: فوشيا (Fuchsia), not لمسة (Lamsa)
- Primary color: #D81B60 (fuchsia)
- Focus: Women's events platform — weddings, engagements, gifts, occasions
- Arabic RTL interface

## Gotchas

- `pnpm --filter @workspace/db run push` needed after schema changes
- Generated files in `lib/api-client-react/src/generated/` and `lib/api-zod/src/generated/` — don't edit manually
- Run `pnpm --filter @workspace/api-spec run codegen` after OpenAPI spec changes

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
