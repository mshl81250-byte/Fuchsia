# Fuchsia Partner — المرحلة الثانية (امتدادًا للمرحلة الأولى)

**الحالة الحالية:** تطبيق Android مستقل مبني بـKotlin وJetpack Compose. المرحلة الثانية أضافت إدارة منتجات الإيجار وحجوزاتها إلى تطبيق الشريك. الشيفرة تُرفع إلى فرع `feat/android-expo-app` فقط؛ لا يوجد دمج إلى `main` ولا نشر للخادم ضمن هذا العمل. ملف التسليم هو APK **Debug** للمعاينة والاختبار، وليس إصدارًا إنتاجيًا.

**آخر تحقق منشور معروف:** في 2026-10-08 أعاد `GET /api/venue-partner/me` من الخادم الحي `HTTP 404 Cannot GET`. لذلك لا أصف عمليات الإدارة الحقيقية بأنها متاحة على الخادم حتى تُنشر مسارات API وتُختبر على staging. وضع المعاينة في APK يعرض بيانات محلية موسومة ولا يكتب إلى الخادم.

## وظائف التطبيق

### إدارة القاعات — المرحلة الأولى

- دخول بحساب Fuchsia الحالي، مع تخزين رمز الجلسة عبر Android Keystore.
- اختيار القاعة والجمهور، وتقويم شهري يبيّن الأيام المتاحة والمغلقة والحجوزات.
- ضبط الدوام الأسبوعي، وإغلاق فترة بسبب، وإعادة فتح الأيام المغلقة.
- مراجعة طلبات حجز القاعات وتفاصيلها، ثم قبولها أو رفضها مع سبب.

### إدارة الكوش والطاولات — المرحلة الثانية

- مساحة مستقلة لمتجر الإيجار داخل تطبيق الشريك، بما يسمح لصاحب متجر الإيجار باستخدام التطبيق دون اشتراط امتلاك قاعة.
- كتالوج منتجات الإيجار: إضافة كوش أو طاولات، تعديل البيانات، حفظ كمسودة، ونشر/إيقاف نشر المنتج.
- بيانات المنتج: الاسم والوصف، تصنيف المتجر، الجمهور (نسائي/رجالي/كلاهما)، السعر اليومي، التأمين الاختياري، المخزون، وحدود مدة الإيجار.
- للطاولات: ارتفاع الطاولة بالسنتيمتر والألوان المتاحة والكمية.
- عدد الصور اختياري لكل منتج، بحد أقصى 8 صور؛ الصيغ المقبولة JPG وPNG وWebP وبحد أقصى 7 ميغابايت لكل صورة. يلزم إضافة صورة واحدة على الأقل عند النشر.
- عرض حجوزات التأجير الواردة مع العميل، التاريخ والمدة والكمية، التسليم، المبالغ، حالة مراجعة الدفع، رقم العملية والإيصال عند توفره.
- دورة الطلب: تأكيد التوفر أو رفض الطلب مع سبب، ثم بدء التجهيز، وتسجيل التسليم، وتأكيد الاسترجاع. يرفض الخادم الانتقالات غير الصالحة ويحفظ الحدث ويرسل إشعارًا للعميل.
- إجراء المتجر لا يعتمد الدفعة المالية. مراجعة الإيصال واعتماد الدفع تبقيان لمسار الإدارة المالية.
- معاينة محلية داخل Debug فقط؛ بطاقات المنتجات والحجوزات التجريبية لا تُرسل أو تُحفظ ولا ترفع صورًا.

## مسارات API

### القاعات والشريك

- `GET /api/venue-partner/me`
- `POST /api/venue-partner/owner-request`
- `GET /api/venue-partner/bookings`
- `PATCH /api/venue-partner/bookings/:id`
- `GET /api/venue-partner/venues/:id/calendar?month=YYYY-MM&audience=women|men`
- `GET|PUT /api/venue-partner/venues/:id/availability`
- `GET|POST /api/venue-partner/venues/:id/blackouts?month=YYYY-MM`
- `DELETE /api/venue-partner/venues/:id/blackouts/:blackoutId`

### المتاجر والإيجار

