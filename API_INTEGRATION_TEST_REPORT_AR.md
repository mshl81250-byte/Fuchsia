# تقرير اختبار API والتكامل — Fuchsia

**تاريخ التقرير:** 2026-10-16
**المستودع:** `mshl81250-byte/Fuchsia`
**فرع مصدر الحقيقة:** `main`
**آخر commit مختبر:** `1b8f022`
**فرع التكامل المرجعي:** `integration/customer-partner-admin`

## 1. خلاصة تنفيذية

تم فحص بنية API، مصادر استدعاءات API في تطبيق العميل وتطبيق الشريك ولوحة الإدارة، وتشغيل اختبارات البناء وrouting. يوجد في الخادم **147 نقطة نهاية موثقة من ملفات الراوتر**.

> **تنبيه مهم:** لا يمكن اعتبار التشغيل الإنتاجي مكتملًا أو جاهزًا للنشر الدائم قبل تجهيز قاعدة MySQL فعلية، تطبيق مخططات قاعدة البيانات والمigrations، ثم اختبار المسارات ببيانات حقيقية.

## 2. حالة الاختبارات

| المجال | الأمر/الاختبار | النتيجة |
|---|---|---|
| TypeScript | `pnpm run typecheck` | ناجح |
| API build | `pnpm --filter @workspace/api-server run build` | ناجح |
| Admin build | `pnpm run build:admin` تحت `/admin-dashboard/` | ناجح |
| API unit test | `pnpm --filter @workspace/api-server test:product-images` | 4/4 ناجح |
| Android client | `:app:assembleDebug` | ناجح سابقًا من نفس المصدر |
| Android partner | `:app:assembleDebug` | ناجح سابقًا من نفس المصدر |
| Git | `git diff --check` وحالة الفرع | نظيف |

## 3. اختبار routing المحلي

تم تشغيل طبقة Express بدون migrations على قاعدة وهمية لاختبار عقود المسارات فقط:

| الطلب | النتيجة | التفسير |
|---|---:|---|
| `GET /api/healthz` | HTTP 200 | الخادم يستجيب |
| `GET /api/categories` | HTTP 500 | يحتاج MySQL فعليًا |
| `GET /api/products/featured` | HTTP 500 | يحتاج MySQL فعليًا |
| `GET /api/stores` | HTTP 500 | يحتاج MySQL فعليًا |
| `GET /api/venues` | HTTP 500 | يحتاج MySQL فعليًا، وليس 404 |
| `GET /api/vendor/stores` | HTTP 401 | حماية الشريك تعمل بدون جلسة |
| `GET /api/venue-partner/me` | HTTP 401 | حماية الشريك تعمل بدون جلسة |
| `GET /api/vendor/rental-bookings` | HTTP 401 | حماية الشريك تعمل بدون جلسة |
| `GET /api/notifications/partner` | HTTP 401 | حماية الإشعارات تعمل بدون جلسة |
| `GET /admin-dashboard/` | HTTP 200 | اللوحة الجديدة تُخدم من المسار الصحيح |
| `GET /admin-dashboard/manus-routes.json` | HTTP 200 | manifest اللوحة موجود |
| `POST /api/admin/auth/login` ببيانات خاطئة وبدون DB | HTTP 500 | لا توجد قاعدة/حساب إدارة في بيئة الاختبار |

## 4. التكامل بين المكونات

| المكوّن | API المستخدم | حالة المطابقة |
|---|---|---|
| تطبيق العميل | auth، categories، products، stores، venues، cart، orders، reservations، rental bookings، uploads | المسارات موجودة في الخادم |
| تطبيق الشريك | auth، venue-partner، vendor، rental-maintenance، notifications، uploads | المسارات موجودة في الخادم |
| لوحة الإدارة | admin auth، products، stores، venues، rentals، reservations، partner accounts، uploads | المسارات موجودة في الخادم |
| لوحة الإدارة والنشر | `/admin-dashboard/` | HTTP 200 محليًا |
| الاتصال بين التطبيقات | لا يوجد اتصال مباشر؛ جميعها تمر عبر `/api` | مطابق للتصميم المطلوب |

