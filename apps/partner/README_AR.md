# تطبيق شريك Fuchsia

تطبيق Android Native مبني بـ Kotlin وJetpack Compose لإدارة حجوزات القاعات ومخزون الإيجار وطلبات الشريك.

## عنوان API

لا يوجد رابط Manus ثابت. مرّر عنوان الخادم عند البناء:

```bash
FUCHSIA_API_BASE_URL=https://your-domain.example.com ./android/gradlew -p android :app:assembleDebug
```

أو استخدم `-PFUCHSIA_API_BASE_URL=...`.

## المتطلبات

- JDK 17.
- Android SDK حسب `compileSdk` في Gradle.
- اتصال بخادم Fuchsia منشور يدعم مسارات `/api/auth` و`/api/vendor` و`/api/venue-partner` و`/api/notifications`.

لا تضع كلمات مرور الشركاء أو ملفات التوقيع داخل المستودع.
