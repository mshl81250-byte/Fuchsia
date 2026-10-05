# Fuchsia Boutique Android

تطبيق Android عربي RTL لمتجر **Fuchsia Boutique**، مبني بـ React Native وExpo Router وTypeScript، ومتصل بخادم Fuchsia API وقاعدة MySQL عبر Drizzle.

## دليل المبرمج

المرجع الكامل للتسليم والتطوير موجود هنا:

- [`DEVELOPER_GUIDE_AR.md`](./DEVELOPER_GUIDE_AR.md)

يشرح الدليل بنية الصفحات، التقنيات واللغات، API، OTP التجريبي، البصمة، الثيم، العروض، طلب العرض، الدفع، GPS، الإيصالات، الاختبارات، والبناء.

## الوضع الحالي

- جميع الوظائف متصلة بالـ API وقاعدة البيانات ما عدا **OTP فقط**؛ OTP تجريبي مؤقت يظهر داخل الشاشة للاختبار.
- المتجر المعروض للمستخدم هو **Fuchsia Boutique فقط**.
- الدفع اليدوي، رفع الإيصال، GPS، طلب العرض، رسالة الهدية، الطلبات، الإشعارات، المفضلة والسلة مطبقة.
- الرئيسية تحتوي تصنيفات الهدايا والزهور وصناديق الخطوبة والكوش والطاولات والهدية حسب الطلب.
- العروض داخل الرئيسية وتتقلب تلقائيًا كل 4.5 ثوانٍ، وزر العروض في الأعلى ينقل داخل الصفحة ولا يفتح صفحة مستقلة.
- البصمة والوضع الليلي/النهاري محفوظان عبر SecureStore.

## التشغيل والفحص

من جذر المستودع:

```bash
pnpm install --ignore-scripts
pnpm --filter @workspace/mobile start
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/mobile exec expo export --platform android
```

## بناء APK

```bash
CI=1 pnpm --filter @workspace/mobile exec expo prebuild --platform android
printf 'sdk.dir=%s\n' "$HOME/android-sdk" > apps/mobile/android/local.properties
cd apps/mobile/android
./gradlew :app:assembleRelease --no-daemon
```

قبل الالتزام، احذف مجلد Android المولد إذا لم يكن مطلوبًا في Git:

```bash
rm -rf apps/mobile/android apps/mobile/dist
```

## OTP قبل الإنتاج

احذف ترويسة `X-Fuchsia-OTP-Debug` من `app/auth.tsx`، وعطّل `MOBILE_OTP_DEBUG` في الخادم، ثم فعّل البريد الحقيقي عبر متغيرات Resend قبل نشر التطبيق للمستخدمين.