## 5. جرد نقاط النهاية الكامل

إجمالي المسارات المستخرجة من ملفات الراوتر: **147**.

### الصحة والمصادقة

| الطريقة | المسار | المصدر |
|---|---|---|
| `POST` | `/api/auth/guest` | `auth.ts` |
| `POST` | `/api/auth/login` | `auth.ts` |
| `GET` | `/api/auth/profile` | `auth.ts` |
| `PATCH` | `/api/auth/profile` | `auth.ts` |
| `POST` | `/api/auth/register` | `auth.ts` |
| `POST` | `/api/auth/register/request-code` | `auth.ts` |
| `POST` | `/api/auth/register/verify-code` | `auth.ts` |
| `GET` | `/api/healthz` | `health.ts` |

### بيانات العميل والكتالوج

| الطريقة | المسار | المصدر |
|---|---|---|
| `GET` | `/api/categories` | `categories.ts` |
| `GET` | `/api/payment-wallets` | `payment-wallets.ts` |
| `POST` | `/api/payment-wallets` | `payment-wallets.ts` |
| `PATCH` | `/api/payment-wallets/:id` | `payment-wallets.ts` |
| `GET` | `/api/payment-wallets/all` | `payment-wallets.ts` |
| `POST` | `/api/payment-wallets/webhook/:provider` | `payment-wallets.ts` |
| `GET` | `/api/products` | `products.ts` |
| `POST` | `/api/products` | `products.ts` |
| `DELETE` | `/api/products/:id` | `products.ts` |
| `GET` | `/api/products/:id` | `products.ts` |
| `PATCH` | `/api/products/:id` | `products.ts` |
| `GET` | `/api/products/best-sellers` | `products.ts` |
| `GET` | `/api/products/by-occasion` | `products.ts` |
| `GET` | `/api/products/featured` | `products.ts` |
| `GET` | `/api/products/most-viewed` | `products.ts` |
| `GET` | `/api/products/new-arrivals` | `products.ts` |
| `GET` | `/api/products/recommendations` | `products.ts` |
| `GET` | `/api/products/top-sanaa` | `products.ts` |
| `GET` | `/api/promotions/banners` | `promotions.ts` |
| `POST` | `/api/promotions/coupons/validate` | `promotions.ts` |
| `GET` | `/api/stores` | `stores.ts` |
| `POST` | `/api/stores` | `stores.ts` |
| `GET` | `/api/stores/:id` | `stores.ts` |
| `GET` | `/api/stores/featured` | `stores.ts` |
| `GET` | `/api/venues` | `venues.ts` |
| `GET` | `/api/venues/:id` | `venues.ts` |
| `GET` | `/api/venues/:id/availability` | `venues.ts` |

### السلة والطلبات والحجوزات

| الطريقة | المسار | المصدر |
|---|---|---|
| `GET` | `/api/cart` | `cart.ts` |
| `POST` | `/api/cart` | `cart.ts` |
| `DELETE` | `/api/cart/:itemId` | `cart.ts` |
| `PATCH` | `/api/cart/:itemId` | `cart.ts` |
| `GET` | `/api/favorites` | `favorites.ts` |
| `POST` | `/api/favorites` | `favorites.ts` |
| `GET` | `/api/orders` | `orders.ts` |
| `POST` | `/api/orders` | `orders.ts` |
| `GET` | `/api/orders/:id` | `orders.ts` |
| `PATCH` | `/api/orders/:id` | `orders.ts` |
| `GET` | `/api/orders/:id/tracking` | `orders.ts` |
| `GET` | `/api/orders/mine` | `orders.ts` |
| `POST` | `/api/orders/offer` | `orders.ts` |
| `POST` | `/api/rental-bookings` | `rental-bookings.ts` |
| `POST` | `/api/rental-bookings/:id/change-requests` | `rental-bookings.ts` |
| `GET` | `/api/rental-bookings/availability` | `rental-bookings.ts` |
| `GET` | `/api/reservations` | `reservations.ts` |
| `POST` | `/api/reservations` | `reservations.ts` |
| `GET` | `/api/reviews` | `reviews.ts` |
| `POST` | `/api/reviews` | `reviews.ts` |
| `GET` | `/api/rewards` | `rewards.ts` |
| `POST` | `/api/rewards/spin` | `rewards.ts` |
| `GET` | `/api/venue-bookings` | `venue-bookings.ts` |
| `POST` | `/api/venue-bookings` | `venue-bookings.ts` |
| `POST` | `/api/venue-bookings/:id/cancellation-requests` | `venue-bookings.ts` |

