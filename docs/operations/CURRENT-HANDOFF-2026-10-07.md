# مذكرة تسليم Fuchsia Boutique — الحالة الحالية

**آخر تحديث:** 2026-10-07
**المستودع:** `mshl81250-byte/Fuchsia-Platform`
**الفرع الجاري:** `feat/android-expo-app`
**Commit تحديثات Android:** `523b810` (`fix(android): add safe venue previews and dark rental polish`)
**حالة المصدر:** تحديثات التطبيق موجودة على الفرع؛ تُرفع هذه المذكرة إلى الفرع نفسه بCommit توثيق مستقل.
**مهم:** لم يتم نقل هذه التغييرات إلى `main`، ولم يُنشر تحديث backend في الخادم الحي.

## الملخص التنفيذي

تطبيق Android يحتوي الآن على مسار بيع منفصل عن الإيجار، وشارات وأيقونات للكوش والطاولات، وتحسينات للوضع الليلي، وواجهة تقويم القاعات والحجز. أُضيفت **خمس قاعات محلية للمعاينة داخل APK Debug** لأن واجهة API الحية للقاعات ترجع 404. هذه القاعات ليست سجلاتًا في قاعدة بيانات الخادم، ونموذجها التجريبي لا يرسل طلب حجز ولا دفعة.

تم بناء ملف APK والتحقق من توقيعه:

- **Version name:** `1.3.2-debug`
- **Version code:** `7`
- **Package:** `com.fuchsia.platform.debug` (تُثبت كتطبيق Debug مستقل)
- **المخرج المحلي:** `/home/ubuntu/Fuchsia-Boutique-debug-direct-rental.apk`
- الملف غير مضاف إلى Git؛ يُسلّم منفصلًا عن الشيفرة المصدرية.

## أين توجد الشيفرة على GitHub؟

