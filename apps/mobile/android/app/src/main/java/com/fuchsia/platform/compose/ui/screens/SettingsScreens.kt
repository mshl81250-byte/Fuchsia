package com.fuchsia.platform.compose.ui.screens

import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.HelpOutline
import androidx.compose.material.icons.rounded.DarkMode
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material.icons.rounded.Info
import androidx.compose.material.icons.rounded.LightMode
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.Policy
import androidx.compose.material.icons.rounded.PrivacyTip
import androidx.compose.material.icons.rounded.Share
import androidx.compose.material.icons.rounded.Storefront
import androidx.compose.material.icons.rounded.Tune
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.fuchsia.platform.compose.BuildConfig
import com.fuchsia.platform.compose.data.BiometricAuthenticator
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.AppPreferences
import com.fuchsia.platform.compose.data.ThemeMode
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun SettingsScreen(
    themeMode: String,
    onThemeModeChange: (String) -> Unit,
    biometricEnabled: Boolean,
    onBiometricEnabledChange: (Boolean) -> Unit,
    onEditProfile: () -> Unit,
    onAddresses: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit,
    onHelp: () -> Unit,
    onContact: () -> Unit,
    onAbout: () -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val activity = remember(context) { context as? FragmentActivity }
    val authenticator = remember(activity) { activity?.let(::BiometricAuthenticator) }
    val available = remember(authenticator) { authenticator?.isAvailable() == true }
    var securityMessage by remember { mutableStateOf("") }
    var orderNotifications by remember { mutableStateOf(AppPreferences.orderNotificationsEnabled(context)) }
    var promotionNotifications by remember { mutableStateOf(AppPreferences.promotionNotificationsEnabled(context)) }
    var reminderNotifications by remember { mutableStateOf(AppPreferences.reminderNotificationsEnabled(context)) }
    val selectedMode = ThemeMode.fromStorage(themeMode)

    Scaffold(containerColor = FuchsiaColors.Cream, bottomBar = bottomBar) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = insets.calculateTopPadding() + 14.dp, bottom = insets.calculateBottomPadding() + 24.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 17.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(13.dp)) {
                        Box(Modifier.size(48.dp).background(FuchsiaColors.White.copy(alpha = .16f), RoundedCornerShape(16.dp)), contentAlignment = Alignment.Center) {
                            Icon(Icons.Rounded.Tune, contentDescription = null, tint = FuchsiaColors.White, modifier = Modifier.size(28.dp))
                        }
                        Column(Modifier.weight(1f)) {
                            Text("إعدادات فوشيا", color = FuchsiaColors.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            Text("خصّص تجربتك بالطريقة التي تناسبك", color = FuchsiaColors.White.copy(alpha = .82f), style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            item {
                SettingsSection("المظهر", Icons.Rounded.Tune) {
                    Text("اختر طريقة عرض التطبيق", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                    Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        ThemeMode.entries.forEach { mode ->
                            FilterChip(
                                selected = selectedMode == mode,
                                onClick = { onThemeModeChange(mode.storageValue) },
                                label = { Text(mode.label) },
                                leadingIcon = {
                                    val icon = when (mode) {
                                        ThemeMode.LIGHT -> Icons.Rounded.LightMode
                                        ThemeMode.DARK -> Icons.Rounded.DarkMode
                                        ThemeMode.SYSTEM -> Icons.Rounded.Tune
                                    }
                                    Icon(icon, contentDescription = null, modifier = Modifier.size(17.dp))
                                },
                            )
                        }
                    }
                    Text("يتغير المظهر فورًا، ويُحفظ على هذا الجهاز.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp))
                }
            }
            item {
                SettingsSection("الأمان", Icons.Rounded.Fingerprint) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Column(Modifier.weight(1f)) {
                            Text("قفل التطبيق بالبصمة", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                            Text(
                                when {
                                    biometricEnabled -> "مفعّل؛ سيطلب التطبيق التحقق عند فتحه."
                                    available -> "استخدم بصمة أو وسيلة المصادقة الحيوية المسجلة على الجهاز."
                                    else -> "المصادقة الحيوية غير متاحة؛ تحقق من إعدادات أمان الجهاز."
                                },
                                color = FuchsiaColors.Muted,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Switch(
                            checked = biometricEnabled,
                            onCheckedChange = { enable ->
                                securityMessage = ""
                                val auth = authenticator
                                if (auth == null || !auth.isAvailable()) {
                                    securityMessage = "أضف بصمة أو وسيلة مصادقة حيوية من إعدادات الجهاز أولًا."
                                } else {
                                    auth.authenticate(
                                        title = "تأكيد إعدادات الأمان",
                                        subtitle = if (enable) "تحقق لتفعيل قفل فوشيا بالبصمة" else "تحقق لإيقاف قفل فوشيا بالبصمة",
                                        onSuccess = { onBiometricEnabledChange(enable); securityMessage = if (enable) "تم تفعيل قفل التطبيق بالبصمة." else "تم إيقاف قفل التطبيق بالبصمة." },
                                        onFailure = { securityMessage = it },
                                    )
                                }
                            },
                            colors = SwitchDefaults.colors(checkedTrackColor = FuchsiaColors.Primary),
                        )
                    }
                    if (securityMessage.isNotBlank()) Text(securityMessage, color = if (biometricEnabled) FuchsiaColors.Success else FuchsiaColors.TextAccent, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 8.dp))
                }
            }
            item {
                SettingsSection("الإشعارات", Icons.Rounded.NotificationsActive) {
                    Text("اختر التنبيهات التي تهمك", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                    NotificationPreferenceRow("تحديثات الطلبات", "حالة الطلب والتوصيل", orderNotifications) {
                        orderNotifications = it
                        AppPreferences.setOrderNotificationsEnabled(context, it)
                    }
                    NotificationPreferenceRow("العروض والمنتجات الجديدة", "خصومات ومجموعات موسمية", promotionNotifications) {
                        promotionNotifications = it
                        AppPreferences.setPromotionNotificationsEnabled(context, it)
                    }
                    NotificationPreferenceRow("التذكيرات", "تذكير بالسلة والمناسبات", reminderNotifications) {
                        reminderNotifications = it
                        AppPreferences.setReminderNotificationsEnabled(context, it)
                    }
                    Text("تُحفظ هذه التفضيلات على هذا الجهاز حاليًا. لا يدعم الخادم بعد مزامنة قنوات الإشعارات لكل حساب.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 5.dp))
                    Button(
                        onClick = {
                            context.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                                putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                            })
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 5.dp),
                        shape = RoundedCornerShape(13.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Rose),
                    ) {
                        Icon(Icons.Rounded.NotificationsActive, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(7.dp))
                        Text("إدارة إشعارات Android", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
                    }
                }
            }
            item { SettingsGroupLabel("الحساب والتوصيل") }
            item { SettingsRow(Icons.Rounded.Person, "الاسم ورقم الهاتف", "تعديل بيانات الحساب", onEditProfile) }
            item { SettingsRow(Icons.Rounded.LocationOn, "عناوين التوصيل", "إدارة العناوين المحفوظة", onAddresses) }
            item { SettingsGroupLabel("المساعدة والمعلومات") }
            item { SettingsRow(Icons.Rounded.PrivacyTip, "سياسة الخصوصية", "كيف نستخدم البيانات ونحميها", onPrivacy) }
            item { SettingsRow(Icons.Rounded.Policy, "شروط الاستخدام", "قواعد استخدام خدمات فوشيا", onTerms) }
            item { SettingsRow(Icons.AutoMirrored.Rounded.HelpOutline, "كيفية استخدام التطبيق", "الطلبات والهدايا والحجوزات والتتبع", onHelp) }
            item { SettingsRow(Icons.Rounded.Phone, "تواصل معنا", "اتصال أو واتساب مع المتجر", onContact) }
            item { SettingsRow(Icons.Rounded.Info, "عن التطبيق والتحديثات", "الإصدار الحالي ومعلومات التوزيع", onAbout) }
            item {
                OutlinedButton(
                    onClick = { shareFuchsiaApp(context) },
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                ) {
                    Icon(Icons.Rounded.Share, contentDescription = null, tint = FuchsiaColors.Primary)
                    Spacer(Modifier.width(8.dp))
                    Text("مشاركة فوشيا بوتيك", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun NotificationPreferenceRow(title: String, detail: String, checked: Boolean, onCheckedChange: (Boolean) -> Unit) {
    Row(Modifier.fillMaxWidth().padding(top = 9.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        Column(Modifier.weight(1f)) {
            Text(title, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Text(detail, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall)
        }
        Switch(checked = checked, onCheckedChange = onCheckedChange, colors = SwitchDefaults.colors(checkedTrackColor = FuchsiaColors.Primary))
    }
}

@Composable
private fun SettingsSection(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, content: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.fillMaxWidth().padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(42.dp).background(FuchsiaColors.Rose, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(24.dp))
                }
                Text(title, color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            }
            Spacer(Modifier.height(9.dp))
            content()
        }
    }
}

@Composable
private fun SettingsRow(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, detail: String, onClick: () -> Unit) {
    Card(onClick = onClick, shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(46.dp).background(FuchsiaColors.Rose, RoundedCornerShape(14.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(25.dp))
            }
            Column(Modifier.weight(1f)) {
                Text(title, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                Text(detail, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall)
            }
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null, tint = FuchsiaColors.Muted, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
private fun SettingsGroupLabel(title: String) {
    Text(title, color = FuchsiaColors.TextAccent, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold, modifier = Modifier.padding(start = 4.dp, top = 3.dp))
}

@Composable
fun PolicyScreen(isTerms: Boolean, onBack: () -> Unit) {
    val title = if (isTerms) "شروط الاستخدام" else "سياسة الخصوصية"
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = insets.calculateTopPadding() + 12.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item { UtilityHeader(title, onBack) }
            if (isTerms) {
                item { PolicyCard("استخدام الخدمات", "يتيح التطبيق تصفح المنتجات، إرسال طلبات الشراء، طلب تغليف الهدايا، وحجز الطاولات بحسب توفر الخدمة لدى المتجر.") }
                item { PolicyCard("صحة بيانات الطلب", "يرجى إدخال اسم المستلم ورقم الهاتف والعنوان وموقع التوصيل بدقة. يُراجع المتجر الطلب، وقد يتواصل لتأكيد التفاصيل أو وقت التسليم.") }
                item { PolicyCard("الأسعار والتوفر", "تظهر الأسعار والتوفر كما يرسلهما الخادم وقت التصفح. قد تتغير حالة منتج أو حجز قبل تأكيده من المتجر.") }
                item { PolicyCard("الدفع والإلغاء", "تُعرض تفاصيل الدفع في شاشة إتمام الطلب. لا يُعد إرسال الطلب تأكيدًا للدفع أو التسليم؛ يظل التأكيد وفق رد المتجر ومراجعته.") }
                item { PolicyCard("التواصل", "للاستفسار عن طلب أو حجز، استخدم بيانات الاتصال الظاهرة داخل التطبيق.") }
            } else {
                item { PolicyCard("البيانات التي تُستخدم", "نستخدم بيانات الاسم ورقم الهاتف والعنوان لتسجيل الحساب وتنفيذ الطلبات والحجوزات والتواصل بشأنها. ويُستخدم موقع GPS أو النقطة المختارة على الخريطة عند طلب التوصيل فقط.") }
                item { PolicyCard("بيانات الدفع", "قد تتضمن بيانات الطلب رقم مرجع التحويل أو صورة إيصال الدفع إذا اخترت وسيلة دفع تتطلب ذلك.") }
                item { PolicyCard("التخزين والحماية", "تُحفظ جلسة الدخول على الجهاز بتشفير Android Keystore، وترسل البيانات إلى واجهات الخدمة عبر اتصال HTTPS عند توفر الاتصال.") }
                item { PolicyCard("المشاركة والاحتفاظ", "لا نبيع بيانات الحساب. تُستخدم فقط لتشغيل الطلب أو الحجز وخدمة العميل، أو تُتاح للجهات اللازمة لإتمام الخدمة.") }
                item { PolicyCard("التحكم ببياناتك", "يمكن تحديث الاسم ورقم الهاتف وإدارة عناوين التوصيل من الحساب. لحذف الحساب أو للاستفسارات، تواصل مع المتجر عبر بيانات الاتصال في التطبيق.") }
            }
            item { Text("آخر تحديث: 6 أكتوبر 2026", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 4.dp)) }
        }
    }
}

@Composable
private fun PolicyCard(title: String, body: String) {
    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
            Text(title, color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold)
            Text(body, color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodyMedium)
        }
    }
}

@Composable
fun HelpScreen(onBack: () -> Unit) {
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = insets.calculateTopPadding() + 12.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            item { UtilityHeader("كيفية استخدام التطبيق", onBack) }
            item { PolicyCard("التسوق", "اختر تصنيفًا، افتح المنتج المطلوب، ثم أضفه إلى السلة. يمكنك تعديل الكمية أو حذف منتج قبل إتمام الطلب.") }
            item { PolicyCard("إتمام الطلب", "راجع السلة، أدخل بيانات المستلم، واحفظ موقع التوصيل من الخريطة أو استخدم عنوانًا محفوظًا. اختر وسيلة الدفع ثم أرسل الطلب.") }
            item { PolicyCard("الهدايا", "يمكنك إضافة تغليف ورسالة إهداء، أو فتح خدمة طلب هدية وإضافة تفاصيل المناسبة والمستلم.") }
            item { PolicyCard("الطلبات والتتبع", "افتح تبويب «طلباتي» لمراجعة الطلبات السابقة. تُحدّث شاشة التتبع حالة الطلب دوريًا عند توفر اتصال بالخادم.") }
            item { PolicyCard("حجز الطاولات", "اختر الحجز من الصفحة الرئيسية، وحدد الفرع والوقت وعدد الأشخاص، ثم أرسل الطلب وانتظر تأكيد المتجر.") }
            item { PolicyCard("العناوين والمظهر", "من تبويب الحساب أضف عناوين التوصيل وحدد الافتراضي. ومن الإعدادات اختر المظهر الفاتح أو الداكن أو اتبع مظهر الجهاز.") }
            item { PolicyCard("المساعدة", "إذا احتجت إلى مساعدة في طلب أو حجز، افتح «تواصل معنا» واتصل بالمتجر أو راسله عبر واتساب.") }
        }
    }
}

@Composable
fun ContactScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var settings by remember { mutableStateOf<org.json.JSONObject?>(null) }
    LaunchedEffect(Unit) { settings = runCatching { FuchsiaApi.platformSettings() }.getOrNull() }
    val shopPhone = settings?.optString("supportPhone").orEmpty().ifBlank { "778360009" }
    val whatsapp = settings?.optString("supportWhatsapp").orEmpty().ifBlank { shopPhone }
    val address = settings?.optString("originAddress").orEmpty().ifBlank { "صنعاء - اليمن" }
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        Column(
            Modifier.fillMaxSize().padding(top = insets.calculateTopPadding()).padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            UtilityHeader("تواصل معنا", onBack)
            Text("نسعد بخدمتك والإجابة عن استفسارات الطلبات والحجوزات.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
            PolicyCard("عنوان المتجر", address)
            PolicyCard("رقم الهاتف", shopPhone)
            Button(
                onClick = { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$shopPhone"))) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                shape = RoundedCornerShape(15.dp),
            ) {
                Icon(Icons.Rounded.Phone, contentDescription = null, tint = FuchsiaColors.White)
                Spacer(Modifier.width(8.dp))
                Text("اتصال بالمتجر", color = FuchsiaColors.White, fontWeight = FontWeight.Bold)
            }
            OutlinedButton(
                onClick = { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://wa.me/${whatsapp.filter { it.isDigit() }}"))) },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(15.dp),
            ) {
                Icon(Icons.Rounded.Storefront, contentDescription = null, tint = FuchsiaColors.Primary)
                Spacer(Modifier.width(8.dp))
                Text("التواصل عبر واتساب", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun AboutScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val version = remember {
        runCatching {
            @Suppress("DEPRECATION")
            context.packageManager.getPackageInfo(context.packageName, 0).versionName
        }.getOrNull().orEmpty().ifBlank { BuildConfig.VERSION_NAME }
    }
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        Column(Modifier.fillMaxSize().padding(top = insets.calculateTopPadding()).padding(horizontal = 20.dp, vertical = 14.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            UtilityHeader("عن فوشيا بوتيك", onBack)
            Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(7.dp)) {
                    Icon(Icons.Rounded.Storefront, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(38.dp))
                    Text("فوشيا بوتيك", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge)
                    Text("هدايا تليق بلحظتك", color = FuchsiaColors.Muted)
                    Text("الإصدار $version · Android", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold, modifier = Modifier.padding(top = 6.dp))
                }
            }
            PolicyCard("حول التطبيق", "تجربة أصلية مبنية على Kotlin وJetpack Compose للتسوق وطلب الهدايا وحجز الطاولات ومتابعة الطلبات.")
            PolicyCard("التحديثات", "يُعرض رقم الإصدار المثبت على جهازك. عند توفر تحديث، يُنشر عبر قناة التوزيع الرسمية التي وصل منها التطبيق؛ لا يتم تثبيت أي تحديث بصمت.")
            OutlinedButton(
                onClick = { context.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.fromParts("package", context.packageName, null))) },
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = RoundedCornerShape(15.dp),
            ) {
                Text("فتح إعدادات التطبيق على الجهاز", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
            }
        }
    }
}

private fun shareFuchsiaApp(context: android.content.Context) {
    val shareIntent = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_SUBJECT, "فوشيا بوتيك")
        putExtra(Intent.EXTRA_TEXT, "فوشيا بوتيك — هدايا تليق بلحظتك\nhttps://fuchsia-x7dwxpzd.manus.space")
    }
    context.startActivity(Intent.createChooser(shareIntent, "مشاركة فوشيا بوتيك"))
}

@Composable
private fun UtilityHeader(title: String, onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        androidx.compose.material3.IconButton(onClick = onBack, modifier = Modifier.size(44.dp)) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink)
        }
        Text(title, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge)
    }
}