### الشريك والتاجر

| الطريقة | المسار | المصدر |
|---|---|---|
| `GET` | `/api/notifications/partner` | `notifications.ts` |
| `PATCH` | `/api/notifications/partner/:id/read` | `notifications.ts` |
| `DELETE` | `/api/notifications/partner/devices` | `notifications.ts` |
| `POST` | `/api/notifications/partner/devices` | `notifications.ts` |
| `GET` | `/api/vendor/orders` | `vendor.ts` |
| `GET` | `/api/vendor/products` | `vendor.ts` |
| `POST` | `/api/vendor/products` | `vendor.ts` |
| `PATCH` | `/api/vendor/products/:id` | `vendor.ts` |
| `GET` | `/api/vendor/rental-bookings` | `vendor.ts` |
| `PATCH` | `/api/vendor/rental-bookings/:id` | `vendor.ts` |
| `PATCH` | `/api/vendor/rental-bookings/:id/change-requests/:requestId` | `vendor.ts` |
| `GET` | `/api/vendor/rental-maintenance` | `vendor.ts` |
| `POST` | `/api/vendor/rental-maintenance` | `vendor.ts` |
| `DELETE` | `/api/vendor/rental-maintenance/:id` | `vendor.ts` |
| `GET` | `/api/vendor/stats` | `vendor.ts` |
| `GET` | `/api/vendor/stores` | `vendor.ts` |
| `GET` | `/api/venue-partner/bookings` | `venue-partner.ts` |
| `PATCH` | `/api/venue-partner/bookings/:id` | `venue-partner.ts` |
| `GET` | `/api/venue-partner/me` | `venue-partner.ts` |
| `POST` | `/api/venue-partner/owner-request` | `venue-partner.ts` |
| `GET` | `/api/venue-partner/venues` | `venue-partner.ts` |
| `POST` | `/api/venue-partner/venues` | `venue-partner.ts` |
| `PATCH` | `/api/venue-partner/venues/:id` | `venue-partner.ts` |
| `GET` | `/api/venue-partner/venues/:id/availability` | `venue-partner.ts` |
| `PUT` | `/api/venue-partner/venues/:id/availability` | `venue-partner.ts` |
| `GET` | `/api/venue-partner/venues/:id/blackouts` | `venue-partner.ts` |
| `POST` | `/api/venue-partner/venues/:id/blackouts` | `venue-partner.ts` |
| `DELETE` | `/api/venue-partner/venues/:id/blackouts/:blackoutId` | `venue-partner.ts` |
| `GET` | `/api/venue-partner/venues/:id/calendar` | `venue-partner.ts` |

### الإدارة