الفرع الحالي: [`feat/android-expo-app`](https://github.com/mshl81250-byte/Fuchsia-Platform/tree/feat/android-expo-app)

PR #3 دُمج سابقًا **إلى هذا الفرع**، وليس إلى `main`. أحدث تحديث Android بعده هو `523b810`. لا تدمج إلى `main` أو تنشر إلى الإنتاج من دون اتفاق صاحب المشروع على هدف النشر.

## ما هو موجود في Android الآن؟

- المبيعات تبقى ضمن السلة؛ الإيجارات تسلك حجزًا مباشرًا ولا تُحوّل إلى شراء عادي.
- شارة الكوش تستخدم `Weekend`، وشارة الطاولات تستخدم `TableRestaurant`، مع تسمية «إيجار كوش/إيجار طاولات». الشارات تظهر في الصفحة الرئيسية والفئات وتفاصيل المنتج.
- عند غياب `rentalCategory`، يحاول العميل تمييز «كوش» و«طاولات» من الاسم والوصف والفئة والوسوم.
- تفاصيل الإيجار تشمل تاريخ البداية، المدة، الكمية، السعر اليومي، ملخص التكلفة، التأمين المسترد، الاستلام/التوصيل، وفترة صباحية/مسائية.
- تحسينات الوضع الليلي تشمل نصوصًا بيضاء، تباين حقول أفضل، وتصحيح خلفيات الاختيارات حتى لا يصبح النص أبيض على أبيض.
- حجز القاعات يدعم الجمهور النسائي/الرجالي بحسب إعداد القاعة، المدة متعددة الأيام، وفحص تعارض الأيام في التقويم.
- شاشة «مساحة الشريك» وواجهات إدارة القاعات والتوفر موجودة في المصدر؛ لا يعني وجودها أن الخادم الحي المحدد يحتوي النسخة نفسها.

## بيانات المعاينة الخمس — تنبيه مهم

في APK Debug، إذا أعاد `GET /api/venues` الرمز 404، يعرض التطبيق خمس قاعات اختبار ذات IDs سالبة `-1001..-1005`. التقويم يولّد أيام إشغال محلية متحركة ليظهر فحص المدة والجمهور. صفحة القاعة تعرض تحذير «معاينة فقط» وزر تأكيد شكليًا، ولا تتصل بإنشاء حجز أو دفع.

وبالمثل، إذا أعاد endpoint توفر الإيجار 404 في Debug، يستخدم التطبيق قيمة معاينة موسومة بوضوح؛ تمريرها إلى Checkout يوقف الإرسال ويعرض أن الحجز لم يُسجل. **لا تعتمد هذه القيم لتأكيد مخزون أو حجز فعلي.**

يوجد أيضًا سكربت server-side مستقل لزرع بيانات staging: `artifacts/api-server/src/seed-demo.ts`، ويتضمن خمس قاعات وستة عناصر تأجير وأحداث تقويم تجريبية. **لم يُشغّل** لعدم توفر اتصال قاعدة staging في هذه المهمة. تعليماته وحماياته في [`docs/operations/demo-data.md`](demo-data.md). يرفض السكربت العمل ما لم تكن البيئة غير إنتاجية، واسم قاعدة البيانات مناسبًا، وتُمرر قيمة التأكيد `SEED_DEMO_ONLY`.

## حالة الخادم الحي والنشر

عنوان API المضمّن في APK هو `https://fuchsia-x7dwxpzd.manus.space`. فُحص `GET /api/venues` في 2026-10-07 وأعاد:

```text
HTTP 404 — Cannot GET /api/venues
```

كود المستودع يضم router للقاعات، وحجوزاتها، والإيجارات ومساحة الشريك، لكن المشروع المنشور غير مربوط حاليًا بجلسة WebDev (`not_attached`). لذلك لم يتم نشر API أو تشغيل migrations أو زرع بيانات في قاعدة حية. سبب 404 المرجح أن الخادم المنشور لا يحمل النسخة المطابقة، لكن يلزم فحص بيئة الاستضافة لتأكيد السبب.

### مسارات العميل المتوقعة

- `GET /api/venues` — قائمة القاعات.
- `GET /api/venues/:id` — التفاصيل.
- `GET /api/venues/:id/availability?month=YYYY-MM&audience=women|men` — التوفر؛ يطلب العميل الشهر الحالي والتالي.
- `POST /api/venue-bookings` — طلب حجز القاعة.
- `GET /api/rental-bookings/availability?productId=...&startDate=YYYY-MM-DD&days=...` — توفر الإيجار.
- `POST /api/rental-bookings` — إنشاء حجز إيجار.
- مسارات الشريك تحت `/api/venue-partner/...`.

تأكد من توافق عقد JSON بين العميل والخادم قبل النشر؛ لا يكفي أن ترجع المسارات 200.

## مهام المبرمج التالية

1. استعادة الوصول إلى مشروع الاستضافة الحالي وربطه بالمستودع/الفرع المستهدف. اتفق مع صاحب المشروع على هدف النشر؛ `main` لم يتغير.
2. التحقق من سبب غياب `GET /api/venues` في الخادم المنشور، ثم نشر نسخة backend المناسبة بعد مراجعة إعدادات التشغيل.
3. تشغيل migrations على قاعدة **staging منفصلة** والتحقق من الجداول والصلاحيات.
4. عند اعتماد staging فقط، تشغيل `seed:demo` حسب [`docs/operations/demo-data.md`](demo-data.md). لا تشغّل بيانات المعاينة على قاعدة إنتاج.
5. اختبار المسارات المذكورة وتقويم الشهرين، اختلاف `women/men`, الحجز متعدد الأيام، idempotency، التعارض، والـ30-minute hold.
6. اختبار APK على جهاز Android فعلي، ثم إعادة بناء APK بعد أن ترجع API الحية بيانات staging. راجع أن بيانات المعاينة تختفي لصالح IDs حقيقية.
7. عند إعداد إصدار إنتاجي، راجع إعدادات التوقيع وغيّر `OTP_DEBUG` من إعدادات التطوير إلى القيمة المناسبة للإنتاج. APK المرفق **Debug وغير مخصص للنشر على المتجر**.

## ملفات مفيدة

```text
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/data/FuchsiaApi.kt
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/ui/screens/VenueBookingScreen.kt
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/ui/screens/ProductDetailsScreen.kt
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/ui/screens/CheckoutScreen.kt
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/ui/screens/CommerceComponents.kt
apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/ui/theme/Theme.kt
artifacts/api-server/src/routes/venue-bookings.ts
artifacts/api-server/src/routes/venue-partner.ts
artifacts/api-server/src/routes/rental-bookings.ts
artifacts/api-server/src/seed-demo.ts
lib/db/src/schema/venues.ts
docs/operations/demo-data.md
docs/operations/image-storage.md
```

## تحقق هذه النسخة

- `./gradlew :app:assembleDebug --no-daemon`: **نجح**.
- `aapt`: أكد الحزمة `com.fuchsia.platform.debug` والإصدار `1.3.2-debug` ورقم النسخة `7`.
- `apksigner verify`: **نجح** (APK debug موقّع بمفتاح Debug).
- `git diff --check`: **نجح** قبل دفع `523b810`.
- اختبار يدوي على جهاز حقيقي: **لم يُنفذ من بيئة البناء**.
- نشر backend وزرع staging: **لم يُنفذا**؛ Endpoint القاعات الحي يرجع 404 ولا يوجد اتصال WebDev/DB مربوط في المهمة.
