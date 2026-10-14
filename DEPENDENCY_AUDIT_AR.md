# تقرير تدقيق الاعتماديات

**التاريخ:** 2026-10-14  
**الفرع:** `fix/security-critical-authorization`

## النتيجة المختصرة

تم العثور على ثغرة حرجة في تبعية خادم الـ API، ثم إصلاحها والتحقق من زوالها:

- `proxy-addr@2.0.7` عبر `express@5.2.1`
- الثغرة: IP spoofing عبر IPv4-mapped IPv6 في آلية trust subnet
- الإصلاح: ترقية Express إلى `5.3.0` وتثبيت `proxy-addr@2.0.8`

بعد الإصلاح لم يعد تدقيق الاعتماديات الإنتاجية يعرض أي ثغرة **Critical** أو **High** داخل خادم الـ API.

## الفحوصات المنفذة

| الفحص | النتيجة |
|---|---|
| `pnpm audit --prod --audit-level high` قبل الإصلاح | فشل: ثغرة Critical في `proxy-addr`، إضافة إلى نتائج Expo/التطبيق |
| `pnpm why proxy-addr --recursive` قبل الإصلاح | `proxy-addr@2.0.7 ← express@5.2.1` |
| `pnpm view express@5.3.0 dependencies.proxy-addr` | النطاق المصحح `^2.0.8` |
| `pnpm audit --prod --audit-level high` بعد الإصلاح | لا توجد Critical؛ النتائج المتبقية تخص `apps/mobile` فقط |
| `pnpm why proxy-addr --recursive` بعد الإصلاح | `proxy-addr@2.0.8 ← express@5.3.0` |
| `pnpm why qs --recursive` بعد الإصلاح | `qs@6.16.0` مع `express@5.3.0` و`body-parser@2.3.0` |
| `pnpm install --frozen-lockfile --ignore-scripts` | نجح بعد تحديث القفل |
| `pnpm run typecheck` | نجح |
| `pnpm --dir apps/mobile run typecheck` | نجح |
| `PORT=3000 BASE_PATH=/ pnpm run build` | نجح |
| `git diff --check` | نجح |
| Docker build | لم يُنفذ؛ Docker غير مثبت في بيئة الفحص |

## حالة الاعتماديات بعد الإصلاح

التدقيق الإنتاجي الشامل للـ workspace يعرض **28 advisory**:

- 19 عالية
- 8 متوسطة
- 1 منخفضة
- 0 حرجة

لكن مسارات النتائج الحالية تبدأ بـ `apps__mobile`، وتشمل تبعيات Expo/Metro وأدوات بناء تطبيق الهاتف مثل:

- `brace-expansion`
- `js-yaml`
- `postcss`
- `nanoid`
- `browserslist`
- `image-size`
- `node-forge`
- `source-map-js`

هذه التبعيات لا تدخل صورة Docker الحالية؛ Dockerfile ينسخ `artifacts` و`lib` و`scripts` ولا ينسخ `apps/mobile`.

## تبعيات الخادم

بعد ترقية Express:

- `express`: `5.3.0`
- `proxy-addr`: `2.0.8`
- `qs`: `6.16.0`
- `body-parser`: `2.3.0`

لم تعد نتائج `Critical` أو `High` ظاهرة في مسار خادم الـ API ضمن تدقيق الإنتاج.

## توصيات المتابعة

1. إنشاء تدقيق منفصل لتطبيق الهاتف بدل خلطه مع تدقيق صورة الخادم.
2. ترقية Expo/React Native عبر مسار الترقية الرسمي المتوافق مع SDK الحالي، لا عبر `pnpm update --latest` عشوائيًا.
3. اختبار Android وExpo بعد كل ترقية، خصوصًا Metro و`image-size` و`node-forge`.
4. إضافة CI يشغّل:

```bash
pnpm install --frozen-lockfile --ignore-scripts
pnpm audit --prod --audit-level high
pnpm run typecheck
pnpm --dir apps/mobile run typecheck
PORT=3000 BASE_PATH=/ pnpm run build
```

5. تنفيذ `docker build` في CI أو بيئة نشر فعلية لأن Docker غير متاح في بيئة المراجعة الحالية.

## الملفات التي تغيرت

- `artifacts/api-server/package.json`
- `pnpm-workspace.yaml`
- `pnpm-lock.yaml`
- `DEPENDENCY_AUDIT_AR.md`
