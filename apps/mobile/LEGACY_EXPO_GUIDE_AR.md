# مرجع النسخة القديمة: Fuchsia Boutique Expo / React Native

> **تنبيه:** هذا الملف يشرح عميل Expo القديم الموجود في `apps/mobile/app` فقط. النسخة الأصلية الحالية Android 1.3.0 تُبنى من `apps/mobile/android` باستخدام Kotlin وJetpack Compose. راجع [دليل المطور الحالي](./DEVELOPER_GUIDE_AR.md) قبل تعديل التطبيق أو بناء APK. احتُفظ بهذا الملف لصيانة الشيفرة القديمة عند الحاجة.

> **آخر تحديث:** 2026-10-06
> **الفرع:** `feat/android-expo-app`
> **المستودع:** `mshl81250-byte/Fuchsia-Platform`

هذا المستند هو مرجع المبرمج عند استكمال تطوير التطبيق. يشرح ما تم بناؤه، أين توجد الملفات، كيف يعمل التدفق، ما الذي يجب عدم تغييره، وكيفية تشغيل وفحص وبناء النسخة الجديدة.

---

## 1. تعريف المشروع

**Fuchsia Boutique** هو تطبيق Android عربي باتجاه RTL لمتجر فوشيا بوتيك في صنعاء. التطبيق ليس منصة متعددة المتاجر في تجربة العميل؛ المتجر المعروض للمستخدم هو متجر فوشيا بوتيك فقط، مع منتجاته وتصنيفاته وعروضه.

المشروع عبارة عن monorepo يحتوي على:

- تطبيق Android داخل `apps/mobile/`.
- واجهة المتجر الحالية داخل `artifacts/lamsa/`.
- خادم API داخل `artifacts/api-server/`.
- قاعدة البيانات ومخطط Drizzle داخل `lib/db/`.
- لوحة الإدارة داخل `artifacts/admin-dashboard/`.

> **قاعدة مهمة:** لا تضف متاجر أخرى إلى تجربة العميل. مسارات `stores.tsx` و`store/[id].tsx` موجودة للتوافق مع البنية السابقة، لكن الواجهة الحالية تعرض Fuchsia Boutique فقط.

---

## 2. اللغات والتقنيات

| المجال | التقنية / اللغة |
|---|---|
| تطبيق Android | React Native 0.81 + Expo SDK 54 |
| التوجيه | Expo Router 6 |
| لغة التطبيق | TypeScript وTSX |
| واجهة المستخدم | React Native components + `@expo/vector-icons` |
| الاتجاه | RTL عربي عبر `I18nManager` |
| التخزين الآمن | `expo-secure-store` |
| البصمة | `expo-local-authentication` |
| الموقع | `expo-location` |
| رفع الإيصالات | `expo-image-picker` + `multipart/form-data` |
| خادم API | Express 5 + TypeScript |
| قاعدة البيانات | MySQL |
| ORM | Drizzle ORM |
| التحقق | Zod / Drizzle-Zod |
| إدارة الحزم | pnpm workspace |
| بناء Android | Expo Prebuild + Gradle / Android SDK |

إصدارات تطبيق الجوال موجودة في `apps/mobile/package.json`، وقفل الاعتماديات في `pnpm-lock.yaml`.

---

## 3. شجرة تطبيق Android