| الطريقة | المسار | المصدر |
|---|---|---|
| `POST` | `/api/admin/auth/login` | `admin.ts` |
| `POST` | `/api/admin/auth/logout` | `admin.ts` |
| `GET` | `/api/admin/auth/me` | `admin.ts` |
| `GET` | `/api/admin/banners` | `admin.ts` |
| `POST` | `/api/admin/banners` | `admin.ts` |
| `DELETE` | `/api/admin/banners/:id` | `admin.ts` |
| `PATCH` | `/api/admin/banners/:id` | `admin.ts` |
| `GET` | `/api/admin/carts` | `admin.ts` |
| `GET` | `/api/admin/categories` | `admin.ts` |
| `POST` | `/api/admin/categories` | `admin.ts` |
| `DELETE` | `/api/admin/categories/:id` | `admin.ts` |
| `PATCH` | `/api/admin/categories/:id` | `admin.ts` |
| `GET` | `/api/admin/command-center` | `admin.ts` |
| `GET` | `/api/admin/coupons` | `admin.ts` |
| `POST` | `/api/admin/coupons` | `admin.ts` |
| `GET` | `/api/admin/notification-settings` | `admin.ts` |
| `PATCH` | `/api/admin/notification-settings/:channel` | `admin.ts` |
| `GET` | `/api/admin/orders` | `admin.ts` |
| `PATCH` | `/api/admin/orders/:id` | `admin.ts` |
| `PATCH` | `/api/admin/orders/:id/payment` | `admin.ts` |
| `POST` | `/api/admin/partner-accounts` | `admin.ts` |
| `GET` | `/api/admin/products` | `admin.ts` |
| `POST` | `/api/admin/products` | `admin.ts` |
| `DELETE` | `/api/admin/products/:id` | `admin.ts` |
| `PATCH` | `/api/admin/products/:id` | `admin.ts` |
| `GET` | `/api/admin/rentals` | `admin.ts` |
| `PATCH` | `/api/admin/rentals/:id` | `admin.ts` |
| `PATCH` | `/api/admin/rentals/:id/deposit` | `admin.ts` |
| `GET` | `/api/admin/reservations` | `admin.ts` |
| `PATCH` | `/api/admin/reservations/:id` | `admin.ts` |
| `GET` | `/api/admin/store-owner-links` | `admin.ts` |
| `GET` | `/api/admin/stores` | `admin.ts` |
| `POST` | `/api/admin/stores` | `admin.ts` |
| `DELETE` | `/api/admin/stores/:id` | `admin.ts` |
| `PATCH` | `/api/admin/stores/:id` | `admin.ts` |
| `PATCH` | `/api/admin/stores/:id/owner` | `admin.ts` |
| `GET` | `/api/admin/users` | `admin.ts` |
| `GET` | `/api/admin/users/:id` | `admin.ts` |
| `GET` | `/api/admin/venue-owners` | `admin.ts` |
| `PATCH` | `/api/admin/venue-owners/:id` | `admin.ts` |
| `GET` | `/api/admin/venue-owners/:id/details` | `admin.ts` |
| `GET` | `/api/admin/venues` | `admin.ts` |
| `POST` | `/api/admin/venues/:id/blackouts` | `admin.ts` |
| `DELETE` | `/api/admin/venues/:id/blackouts/:blackoutId` | `admin.ts` |
| `GET` | `/api/admin/venues/:id/schedule` | `admin.ts` |
| `PUT` | `/api/admin/venues/:id/schedule` | `admin.ts` |
| `GET` | `/api/admin/wallet-transactions` | `admin.ts` |

### الإشعارات والرفع واللوحة

| الطريقة | المسار | المصدر |
|---|---|---|
| `GET` | `/api/notifications` | `notifications.ts` |
| `PATCH` | `/api/notifications/:id/read` | `notifications.ts` |
| `GET` | `/api/notifications/partner` | `notifications.ts` |
| `PATCH` | `/api/notifications/partner/:id/read` | `notifications.ts` |
| `DELETE` | `/api/notifications/partner/devices` | `notifications.ts` |
| `POST` | `/api/notifications/partner/devices` | `notifications.ts` |
| `PATCH` | `/api/notifications/read-all` | `notifications.ts` |
| `POST` | `/api/uploads/admin-image` | `uploads.ts` |
| `POST` | `/api/uploads/image` | `uploads.ts` |
| `POST` | `/api/uploads/receipt` | `uploads.ts` |

## 6. ما لم يُختبر ببيانات حقيقية

- تسجيل عميل جديد والتحقق من OTP عبر API حقيقي.
- تسجيل دخول الإدارة بحساب موجود في قاعدة البيانات.
- دورة العميل الكاملة: تصفح → سلة → طلب → دفع/إيصال → متابعة.
- دورة الشريك الكاملة: تسجيل الدخول → قبول حجز → تحديث حالة → إشعار.
- إنشاء منتج أو قاعة من لوحة الإدارة وظهورها في تطبيق العميل.
- تعارض حجز حقيقي مع يوم صيانة حقيقي.
- Push Notifications الفعلية وخدمات البريد/WhatsApp.