- `GET /api/vendor/stores`
- `GET|POST /api/vendor/products?storeId=:id` — الإنشاء يحفظ المنتج كمسودة.
- `PATCH /api/vendor/products/:id` — تحديث حقول المنتج أو النشر/إيقاف النشر؛ الخادم يتحقق من اكتمال الصورة والمخزون ومواصفات الطاولة قبل النشر.
- `GET /api/vendor/rental-bookings?storeId=:id`
- `PATCH /api/vendor/rental-bookings/:id` — قرارات `confirmed`, `rejected`, `preparing`, `out`, `returned` مع انتقالات محددة حسب الحالة؛ سبب الرفض مطلوب.
- `GET /api/categories`
- `POST /api/uploads/image` مع `purpose=rental` و`storeId`.

يتحقق الخادم من جلسة المستخدم وملكية المتجر/المنتج والحجز. الطلب الذي يحوي عناصر من متجر آخر أو عناصر غير تأجير لا يمر عبر مسار قرار المتجر.

## متطلبات قبل تجربة بيانات حقيقية

1. نشر تغييرات `artifacts/api-server/src/routes/vendor.ts`, `venue-partner.ts`, `uploads.ts` و`rental-bookings.ts` إلى **staging** أولًا، وربط المسارات ضمن `artifacts/api-server/src/routes/index.ts`.
2. تطبيق/التحقق من migrations الحالية لقاعدة البيانات، والتأكد من وجود أعمدة الإيجار في `products` و`order_items` وأحداث الطلبات.
3. إعداد مزود S3-compatible في أسرار الخادم فقط: `OBJECT_STORAGE_ENDPOINT`, `OBJECT_STORAGE_REGION`, `OBJECT_STORAGE_BUCKET`, `OBJECT_STORAGE_ACCESS_KEY_ID`, `OBJECT_STORAGE_SECRET_ACCESS_KEY`, `OBJECT_STORAGE_PUBLIC_BASE_URL`. تفاصيل الضبط في [`image-storage.md`](./image-storage.md). لا تُضمّن أسرارًا في APK أو GitHub.
4. إنشاء حساب مستخدم مالك وربطه بمتجر فعلي، والتأكد من وجود تصنيفات منتجات الكوش والطاولات، ثم اختبار الرفع والنشر والحجز من طرف العميل.
5. اختبار حالات الرفض مع السبب، وكل انتقال للحجز، والتكرار المتزامن، ومراجعة الدفع منفصلة، وإشعارات العميل. لا تُجرى هذه الاختبارات على بيانات إنتاجية.
6. إعادة بناء APK بعنوان staging بعد نشر الخادم، مثل: `./gradlew :app:assembleDebug -PFUCHSIA_API_BASE_URL=https://<staging-host>`.

## البناء والفحوصات

من `apps/partner/android`:

```bash
ANDROID_HOME=/usr/lib/android-sdk ANDROID_SDK_ROOT=/usr/lib/android-sdk ./gradlew :app:assembleDebug --no-daemon
```

خرج البناء: `apps/partner/android/app/build/outputs/apk/debug/app-debug.apk`. الإصدار الذي يجري بناؤه للمرحلة الثانية هو **0.2.0 (versionCode 2, Debug)**. عنوان API الافتراضي في Gradle هو عنوان Fuchsia الحالي، لكن وجود العنوان في الإعداد لا يعني أن مسارات المرحلة الثانية منشورة أو جاهزة للإنتاج.

من جذر المستودع:

```bash
PORT=3000 BASE_PATH=/ pnpm run build
```

## ملفات المرحلة الثانية

- `apps/partner/android/app/src/main/java/com/fuchsia/partner/PartnerRentalApi.kt`
- `apps/partner/android/app/src/main/java/com/fuchsia/partner/RentalPartnerScreens.kt`
- `apps/partner/android/app/src/main/java/com/fuchsia/partner/MainActivity.kt`
- `artifacts/api-server/src/routes/vendor.ts`
- `artifacts/api-server/src/routes/venue-partner.ts`
- `artifacts/api-server/src/routes/uploads.ts`
- `artifacts/api-server/src/routes/rental-bookings.ts`
