# بناء APK Release — Fuchsia Boutique

هذا الإعداد يبني APK إصدار Release **موقّعًا بمفتاح إنتاج دائم**، وليس بمفتاح Debug الافتراضي. لا تحفظ ملف المفتاح أو كلمات المرور في المستودع.

## متطلبات البناء

- Node.js وpnpm وفق متطلبات المشروع.
- Android SDK مع منصة البناء التي يتطلبها Expo/React Native.
- مفتاح التوقيع الخاص بالتطبيق محفوظ خارج Git.

## متغيرات البيئة المطلوبة

اضبط المتغيرات التالية في جلسة البناء مستخدمًا نسخة المفتاح الآمنة لديك:

```bash
export FUCHSIA_RELEASE_STORE_FILE="/absolute/path/Fuchsia-Boutique-release-key.jks"
export FUCHSIA_RELEASE_STORE_PASSWORD="<كلمة مرور keystore>"
export FUCHSIA_RELEASE_KEY_ALIAS="fuchsia-boutique-release"
export FUCHSIA_RELEASE_KEY_PASSWORD="<كلمة مرور المفتاح>"
```

لا تضع قيم كلمات المرور في ملفات المشروع أو أوامر محفوظة في Git، ولا ترفع ملف `.jks` إلى المستودع.

## إنشاء APK

من جذر المستودع، بعد ضبط Android SDK والمتغيرات أعلاه:

```bash
pnpm --filter @workspace/mobile run build:release
```

الناتج:

```text
apps/mobile/android/app/build/outputs/apk/release/app-release.apk
```

يعيد Expo توليد مجلد Android عند الحاجة. الإضافة `plugins/with-release-signing.js` تضبط نوع Release ليستخدم المتغيرات أعلاه، وتترك بناء Debug منفصلًا.

## الحفاظ على هوية التطبيق

- استخدم **نفس keystore والـalias وكلمات المرور** عند كل إصدار لاحق من `com.fuchsia.platform`.
- ارفع `versionCode` قبل نشر تحديث جديد.
- احتفظ بنسختين احتياطيتين آمنتين من المفتاح وبياناته. فقدان المفتاح يمنع توقيع تحديثات بنفس هوية التطبيق.
- الاستثناء التجريبي الخاص بـOTP موثق في دليل المطور؛ لا تفعّل وضع OTP التجريبي في خادم الإنتاج.