```text
apps/mobile/
├── app/
│   ├── _layout.tsx                 # RTL، الثيم، زر الرجوع والخروج
│   ├── index.tsx                  # شاشتا الترحيب والشعار الشفاف
│   ├── auth.tsx                   # الدخول والتسجيل وOTP والبصمة
│   ├── (tabs)/
│   │   ├── _layout.tsx            # التبويبات السفلية
│   │   ├── index.tsx              # الرئيسية، التصنيفات، الإشعارات، العروض المتحركة
│   │   ├── store.tsx              # كتالوج Fuchsia Boutique والبحث
│   │   ├── orders.tsx              # قائمة الطلبات والحالات
│   │   └── profile.tsx             # معلومات الحساب وروابط الإعدادات والإشعارات
│   ├── product/[id].tsx            # تفاصيل المنتج والمفضلة والسلة
│   ├── category/[id].tsx           # منتجات التصنيف
│   ├── cart.tsx                   # السلة وتعديل الكميات
│   ├── checkout.tsx               # إتمام طلب السلة
│   ├── offer.tsx                  # تفاصيل عرض صندوق الخطوبة
│   ├── offer-checkout.tsx         # طلب العرض، GPS، رسالة، دفع وإيصال
│   ├── custom-order.tsx           # تجهيز هدية حسب الطلب عبر WhatsApp
│   ├── order-success.tsx          # نجاح إنشاء الطلب
│   ├── order/[id].tsx             # تفاصيل الطلب ورسالة الهدية والدفع
│   ├── favorites.tsx              # المفضلة
│   ├── notifications.tsx         # الإشعارات وتعليم القراءة
│   ├── settings.tsx               # البصمة، الثيم، الخصوصية، الشروط والتواصل
│   ├── privacy.tsx                # سياسة الخصوصية داخل التطبيق
│   ├── terms.tsx                  # شروط الاستخدام داخل التطبيق
│   ├── contact.tsx                # بيانات التواصل القديمة/التوافق
│   ├── stores.tsx                 # صفحة تعريف Fuchsia Boutique فقط
│   └── store/[id].tsx             # مسار توافق قديم؛ لا تستخدمه لإضافة متاجر جديدة
├── components/ui.tsx              # الأزرار والبطاقات والرؤوس وأيقونات السلة
├── lib/api.ts                     # عميل API ورفع الإيصال
├── lib/auth-storage.ts            # الجلسة والبصمة والثيم في SecureStore
├── lib/theme.ts                   # الألوان والأنماط والثيم الديناميكي
├── assets/branding/               # الشعار الأصلي وأيقونة التطبيق
├── assets/offers/                 # صورة عرض صندوق الخطوبة
├── app.json                       # اسم التطبيق والأيقونة وBase URL
├── eas.json                       # إعدادات EAS المستقبلية
└── README.md                      # تعليمات مختصرة
```

---

## 4. ما تم تنفيذه في التطبيق

### 4.1 الهوية والتصميم

- اسم التطبيق الرسمي: **Fuchsia Boutique**.
- الشعار الأصلي محفوظ في:
  - `apps/mobile/assets/branding/fuchsia-logo-source.png`
  - `apps/mobile/assets/branding/fuchsia-app-icon.png`
- الشعار يظهر بدون بطاقة أو خلفية بيضاء في الترحيب والرئيسية وتسجيل الدخول.
- ألوان فوشيا/وردي/خمري، بطاقات مستديرة، ظلال خفيفة، RTL.
- أيقونات Ionicons بدل الرموز النصية في التنقل والأزرار.
- زر رجوع موحد في الرؤوس يعيد إلى الرئيسية.
- زر Android الخلفي:
  1. إذا كان المستخدم داخل صفحة يعيده إلى الرئيسية.
  2. عند وجوده في الرئيسية، الضغط الأول يعرض تنبيهًا.
  3. الضغط الثاني خلال ثانيتين يعرض: **هل تريد الخروج من التطبيق؟** مع إلغاء/خروج.

### 4.2 الصفحة الرئيسية

تحتوي على:

- الشعار واسم Fuchsia Boutique.
- زر الإشعارات.
- زر السلة.
- زر العروض والخصومات في الأعلى؛ لا يفتح صفحة جديدة، بل ينقل التمرير داخل الرئيسية إلى قسم العرض.
- ستة اختصارات:
  - هدايا: `/category/4`
  - زهور: `/category/6`
  - صناديق الخطوبة: `/category/2`
  - حجز كوش: `/category/1`
  - طاولات مناسبات: `/category/3`
  - هدية حسب الطلب: `/custom-order`
- شريط عروض تلقائي يتبدل كل 4.5 ثوانٍ بين:
  - عرض صندوق الخطوبة الحقيقي.
  - هدايا فاخرة جديدة.
  - زهور جديدة.
- نقاط توضح الشريحة الحالية، والضغط على الشريحة يفتح تفاصيلها أو التصنيف المناسب.

قائمة التصنيفات القادمة من API حاليًا:

| ID | التصنيف |
|---:|---|
| 1 | كوش الأعراس |
| 2 | تجهيز الخطوبة |
| 3 | الطاولات |
| 4 | الهدايا الفاخرة |
| 5 | التغليف الفاخر |
| 6 | الورود والزهور |

### 4.3 الحساب والإعدادات

- تعديل الاسم والهاتف والعنوان من `profile.tsx`.
- زر إشعارات واضح في رأس الحساب.
- تفعيل الدخول بالبصمة:
  - يتحقق من وجود مستشعر/enrollment في الجهاز.
  - يطلب بصمة حقيقية عند التفعيل.
  - يحفظ حالة التفعيل في SecureStore.
  - يظهر زر **الدخول بالبصمة** في شاشة الدخول بعد وجود جلسة سابقة.
