# تطبيق Fuchsia Android

تطبيق عميل Android مبني بـ **React Native + Expo Router + TypeScript**، ويعيد استخدام خادم Fuchsia الحالي دون وضع أسرار قاعدة البيانات أو الإدارة داخل التطبيق.

> **وضع التجربة الحالي:** جميع البيانات والوظائف حقيقية ومتصلة بالـ API وقاعدة البيانات. الاستثناء الوحيد هو OTP: يرسل التطبيق ترويسة اختبار مؤقتة ويعرض الرمز الذي يولده الخادم داخل الشاشة. احذف ترويسة `X-Fuchsia-OTP-Debug` وأوقف `MOBILE_OTP_DEBUG` قبل تفعيل البريد الحقيقي.

## التشغيل

من جذر المستودع:

```bash
pnpm install
pnpm --dir apps/mobile start
```

ثم افتح المشروع في Expo Go أو شغّل:

```bash
pnpm --dir apps/mobile android
```

اضبط عنوان الخادم عبر `apps/mobile/.env` اعتمادًا على `.env.example` عند الحاجة. القيمة الافتراضية هي خادم المعاينة المنشور.

## الوظائف الحالية

- شاشة افتتاحية RTL وهوية فوشيا.
- تسجيل الدخول والتسجيل والتحقق من البريد عبر OTP تجريبي ظاهر داخل الشاشة.
- تخزين الجلسة في `expo-secure-store`.
- الرئيسية والمنتجات المميزة والمتجر والبحث والتصنيفات.
- المتاجر وتفاصيل المتجر.
- تفاصيل المنتج والمفضلة والسلة وتعديل الكميات.
- إتمام الطلب مع الاسم والهاتف والعنوان وتحديد GPS ضمن نطاق صنعاء.
- الدفع عند التوصيل أو الدفع الكامل/العربون عبر المحافظ.
- رفع إيصال حقيقي إلى `POST /api/uploads/receipt` بصيغة `multipart/form-data` قبل إنشاء الطلب.
- قائمة الطلبات وتفاصيل الطلب وشاشة نجاح الطلب وبيانات الموصّل.
- الإشعارات وتعليمها كمقروءة.
- الملف الشخصي والإعدادات وتسجيل الخروج.

## التحقق والبناء

```bash
pnpm --filter @workspace/mobile run typecheck
pnpm --filter @workspace/api-server run typecheck
pnpm --filter @workspace/mobile exec expo export --platform android
PORT=3000 BASE_PATH=/ pnpm run build
```

بناء APK/AAB الإنتاجي يتم عبر Android SDK محليًا أو EAS بعد ضبط حساب Expo وcredentials.
