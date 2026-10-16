# تطبيق الجوال — Fuchsia Boutique

## النسخة الحالية لتطبيق Android

الـAPK الحالي تطبيق **Android أصلي** مصدره `apps/mobile/android/`، مكتوب بـ **Kotlin** و**Jetpack Compose** و**Navigation Compose**. لا تستخدم Expo لبناء APK الإصدار الحالي.

- [دليل المطور والتسليم بالعربية](./DEVELOPER_GUIDE_AR.md): البنية، الإعداد، API، البناء، التوقيع، والاختبارات.
- [ملخص ميزات Android](./android/README_AR.md): شاشات التطبيق والتدفقات التجارية.
- [مرجع عميل Expo القديم](./LEGACY_EXPO_GUIDE_AR.md): للتوافق والصيانة فقط، وليس مصدر APK الحالي.

الإصدار الموثّق: `1.3.0` (`versionCode 5`، `applicationId com.fuchsia.platform`). الشيفرة الحالية موجودة على فرع GitHub `feat/android-expo-app`؛ استخدم هذا الفرع عند إرسال المشروع لمبرمج، لأن الفرع الافتراضي `main` لم تُدمج إليه النسخة بعد.

## بناء Android محليًا

المتطلبات: JDK 17+ وAndroid SDK Platform 37 وBuild Tools 36.0.0.

```bash
cd apps/mobile/android
printf 'sdk.dir=%s\n' "$ANDROID_HOME" > local.properties
./gradlew :app:assembleDebug --no-daemon
```

لـRelease موقّع استخدم `./scripts/build-release-apk.sh` من `apps/mobile/`. **لا ترفع keystore أو كلمة مروره إلى GitHub**؛ إعداد التوقيع محفوظ خارج المستودع.

## بقية monorepo

يحتوي جذر المستودع على واجهة المتجر والخادم وقاعدة البيانات ولوحة الإدارة. راجع [`README.md`](../../README.md) لتثبيت pnpm وإعداد بيئة API/MySQL. بعض ملفات `apps/mobile/app/` و`apps/mobile/lib/` تخص عميل Expo السابق، وهي منفصلة عن مصدر Android الأصلي.
