# تطبيق Fuchsia Boutique الأصلي — Android

هذا مجلد تطبيق Android أصلي بلغة **Kotlin** وواجهة **Jetpack Compose**، والتنقل عبر **Navigation Compose (`NavController` و`NavHost`)**. شاشة الترحيب والمصادقة والرمز وكتالوج التصنيفات تتصل بخادم API الفعلي؛ لا توجد بيانات مصطنعة لمسار الدخول أو التسجيل.

## المكونات المنفذة في هذه المرحلة

- ترحيب متجاوب يعرض الشعار الأصلي مرة واحدة، ويحدد ارتفاع الصورة بحسب المساحة المتاحة، ويثبت أزرار المتابعة أسفل الصفحة بدل تكديس المحتوى في أعلى الشاشة.
- انتقالات شاشات طبيعية انزلاقية مع دعم زر الرجوع في Android، بدل تقليب صور/شرائح.
- دخول، طلب إنشاء حساب، والتحقق من OTP الحقيقي عبر `/api/auth/*`؛ خيار الضيف ينشئ جلسة ضيف فعلية في الخادم.
- تخزين الجلسة بتشفير AES-GCM ومفتاح Android Keystore.
- الصفحة الرئيسية والتصنيفات والمنتجات المميزة تُحمّل من API المشروع.
- استثناء الاختبار الوحيد الذي طلبه مالك التطبيق: يعرض الخادم رمز OTP على شاشة التحقق عندما يطلبه العميل عبر رأس `X-Fuchsia-OTP-Debug`.

## البناء

المطلوب: JDK 17 أو أحدث وAndroid SDK مع المنصة 37 وأدوات البناء 36.0.0.

```bash
cd apps/mobile/android
printf 'sdk.dir=%s\n' "$HOME/android-sdk" > local.properties
./gradlew :app:assembleDebug
```

لإنشاء APK Release موقّع بمفتاح Fuchsia المحلي:

```bash
cd apps/mobile
./scripts/build-release-apk.sh
```

يحمل ملف Release الحالي معرّف تطبيق مستقل `com.fuchsia.platform.compose` كي يُثبّت بجانب إصدار React Native الحالي، ولا يستبدله قبل اكتمال نقل بقية تدفقات المتجر والطلبات والحجوزات. يستخدم نفس مفتاح Release المحلي، ولا تُحفظ كلمات المرور أو ملف المفتاح في Git.

## الإصدارات

- Android Gradle Plugin 9.4.0 / Gradle 9.6.0
- Kotlin Compose Compiler plugin 2.4.20 (مع دعم Kotlin المضمّن في AGP 9)
- Compose BOM 2026.09.00
- Navigation Compose 2.10.2
- `compileSdk` 37، `targetSdk` 36
