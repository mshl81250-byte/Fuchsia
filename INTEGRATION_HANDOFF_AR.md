# تعليمات التكامل الموحد — Fuchsia

## المصدر الوحيد للحقيقة

استخدم مستودع GitHub `mshl81250-byte/Fuchsia` على الفرع:

```text
integration/customer-partner-admin
```

هذا الفرع يجمع في نسخة واحدة متوافقة:

| المكوّن | المسار | الدور |
|---|---|---|
| API المشترك | `artifacts/api-server/` | المصادقة، المنتجات، الطلبات، الحجوزات، الإشعارات وقاعدة البيانات |
| لوحة التحكم الويب الجديدة | `artifacts/admin-dashboard/` | لوحة الإدارة الحديثة التي يجب نشرها عند طلب نشر الويب |
| تطبيق Android العميل | `apps/mobile/android/` | التطبيق الأصلي للعميل المبني بـ Kotlin وJetpack Compose |
| تطبيق Android الشريك | `apps/partner/android/` | تطبيق الشريك لإدارة المتجر والمنتجات والحجوزات |
| مكتبة التصميم Android | `apps/design-system/android/` | مكونات التصميم المشتركة بين تطبيقي Android |

`apps/mobile/` يحتوي أيضًا على مصدر Expo/React Native تاريخي. لا تستبدل به التطبيق الأصلي الموجود في `apps/mobile/android/` إلا بطلب صريح.

## قاعدة مهمة للمبرمج التالي

لا توزع العمل بين `Fuchsia` و`Fuchsia-Platform` ولا تنشئ نسخة مستقلة من لوحة الإدارة أو تطبيق الشريك. عدّل هذا الفرع الموحد، وحافظ على API المشترك، ثم ارفع كل مهمة مكتملة إلى GitHub مع commit واضح.

قبل أي تعديل:

```bash
git checkout integration/customer-partner-admin
git pull --ff-only origin integration/customer-partner-admin
git status --short --branch
```

لا تحذف تغييرات سابقة ولا تعيد بناء أحد المكونات من الصفر قبل مراجعة الملفات المشتركة وعقود API.

## الربط بين المكونات

المكونات الثلاثة لا تتصل ببعضها عبر اتصال مباشر من تطبيق إلى تطبيق؛ جميعها تستخدم API المشترك في `artifacts/api-server/`. لذلك:

- تطبيق العميل يستهلك API من خلال `apps/mobile/android/.../FuchsiaApi.kt`.
- تطبيق الشريك يستهلك API من خلال `apps/partner/android/.../PartnerApi.kt` و`PartnerRentalApi.kt`.
- لوحة الإدارة تستخدم عميل API المشترك في `lib/api-client-react/` وتعمل تحت المسار `/admin-dashboard/`.
- أي تغيير في endpoint أو payload أو حالة طلب يجب مراجعته في الخادم وتطبيق العميل وتطبيق الشريك ولوحة الإدارة المتأثرة قبل اعتماده.
- جلسات المستخدم والملكية والصلاحيات يتحقق منها الخادم؛ لا تثق في `storeId` أو `venueId` المرسل من العميل وحده.

العنوان الافتراضي الحالي للـAPI هو:

```text
https://fuchsia-x7dwxpzd.manus.space
```

للتطوير المحلي أو staging، استخدم عنوانًا واحدًا مشتركًا يمكن للأجهزة الثلاثة الوصول إليه:

- تطبيق العميل Expo: `EXPO_PUBLIC_API_BASE_URL`.
- تطبيق الشريك Android: `FUCHSIA_API_BASE_URL` عبر Gradle أو environment.
- لوحة الإدارة: استخدم إعداد Vite/بيئة الاستضافة، ولا تضع عنوانًا مختلفًا داخل الشيفرة دون توثيقه.

## نتيجة نشر لوحة الإدارة وربط التطبيقات

عند نشر لوحة الإدارة الجديدة على `/admin-dashboard/`، يستمر تطبيق Android العميل وتطبيق Android الشريك في العمل مباشرة **من دون إصدار Android جديد**؛ لأن التطبيقات الثلاثة تستخدم نفس الـAPI المشترك ونفس عقود المصادقة والطلبات والمنتجات والإشعارات. نشر واجهة الويب لا يغيّر APK/AAB المثبتة على أجهزة المستخدمين.