- الوضع الليلي والنهاري:
  - محفوظ في SecureStore.
  - نظام الألوان والأنماط موجود في `lib/theme.ts`.
  - يمكن التبديل من الإعدادات.
- سياسة الخصوصية داخل `privacy.tsx`.
- شروط الاستخدام داخل `terms.tsx`.
- عنوان المحل ورقم `778360009` وأزرار الاتصال وWhatsApp تحت سياسة الخصوصية في الإعدادات.

### 4.4 المصادقة وOTP

التدفق الحقيقي:

- تسجيل دخول بالبريد وكلمة المرور.
- إنشاء حساب جديد.
- طلب رمز تحقق.
- إدخال الرمز والتحقق.
- الدخول كزائر.
- حفظ الجلسة عبر SecureStore.

**الاستثناء التجريبي الوحيد:** OTP.

أثناء الاختبار يرسل التطبيق الترويسة:

```http
X-Fuchsia-OTP-Debug: true
```

ويعرض `debugCode` داخل شاشة التحقق عندما يسمح الخادم بذلك. قبل الإنتاج يجب:

1. إزالة الترويسة من `apps/mobile/app/auth.tsx`.
2. تعطيل `MOBILE_OTP_DEBUG` في خادم API.
3. التأكد من إعداد البريد الحقيقي (`RESEND_API_KEY` و`EMAIL_FROM`).

لا تجعل أي وظيفة أخرى وهمية أو تجريبية.

### 4.5 السلة والطلب العادي

- إضافة منتج للسلة.
- تعديل الكمية والحذف عبر كمية صفر.
- إتمام الطلب بالاسم والهاتف والعنوان.
- تحديد GPS عبر `expo-location`.
- الدفع عند التوصيل أو الدفع الجزئي/الكامل عبر محفظة.
- إدخال رقم العملية ورفع الإيصال.
- إرسال الطلب إلى `POST /api/orders`.
- إظهار الطلب في قائمة الطلبات وحالته.

### 4.6 عرض صندوق الخطوبة

بيانات العرض الحالية:

- صندوق خطوبة وسط مقاس `60×40`.
- مصحف.
- صندوق الذهب.
- التغليف.
- كتابة الأسماء.
- تزيين الصندوق.
- السعر القديم: `55,000 ريال`.
- السعر الحالي: `45,000 ريال`.

زر **اطلب هذا العرض الآن** يفتح `offer-checkout.tsx`، وليس مجرد عرض صورة.

طلبات العرض:

- الدفع عند التوصيل غير مسموح.
- الدفع الجزئي: `22,500 ريال`.
- الدفع الكامل: `45,000 ريال`.
- يجب اختيار محفظة.
- يجب إدخال رقم العملية.
- يجب رفع إيصال.
- يجب إدخال رسالة الهدية.
- يمكن إدخال اسم مستلم الهدية.
- يجب إدخال عنوان التوصيل وتحديد GPS.
- ينشأ الطلب بحالة `received` ودفع `pending_review`.
- يظهر في قائمة الطلبات وتفاصيل الطلب مع الرسالة والدفع والموقع.

Endpoint العرض:

```http
POST /api/orders/offer
```

### 4.7 تجهيز هدية حسب الطلب

`custom-order.tsx` يجمع:

- الاسم.
- رقم الهاتف.
- تفاصيل الهدية والمناسبة والميزانية التقريبية.

ثم يفتح WhatsApp برسالة جاهزة إلى رقم Fuchsia Boutique `967778360009`. هذا المسار مناسب للطلبات التي تحتاج تسعيرًا وتصميمًا يدويًا قبل إنشاء طلب مالي.

---

## 5. خادم API والتغييرات الخاصة بالتطبيق

المسارات المهمة في `artifacts/api-server/src/routes/`:

| الملف | الوظيفة |
|---|---|
| `auth.ts` | الدخول، الزائر، التسجيل، OTP التجريبي، الملف الشخصي |
| `products.ts` | المنتجات والتصنيفات والمنتجات المميزة |
| `categories.ts` | قائمة التصنيفات |
| `cart.ts` | السلة وتعديل الكمية |
| `orders.ts` | الطلب العادي وطلب العرض وحالات الطلب |
| `uploads.ts` | رفع إيصال الدفع والتحقق من النوع والحجم |
| `payment-wallets.ts` | المحافظ وأرقام الحساب والتعليمات |
| `notifications.ts` | الإشعارات وتعليمها كمقروءة |
| `favorites.ts` | المفضلة |
| `stores.ts` | توافق البنية السابقة؛ لا تعرضه للعميل كمتاجر متعددة |
| `promotions.ts` | بيانات العروض المتاحة للخادم |