سبب عدم إكمال هذه البنود في بيئة الاختبار الحالية هو عدم توفر MySQL أو بيانات اعتماد إنتاجية، وليس غياب المسارات من الكود.

## 7. متطلبات النشر الدائم — قاعدة البيانات أولًا

> يجب على المبرمج تجهيز قاعدة البيانات قبل نشر الخدمة بشكل دائم. لا يكفي بناء Docker أو تشغيل Node بدون قاعدة MySQL جاهزة.

### التسلسل الإلزامي

1. إنشاء قاعدة MySQL جديدة أو أخذ نسخة احتياطية من قاعدة موجودة.
2. ضبط `DATABASE_URL` في بيئة آمنة، وعدم رفعه إلى GitHub.
3. تثبيت الاعتماديات:

```bash
pnpm install --frozen-lockfile
```

4. تطبيق مخططات قاعدة البيانات قبل النشر:

```bash
DATABASE_URL="mysql://user:password@host:3306/fuchsia" pnpm --filter @workspace/db push
```

5. ضبط المتغيرات السرية:

```text
DATABASE_URL
SESSION_SECRET
ADMIN_EMAIL
ADMIN_INITIAL_PASSWORD
```

6. تشغيل seed **فقط** على قاعدة جديدة أو بعد نسخة احتياطية، لأنه ينشئ/يستبدل بيانات تجريبية:

```bash
ADMIN_EMAIL=admin@fuchsia.ye ADMIN_INITIAL_PASSWORD="كلمة-مرور-قوية-12-حرفًا-على-الأقل" pnpm --filter @workspace/api-server exec tsx src/seed.ts
```

7. بناء ونشر API ولوحة الإدارة:

```bash
pnpm run build
node --enable-source-maps artifacts/api-server/dist/index.mjs
```

8. بعد تشغيل الخدمة، اختبار:

```bash
curl -i https://YOUR_DOMAIN/api/healthz
curl -i https://YOUR_DOMAIN/api/venues
curl -i https://YOUR_DOMAIN/api/vendor/stores
curl -i https://YOUR_DOMAIN/api/venue-partner/me
curl -i https://YOUR_DOMAIN/api/vendor/rental-bookings
curl -i https://YOUR_DOMAIN/api/notifications/partner
curl -i https://YOUR_DOMAIN/admin-dashboard/
```

يجب أن تكون المسارات العامة مثل `/api/venues` مرتبطة بقاعدة فعلية وتعيد استجابة بيانات أو استجابة أعمال متوقعة، وليس `404` أو `500` بسبب غياب القاعدة. المسارات المحمية بدون جلسة يجب أن تعيد `401`، وهذا سلوك صحيح.

## 8. متطلبات قبول الإنتاج

- `GET /api/healthz` يعيد HTTP 200.
- قاعدة البيانات متصلة وmigrations مطبقة.
- `/api/venues` لا يعيد 404 أو 500 بسبب schema/database.
- تسجيل دخول الإدارة ينجح بحساب مهيأ.
- `/admin-dashboard/` يفتح من المسار المطلوب.
- تطبيق العميل يستطيع تحميل التصنيفات والمنتجات والقاعات.
- تطبيق الشريك يستطيع تحميل بياناته والحجوزات والتقويم والصيانة.
- إنشاء تعديل من لوحة الإدارة يظهر بعده في التطبيقين عبر API المشترك.
- التحقق من السجلات وعدم وجود أخطاء اتصال أو schema في production logs.

## 9. الملفات المرجعية

- API: `artifacts/api-server/`
- المخططات: `lib/db/`
- لوحة الإدارة: `artifacts/admin-dashboard/`
- تطبيق العميل: `apps/mobile/android/`
- تطبيق الشريك: `apps/partner/android/`
- إعداد البيئة: `.env.example`
- Docker: `Dockerfile`

**حالة التقرير:** جاهز للتسليم مع المستودع، مع توضيح أن اختبار البيانات الحقيقية لا يُعتمد إلا بعد تجهيز قاعدة البيانات والنشر الفعلي.