يشترط ذلك أن يكون الخادم الذي يشير إليه `API_BASE_URL` هو نسخة الـAPI المتوافقة مع هذا الفرع، وأن تكون migrations المطلوبة مطبقة. إذا كان تعديل لوحة الإدارة يحتاج endpoint جديدًا أو migration جديدة، انشر backend المتوافق أولًا أو كجزء من نفس عملية الإصدار، ثم انشر لوحة الإدارة. لا يحتاج تطبيقا Android إلى إعادة نشر طالما لم يتغير عقد API الذي يستخدمانه.

## سياسة النشر — مهمة جدًا

عند طلب **نشر الويب**، انشر **لوحة الإدارة الجديدة فقط** من:

```text
artifacts/admin-dashboard/
```

وتكون على المسار:

```text
/admin-dashboard/
```

لا تنشر تطبيق العميل Android أو تطبيق الشريك Android تلقائيًا، ولا تعتبر رفع مصدر Kotlin نشرًا لتطبيق الهاتف. تطبيقات Android تحتاج بناء APK/AAB وتوقيعًا وتوزيعًا منفصلًا فقط إذا طلب صاحب المشروع ذلك صراحة.

النشر الافتراضي هو لوحة الإدارة فقط، ولا يعيد نشر تطبيقات Android. إذا احتاجت لوحة الإدارة إلى تغيير backend جديد، يجب توضيح ذلك كاعتماد منفصل، اختبار migration، ثم نشر API المتوافق قبل/مع لوحة الإدارة. لا تشغّل migrations على الإنتاج دون مراجعة `DATABASE_URL` والنسخ الاحتياطي.

## أوامر التحقق الأساسية

من جذر المستودع:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
pnpm --filter @workspace/api-server test:product-images
pnpm run build:admin
```

تطبيق العميل الأصلي:

```bash
cd apps/mobile/android
./gradlew :app:assembleDebug --no-daemon
```

تطبيق الشريك:

```bash
cd apps/partner/android
./gradlew :app:assembleDebug --no-daemon \
  -PFUCHSIA_API_BASE_URL=https://<staging-host>
```

إذا لم يتوفر Android SDK، لا تدّعِ نجاح بناء Android؛ سجّل العائق بوضوح وشغّل فحوصات TypeScript/API المتاحة.

## Push Notifications للشريك

Push Notifications تستخدم Firebase Cloud Messaging بشكل اختياري:

- الخادم يحتاج `FCM_PROJECT_ID`, `FCM_CLIENT_EMAIL`, `FCM_PRIVATE_KEY` في مدير أسرار الخادم فقط.
- تطبيق الشريك يحتاج إعدادات Firebase العامة عند البناء.
- لا تضع service-account JSON أو مفتاح FCM الخاص داخل GitHub أو APK.
- مركز إشعارات قاعدة البيانات يبقى fallback عند تعطل Push.

## قواعد Git وGitHub

1. كل مهمة تطوير مكتملة يجب أن تكون commit مميزًا.
2. ادفع commit إلى الفرع الحالي بعد الاختبارات.
3. اذكر في التسليم: الملفات، الاختبارات، commit، وأي عائق بيئي.
4. لا تدمج إلى `main` ولا تنشئ نشرًا إنتاجيًا من دون طلب واضح.
5. لا ترفع `.env` أو مفاتيح Firebase أو مفاتيح توقيع Android أو بيانات العملاء.

## ترتيب الأولويات

ابدأ بمشاكل التكامل والعقود والاختبارات قبل إضافة شاشات جديدة. بعد ذلك حسّن حالات التحميل والأخطاء وإعادة المحاولة، ثم نفذ idempotency للعمليات الحساسة، ثم اختبارات Android وstaging. أي تعديل على المنتج أو الصور يجب أن يحافظ على سياسة: حتى 8 صور لكل منتج، والمنتج المكتمل الذي يحفظه الشريك ينشر مباشرة للعملاء دون موافقة إدارية.