### أهم endpoints

```text
GET  /api/healthz
POST /api/auth/login
POST /api/auth/guest
POST /api/auth/register/request-code
POST /api/auth/register/verify-code
GET  /api/products
GET  /api/products/featured
GET  /api/categories
GET  /api/payment-wallets
GET  /api/cart?sessionId=...
POST /api/cart
PATCH /api/cart/:id
POST /api/uploads/receipt
POST /api/orders
POST /api/orders/offer
GET  /api/orders?sessionId=...
GET  /api/orders/:id
GET  /api/notifications?sessionId=...
PATCH /api/notifications/:id/read
```

### عقد طلب العرض باختصار

يحتاج `POST /api/orders/offer` إلى:

```json
{
  "sessionId": "...",
  "userId": 123,
  "customerName": "...",
  "customerPhone": "...",
  "deliveryAddress": "...",
  "deliveryLatitude": 15.3694,
  "deliveryLongitude": 44.191,
  "paymentType": "partial",
  "paymentMethod": "wallet_1",
  "paymentWalletId": 1,
  "paymentAmount": 22500,
  "transactionReference": "TEST-123",
  "paymentReceiptUrl": "https://...",
  "giftRecipientName": "...",
  "giftMessage": "..."
}
```

الخادم يتحقق من نطاق GPS داخل صنعاء، وصحة نوع الدفع، وتطابق المبلغ، والمحفظة النشطة، ووجود الإيصال والرسالة.

---

## 6. التشغيل المحلي

من جذر المشروع:

```bash
pnpm install --ignore-scripts
pnpm --filter @workspace/mobile start
```

فحص TypeScript:

```bash
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm run typecheck
```

تصدير Expo للتأكد من bundling:

```bash
rm -rf apps/mobile/dist
pnpm --filter @workspace/mobile exec expo export --platform android
```

بناء واجهة وخادم المشروع الأصليين:

```bash
PORT=3000 BASE_PATH=/ pnpm run build
```

عنوان API الافتراضي في `apps/mobile/app.json`:

```text
https://fuchsia-x7dwxpzd.manus.space
```

يمكن تغييره عبر إعدادات المشروع أو `EXPO_PUBLIC_API_BASE_URL` حسب إعداد `lib/api.ts`.

---

## 7. بناء تطبيق Android الأصلي

تطبيق Android صار يُبنى من مصدر Kotlin في `apps/mobile/android` باستخدام Jetpack Compose وNavigation Compose. لا تشغّل Expo Prebuild على هذا المجلد؛ فهو مصدر Android أصلي وليس مجلدًا مولّدًا.

المتطلبات: JDK 17+ وAndroid SDK Platform 37 وBuild Tools 36.0.0.

```bash
cd apps/mobile/android
printf 'sdk.dir=%s\n' "$HOME/android-sdk" > local.properties
./gradlew :app:assembleDebug
```

لبناء APK Release بمفتاح Fuchsia المحلي:

```bash
cd apps/mobile
./scripts/build-release-apk.sh
```

الناتج: `apps/mobile/android/app/build/outputs/apk/release/app-release.apk`.

إصدار Compose الحالي يحافظ على معرّف التطبيق `com.fuchsia.platform` ومفتاح Release نفسه للنسخة السابقة، ويستخدم `versionCode = 3` كي يُثبّت كتحديث فوق التطبيق السابق. يشمل الآن السلة والدفع والهدية وحجز الطاولة؛ حجز الطاولات على الإنتاج يتطلب نشر مسار API وتطبيق مخطط قاعدة البيانات أولًا. ملف APK السابق محفوظ في `artifacts/mobile-build/Fuchsia-Platform-boutique-final-release.apk`.

> لا ترفع APK ثنائيًا إلى Git عادةً. استخدم GitHub Releases أو تخزين ملفات منفصل إذا أردت توزيع النسخة على الفريق.

---

## 8. قائمة اختبار قبل أي تسليم

### فحص سريع

- [ ] `pnpm --filter @workspace/mobile run typecheck`
- [ ] `pnpm --filter @workspace/api-server run typecheck`
- [ ] `git diff --check`
- [ ] `pnpm --filter @workspace/mobile exec expo export --platform android`
- [ ] `PORT=3000 BASE_PATH=/ pnpm run build`

