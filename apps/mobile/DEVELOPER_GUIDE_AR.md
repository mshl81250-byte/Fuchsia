# دليل تسليم وتطوير Fuchsia Boutique Android

> **هذا هو الدليل المعتمد للنسخة الأصلية Kotlin/Compose.** آخر تحديث: 2026-10-06.
> المستودع: [`mshl81250-byte/Fuchsia-Platform`](https://github.com/mshl81250-byte/Fuchsia) — الفرع: [`feat/android-expo-app`](https://github.com/mshl81250-byte/Fuchsia/tree/feat/android-expo-app).
> النسخة الموثقة: `1.3.0`، `versionCode 5`، `applicationId com.fuchsia.platform`.

## قبل البدء: أي فرع وأي تطبيق؟

أحدث تطبيق Android أصلي موجود على فرع **`feat/android-expo-app`**، وليس بعدُ على الفرع الافتراضي `main`. لاستنساخه مباشرة:

```bash
git clone --branch feat/android-expo-app --single-branch \
  https://github.com/mshl81250-byte/Fuchsia.git
cd Fuchsia-Platform
```

إذا كان المستودع مستنسخًا مسبقًا:

```bash
git switch feat/android-expo-app
git pull --ff-only
```

المصدر الذي ينتج APK الحالي هو `apps/mobile/android/` (Kotlin وJetpack Compose). توجد أيضًا شيفرة Expo قديمة في `apps/mobile/app/` لأغراض التوافق/المرجع؛ **لا تستخدم أوامر Expo لبناء APK الأصلي الحالي**. توثيق النسخة القديمة محفوظ في [`LEGACY_EXPO_GUIDE_AR.md`](./LEGACY_EXPO_GUIDE_AR.md).

## 1. ما يتضمنه التسليم

- تطبيق Android أصلي بواجهات عربية RTL وشعار فوشيا، مع صفحات ترحيب من خطوتين للتثبيت الجديد فقط.
- تسجيل الدخول والتسجيل والتحقق من OTP، بالإضافة إلى جلسة زائر ينشئها الخادم.
- تبويبات رئيسية ثابتة: الرئيسية، طلباتي، حسابي، الإعدادات، مع انتقالات تحمل هوية المتجر.
- كتالوج وسلة وإتمام طلب وهدايا، ودفع عند الاستلام أو دفع يدوي مع رفع الإيصال.
- اختيار موقع حقيقي بخريطة MapLibre/OpenFreeMap وGPS، وحفظ عناوين متعددة للحساب.
- تتبع الطلبات من سجل أحداث API، وحجز الطاولات وإدارة الحجوزات من لوحة الإدارة.
- إعدادات الحساب والمظهر الفاتح/الداكن وقفل الجهاز بالمصادقة الحيوية وسياسة الخصوصية والشروط والتواصل.
- مسارات API ومخططات Drizzle وترحيلات داعمة للملف الشخصي وعناوين التوصيل وتتبع الطلب والحجوزات.

قائمة شاشات وخصائص Android الحالية موجودة كذلك في [`android/README_AR.md`](./android/README_AR.md).

## 2. خريطة المستودع

| المسار | المحتوى |
|---|---|
| `apps/mobile/android/` | مشروع Android الأصلي وملفات Gradle وManifest |
| `apps/mobile/android/app/src/main/java/com/fuchsia/platform/compose/` | شيفرة Kotlin/Compose |
| `apps/mobile/android/app/src/main/res/` | الشعار والأيقونات والموارد |
| `apps/mobile/android/README_AR.md` | وصف وظائف تطبيق Android ومكوناته |
| `apps/mobile/app/` و`apps/mobile/lib/` | عميل Expo قديم؛ لا يمثل مصدر APK الحالي |
| `artifacts/api-server/src/routes/` | مسارات Express، منها الحساب والعناوين والطلبات والحجوزات |
| `artifacts/api-server/src/lib/migrations.ts` | ترحيلات MySQL التي تُنفذ مع بدء الخادم |
| `lib/db/src/schema/` | مخطط Drizzle المشترك، بما فيه `user-addresses.ts` |
| `artifacts/lamsa/src/components/admin/AdminCommerceSections.tsx` | واجهة إدارة السلال والحجوزات في لوحة الإدارة |
| `apps/mobile/scripts/build-release-apk.sh` | سكربت بناء نسخة Android الموقعة |
| `README.md` | إعداد وتشغيل بقية monorepo والواجهة والخادم |

## 3. تقنيات ومتطلبات البناء

- Kotlin، Jetpack Compose، Material 3، وNavigation Compose (`NavController`/`NavHost`).
- Android Gradle Plugin من إعدادات Gradle، وGradle Wrapper المثبت في `apps/mobile/android/gradle/wrapper/gradle-wrapper.properties`.
- JDK 17 أو أحدث؛ Android SDK Platform 37 وBuild Tools 36.0.0 وفق إعداد المشروع.
- تطبيق API بخادم Express 5 وTypeScript، وMySQL عبر Drizzle ORM ضمن pnpm workspace.
- MapLibre Android SDK، وخريطة OpenFreeMap بلا مفتاح API.

النسخة الحالية: `minSdk 24`، `targetSdk 36`، `compileSdk 37`، `versionName 1.3.0`، `versionCode 5`. لا تغيّر `applicationId` ولا مفتاح التوقيع عند إصدار تحديث قابل للتثبيت فوق النسخة السابقة.

## 4. بنية تطبيق Android

المسارات الأساسية:

- `MainActivity.kt`: تشغيل Compose، المظهر، وقفل التطبيق بالبصمة/المصادقة الحيوية.
- `ui/navigation/AppNavHost.kt`: الوجهات وتدفق الرجوع والانتقالات.
- `ui/navigation/AppBottomBar.kt`: تبويبات الرئيسية والطلبات والحساب والإعدادات.
- `ui/theme/Theme.kt`: لوحة ألوان فوشيا، RTL، ومظهرا فاتح/داكن.
- `ui/screens/WelcomeScreen.kt`: صفحتا الترحيب والشعار والصور.
- `ui/screens/HomeScreen.kt`, `CategoryScreen.kt`, `CartScreen.kt`: تصفح المنتجات والسلة.
- `ui/screens/CheckoutScreen.kt`, `MapLocationPicker.kt`: بيانات الطلب والخريطة الحقيقية.
- `ui/screens/OrdersScreen.kt`: سجل الطلبات والتتبع.
- `ui/screens/AccountScreens.kt`: الملف الشخصي ودليل العناوين.
- `ui/screens/SettingsScreens.kt`: الإعدادات والخصوصية والشروط والمساعدة ومعلومات الإصدار.
- `ui/screens/ReservationScreen.kt`: إنشاء/قراءة طلبات حجز الطاولات.
- `data/FuchsiaApi.kt`: عميل HTTP وواجهات Kotlin التي تتصل بالخادم.
- `data/SessionVault.kt`: تخزين الجلسة المشفرة باستخدام AES-GCM ومفتاح Android Keystore.
- `data/AppPreferences.kt`: تفضيلات العرض والبصمة وحالة الترحيب.
- `data/BiometricAuthenticator.kt`: استدعاء AndroidX BiometricPrompt الفعلي.

### مسار الترحيب لأول تثبيت

تظهر صفحتا الترحيب على تثبيت جديد فقط. تُحفظ علامة الظهور محليًا، وتُتخطى عند ترقية تطبيق كان مثبتًا قبل بناء النسخة. لا تعود الصفحتان بعد إكمالهما أو تسجيل الخروج. لا تحذف مفاتيح التفضيلات `welcome_shown` و`onboarding_completed` عند تنظيف جلسة المستخدم.

### الجلسات والحماية

- بعد الدخول، يرسل العميل رمزًا عبر `Authorization: Bearer <token>` للمسارات المحمية.
- رمز الجلسة على Android محفوظ مشفرًا؛ لا تسجّل الرمز في logs ولا تمرره كـ`userId` موثوق من العميل.
- الخادم يتحقق من صاحب الحساب عند قراءة/تعديل الملف والعناوين والحجوزات وتتبع الطلب.
- قفل البصمة قفل محلي على التطبيق؛ لا يستبدل مصادقة الحساب على الخادم. إذا لم تعد وسيلة حيوية مسجلة، يتجنب التطبيق إبقاء الحساب مقفلاً دون وسيلة فتح.
- صياغة الشاشات عربية شاملة ومحايدة؛ حافظ على هذا الأسلوب عند إضافة نصوص جديدة.

## 5. واجهات API المهمة

العنوان الأساسي المضمّن حاليًا في `apps/mobile/android/app/build.gradle.kts` هو:

```text
https://your-domain.example.com
```

تُنشأ `BuildConfig.API_BASE_URL` أثناء البناء. لتطوير محلي أو staging، غيّر إعداد البناء إلى عنوان يمكن للهاتف/المحاكي الوصول إليه، ثم أعد بناء التطبيق. لا تضع مفاتيح أو كلمات مرور في `BuildConfig` أو تطبيق Android.

| المسار | الطريقة | ملاحظات |
|---|---|---|
| `/api/auth/login` | `POST` | تسجيل الدخول وإرجاع جلسة |
| `/api/auth/register/request-code` | `POST` | طلب رمز تحقق للتسجيل |
| `/api/auth/register/verify-code` | `POST` | التحقق وإكمال إنشاء الحساب |
| `/api/auth/guest` | `POST` | إنشاء جلسة زائر حقيقية |
| `/api/auth/profile` | `GET`, `PATCH` | الملف الشخصي للمستخدم الموثق |
| `/api/addresses` | `GET`, `POST` | قائمة عناوين الحساب وإضافة عنوان |
| `/api/addresses/:id` | `PATCH`, `DELETE` | تعديل/حذف عنوان يملكه المستخدم الحالي |
| `/api/categories`, `/api/products` | `GET` | التصنيفات والمنتجات |
| `/api/cart` | `GET`, `POST`, `PATCH`, `DELETE` | السلة المرتبطة بمعرّف الجلسة |
| `/api/orders` | `POST` | إنشاء طلب عادي؛ يحتاج بيانات المستلم والعنوان وإحداثيات التوصيل |
| `/api/orders/mine` | `GET` | سجل طلبات الحساب بجلسة Bearer |
| `/api/orders/:id/tracking` | `GET` | حالة الطلب وسجل تحديثاته؛ يقتصر على مالك الطلب |
| `/api/reservations` | `GET`, `POST` | الحجوزات وإنشاؤها للحساب الموثق |
| `/api/uploads/receipt` | `POST` | رفع إيصال الدفع وفق أنواع الملفات المسموحة |

كل المسارات أعلاه تحت بادئة `/api`. إنشاء الطلبات والحجوزات والتتبع يحتاج اتصالًا حقيقيًا بقاعدة البيانات؛ لا تستبدل الأخطاء ببيانات محلية أو mock responses.

## 6. البيانات والترحيلات

جدول `user_addresses` في `lib/db/src/schema/user-addresses.ts` يحتوي على مالك العنوان، وملصق العنوان، واسم المستلم ورقم الهاتف والوصف والملاحظات وإحداثيات الموقع والعنوان الافتراضي ووقت الإنشاء. مسارات API تعزل السجلات بواسطة المستخدم المستخرج من Bearer token، ولا تعتمد على `userId` يرسله التطبيق.

يشغّل `artifacts/api-server/src/index.ts` الدالة `runMigrations()` قبل الاستماع للطلبات. الترحيلات مصممة للإعادة بأمان؛ مع ذلك، افحص بيئة قاعدة البيانات وخذ نسخة احتياطية قبل نشر أي تغيير على الإنتاج. **لا تشغّل seed على قاعدة الإنتاج** لمجرد تحديث المخطط.

## 7. الإدارة

واجهة الحجوزات والسلال موجودة في `AdminCommerceSections.tsx`. تُحمّل الحجوزات من `/api/admin/reservations` وتسمح بتصفية القائمة وتحديث حالة الحجز. إدارة API/الإدارة تتم من مصدر الخادم والواجهة؛ لا تغيّر حماية الإدارة أو تعتمد على صلاحيات مخزنة في المتصفح وحده.

## 8. إعداد بيئة التطوير

من جذر المستودع:

```bash
corepack enable
pnpm install --frozen-lockfile --ignore-scripts
```

لخادم API يلزم MySQL ومتغيرات البيئة؛ ابدأ من `.env.example` وخزّن القيم الحقيقية في ملف محلي غير مرفوع أو في مدير أسرار بيئة التشغيل. على الأقل يحتاج الخادم `DATABASE_URL` و`PORT`، ويستخدم `SESSION_SECRET` لمصادقة الإدارة؛ راجع `.env.example` و`README.md` لبقية تكامل البريد وWhatsApp. لا تضع `.env` في GitHub.

تشغيل API محليًا بعد تحميل بيئته:

```bash
pnpm --filter @workspace/api-server run dev
```

عملية الخادم تتطلب `PORT` وتنفذ الترحيلات قبل استقبال الطلبات. لبناء الواجهة والخادم والتحقق من monorepo:

```bash
pnpm run typecheck
PORT=3000 BASE_PATH=/ pnpm run build
```

اختبار جاهزية الخادم محليًا:

```bash
curl -i http://127.0.0.1:5000/api/healthz
```

## 9. بناء Android

أنشئ `local.properties` محليًا؛ لا ترفعه إلى Git:

```bash
cd apps/mobile/android
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew :app:assembleDebug --no-daemon
```

المخرج:

```text
apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk
```

بعد تغيير Kotlin/Compose أعد تنفيذ بناء Debug. يمكن فحص نسخ SDK من `app/build.gradle.kts` ونسخة Gradle Wrapper؛ لا تثبّت نسخة Gradle عشوائية.

## 10. بناء Release وتوقيعه

السكربت المعتمد:

```bash
cd apps/mobile
./scripts/build-release-apk.sh
```

المخرج:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

يستخدم السكربت `FUCHSIA_RELEASE_SECRET_DIR` عند ضبطه، أو افتراضيًا `~/.config/fuchsia-boutique-release/`. يمكن تمرير إعدادات التوقيع عبر المتغيرات `FUCHSIA_RELEASE_STORE_FILE` و`FUCHSIA_RELEASE_STORE_PASSWORD` و`FUCHSIA_RELEASE_KEY_ALIAS` و`FUCHSIA_RELEASE_KEY_PASSWORD` من مدير أسرار آمن. الاسم المستعار الحالي `fuchsia-boutique-release`.

**المفتاح الخاص وكلمات مروره غير موجودة في Git عمدًا.** لا تضف ملف `.jks` أو ملف كلمة المرور إلى المستودع أو PR أو سجلات CI. استخدم نفس المفتاح لإصدار تحديث للمستخدمين، واحتفظ بنسخة احتياطية مشفرة. عند تسليم العمل لمبرمج، شارك مادة التوقيع خارج GitHub عبر قناة خاصة وآمنة فقط عند الحاجة.

قبل إصدار جديد:

1. زد `versionCode` إلى رقم أعلى؛ أبقِ `applicationId` كما هو.
2. حدّث `versionName` وفق خطة الإصدار.
3. استخدم مفتاح التوقيع نفسه.
4. ابنِ APK ثم تحقّق من `apksigner verify --print-certs` ومن نسخة Manifest وبصمة الشهادة.
5. لا تعتبر نجاح البناء دليلًا على نشر API أو سلامة قاعدة الإنتاج.

## 11. رمز التحقق OTP

بناء التطبيق الحالي يتيح استثناء عرض رمز OTP على الشاشة وفق طلب صاحب المشروع. يمرر العميل `X-Fuchsia-OTP-Debug` عندما يكون خيار العرض مفعّلًا، ويستطيع الخادم إرجاع `debugCode` وفق إعداداته. لا توجد استثناءات mock أخرى مقصودة. قبل توزيع عام، اتفق مع صاحب المشروع هل يبقى عرض الرمز مفعلًا، ثم اضبط العميل والخادم والبريد وفق القرار؛ لا تسجّل الرمز في logs ولا تعرضه لحسابات غير مخصصة للاختبار.

## 12. قائمة فحص للمبرمج

### تطبيق Android

- [ ] تثبيت نظيف: تظهر صفحتا الترحيب ثم تختفيان بعد الإكمال.
- [ ] ترقية فوق تثبيت سابق: لا تُعاد المقدمة.
- [ ] تسجيل دخول/تسجيل/OTP/زائر، ثم إغلاق التطبيق وفتحه للتحقق من الجلسة.
- [ ] تعديل الاسم والهاتف، ثم قراءة الملف من API.
- [ ] إضافة عنوان وتعديله وحذفه وتعيينه افتراضيًا؛ اختبر عنوانًا بإحداثيات وآخر دونها.
- [ ] اختيار الموقع وتحريكه على الخريطة وGPS بعد منح إذن الموقع.
- [ ] إضافة منتج للسلة وإكمال الطلب والتحقق من وصول الإحداثيات إلى API.
- [ ] التأكد من ظهور الطلب في «طلباتي» وتحديث حالة التتبع.
- [ ] إرسال حجز، والتحقق من ظهوره في الحساب ولوحة الإدارة.
- [ ] اختبار المظهرين النهاري والليلي والبصمة على جهاز لديه/ليس لديه وسيلة حيوية مسجلة.
- [ ] مراجعة RTL وحجم النص والتمرير على شاشة قصيرة وهاتف صغير.

### API/قاعدة البيانات

- [ ] فحص `GET /api/healthz` وواجهات المنتجات.
- [ ] التأكد من تهيئة `DATABASE_URL` لقاعدة الاختبار المقصودة قبل تشغيل API.
- [ ] التحقق من المصادقة وملكية العنوان/الحجز/الطلب بحسابين مختلفين.
- [ ] فحص سجلات الخادم دون تسريب رمز الدخول أو بيانات الدفع.
- [ ] نشر الترحيلات إلى staging أولًا ثم التحقق منها قبل أي بيئة إنتاج.

## 13. حالة النشر المعروفة

في فحص HTTP بتاريخ 2026-10-06، أعاد المسار الإنتاجي `GET https://your-domain.example.com/api/addresses` الحالة **404**. مصدر المسار والترحيل موجودان في هذا الفرع، كما اجتاز الخادم typecheck وبناء الإنتاج، لكن ذلك **لا يعني أن الخادم المنشور تم تحديثه**. يجب على المسؤول الذي يملك وصول مشروع الاستضافة الحالي نشر API من هذا الفرع ثم اختبار المسار وترحيل قاعدة البيانات في البيئة الصحيحة. لا تغيّر مشروع استضافة آخر ولا تشغّل ترحيلًا إنتاجيًا دون إذن وإجراء نسخ احتياطي.

## 14. قواعد Git وتسليم الملفات

- ابدأ من `feat/android-expo-app`; `main` ما زال الفرع الافتراضي ولم تُدمج إليه هذه النسخة تلقائيًا.
- استخدم فرعًا مستقلًا لكل ميزة، واكتب وصف commit واضحًا.
- نفّذ `git diff --check` و`pnpm run typecheck` وبناء Android المناسب قبل الدفع.
- لا ترفع `.env`، مفاتيح التوقيع، كلمات المرور، إيصالات حقيقية، أو ملفات `local.properties`.
- APK Release ملف بناء منفصل ولم يوضع في GitHub؛ شارك الملف الثنائي مستقلًا عند الحاجة. مفتاح التوقيع يجب أن يبقى سرًا.
- دليل المشروع العام وإعداد قاعدة البيانات والخادم موجودان في [`README.md`](../../README.md)، ودليل Android المختصر في [`android/README_AR.md`](./android/README_AR.md).
