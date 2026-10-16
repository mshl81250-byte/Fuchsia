# Fuchsia

مشروع Fuchsia العربي RTL للهدايا والمناسبات، ويحتوي على:

- لوحة الإدارة الجديدة في `artifacts/admin-dashboard`، وتُخدم تحت `/admin-dashboard/`.
- خادم Express في `artifacts/api-server`.
- تطبيق Android الأصلي للعميل في `apps/mobile/android`.
- تطبيق Android للشريك في `apps/partner/android`.
- مكتبة التصميم المشتركة في `apps/design-system/android`.

## المتطلبات

- Node.js 22 أو أحدث.
- pnpm 11.
- قاعدة بيانات MySQL (هذا الفرع يستخدم Drizzle MySQL؛ لا تستخدم رابط PostgreSQL معه دون ترحيل المخطط أولاً).
- لا تضع كلمات المرور أو مفاتيح الخدمات في Git.

## تشغيل الخادم

```bash
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
# عدّل DATABASE_URL و SESSION_SECRET وبقية القيم السرية
pnpm run build
PORT=3000 node artifacts/api-server/dist/index.mjs
```

فحص الصحة: `GET /api/healthz`.

## متغيرات مهمة

- `DATABASE_URL`: رابط قاعدة البيانات.
- `ADMIN_EMAIL`: بريد حساب الإدارة، والافتراضي `admin@fuchsia.ye`.
- `ADMIN_INITIAL_PASSWORD`: كلمة مرور أولية لا تقل عن 12 حرفاً، تُستخدم عند تشغيل seed ولا تُحفظ في Git.
- `SESSION_SECRET`: قيمة عشوائية طويلة لجلسات الإدارة.
- `WHATSAPP_ACCESS_TOKEN` و`WHATSAPP_PHONE_NUMBER_ID` و`RESEND_API_KEY`: اختيارية للإشعارات الخارجية.

لتجهيز بيانات تجريبية، شغّل seed فقط بعد أخذ نسخة احتياطية:

```bash
ADMIN_EMAIL=admin@fuchsia.ye ADMIN_INITIAL_PASSWORD='ضع-كلمة-مرور-قوية-هنا' pnpm --filter @workspace/api-server exec tsx src/seed.ts
```

> seed يمسح بيانات الكتالوج والطلبات التجريبية قبل إعادة إنشائها. لا تشغّله على قاعدة إنتاج تحتوي بيانات مهمة.

## تطبيق العميل

تطبيق العميل المعتمد هو Android Native المبني بـKotlin وJetpack Compose. عنوان الخادم لا يُثبت داخل الكود:

```bash
cd apps/mobile/android
FUCHSIA_API_BASE_URL=https://your-domain.example.com ./gradlew :app:assembleDebug
```

## تطبيق الشريك

```bash
cd apps/partner/android
FUCHSIA_API_BASE_URL=https://your-domain.example.com ./gradlew :app:assembleDebug
```

لبناء إصدار Release يجب توفير ملف توقيع ومفاتيحه عبر متغيرات البيئة. لا ترفع ملف keystore إلى Git.

## النشر

يمكن نشر الخادم كحاوية Docker أو على Render/Railway/Fly.io/Cloud Run/أي خادم Node يدعم Docker. استخدم `Dockerfile` الموجود، واضبط `PORT` و`DATABASE_URL` والمتغيرات السرية من لوحة الاستضافة. تطبيقات Android تُبنى بشكل مستقل وتحتاج فقط إلى عنوان API المنشور.

## ملاحظة قاعدة البيانات

نسخة GitHub الحالية تستخدم MySQL عبر Drizzle. يمكن تشغيلها على أي مزود MySQL بإسناد `DATABASE_URL`. إذا أردت العودة إلى Supabase PostgreSQL، فهذا مشروع ترحيل منفصل ويتطلب تحويل مخططات Drizzle والاستعلامات والترحيلات؛ لا تضع رابط PostgreSQL في هذه النسخة الحالية.