### اختبار العميل

- [ ] شاشة الترحيب تظهر الشعار بدون خلفية بيضاء.
- [ ] التسجيل يعرض OTP التجريبي فقط في بيئة الاختبار.
- [ ] الدخول العادي يعمل.
- [ ] الدخول بالبصمة يعمل بعد تفعيله ومن جهاز يدعمها.
- [ ] الوضع الليلي والنهاري يحفظان الاختيار.
- [ ] زر الإشعارات يفتح القائمة.
- [ ] زر السلة يعمل.
- [ ] أيقونات التصنيفات تفتح التصنيف الصحيح.
- [ ] زر العروض يمرر داخل الرئيسية ولا يفتح صفحة مستقلة.
- [ ] الشرائح تتقلب تلقائيًا كل 4.5 ثوانٍ.
- [ ] زر طلب العرض يطلب GPS والرسالة والدفع والإيصال.
- [ ] طلب العرض يظهر في الطلبات.
- [ ] الرسالة تظهر في تفاصيل الطلب.
- [ ] الهدية حسب الطلب تفتح WhatsApp برسالة منظمة.
- [ ] العنوان ورقم التواصل موجودان داخل الإعدادات أسفل سياسة الخصوصية.
- [ ] زر الرجوع يعيد إلى الرئيسية.
- [ ] الضغط المزدوج على زر Android في الرئيسية يعرض تأكيد الخروج.

### اختبار الدفع

استخدم جلسة اختبار وإيصالًا غير حقيقيًا ومرجعًا مثل `TEST-...`. لا تنفذ تحويلًا ماليًا حقيقيًا أثناء التطوير.

---

## 9. ما يجب تطويره لاحقًا

1. إزالة OTP Debug وتفعيل إرسال البريد الحقيقي قبل الإنتاج.
2. ربط الموافقات/الرفض على الدفع من لوحة الإدارة بشكل كامل مع إشعار العميل.
3. إضافة مخزن/كتالوج Fuchsia Boutique الحقيقي بدل بيانات seed التجريبية الحالية إن كانت ما زالت موجودة.
4. عدم عرض بيانات المتاجر seed القديمة في أي شاشة عميل.
5. إضافة اختبارات تكامل لـ `POST /api/orders/offer`.
6. إضافة CI يشغل typecheck وExpo export وbuild عند فتح Pull Request.
7. استخدام migrations منظمة لقاعدة البيانات بدل `db push` في الإنتاج.
8. إضافة نظام رفع صور مخصص للمنتجات والعروض مع CDN.
9. إضافة pagination للمنتجات والإشعارات والطلبات.
10. إضافة صلاحيات API مرتبطة بجلسة موثقة بدل الثقة في `sessionId` أو `userId` المرسل من العميل فقط.

---

## 10. قواعد مهمة للمبرمج القادم

- لا تغيّر `DATABASE_URL` أو الأسرار داخل التطبيق.
- لا تضع مفاتيح الإدارة أو قاعدة البيانات في `apps/mobile`.
- لا تجعل OTP التجريبي يعمل في الإنتاج.
- حافظ على RTL والنصوص العربية.
- لا تضف متجرًا جديدًا إلى واجهة العميل؛ هذا تطبيق Fuchsia Boutique فقط.
- لا تحذف حقول `giftMessage` أو GPS أو `paymentReceiptUrl` من عقد الطلب.
- أي تغيير في `orders.ts` يجب أن يراجع تدفق الدفع والحالات والإشعارات.
- أي تغيير في `theme.ts` يجب أن يختبر النهاري والليلي.
- أي تغيير في `app.json` أو الاعتماديات يجب أن يتبعه Expo export وبناء Android.
- لا ترفع `.env` أو إيصالات حقيقية أو ملفات `android/` المولدة إلا إذا كان ذلك مقصودًا ومراجعًا.

---

## 11. آخر نقطة مرجعية في Git

آخر سلسلة تطوير رئيسية في فرع Android:

```text
85992c8 feat: add autoplaying home promo carousel
fee7517 feat: keep offers inline on boutique home
46e358a feat: add boutique category shortcuts and custom gift requests
fb57a62 feat: add biometric login themes and legal pages
bdf3c30 feat: complete boutique offer ordering and navigation UX
```

عند بدء مهمة جديدة، ابدأ من فرع `feat/android-expo-app`، اقرأ هذا الملف، ثم افحص `git status` و`git log` قبل تعديل أي ملف.
