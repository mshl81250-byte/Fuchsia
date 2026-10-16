package com.fuchsia.platform.compose.ui.screens
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween

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
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.Logout
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.DeleteOutline
import androidx.compose.material.icons.rounded.Edit
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.NotificationsActive
import androidx.compose.material.icons.rounded.PrivacyTip
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material.icons.rounded.Star
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.DeliveryAddress
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.designsystem.FuchsiaPrimaryButton
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch
import org.json.JSONObject

@OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
@Composable
fun AccountScreen(
    onSignIn: () -> Unit,
    onAccountInfo: () -> Unit,
    onAddresses: () -> Unit,
    onOrders: () -> Unit,
    onWishlist: () -> Unit,
    onSettings: () -> Unit,
    onContact: () -> Unit,
    onPrivacy: () -> Unit,
    onTerms: () -> Unit,
    onSignedOut: () -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val context = LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    val userId = remember(context) { SessionVault.userId(context) }
    var profile by remember(context) { mutableStateOf(SessionVault.read(context)?.optJSONObject("user")) }
    var orders by remember { mutableStateOf<List<com.fuchsia.platform.compose.data.CustomerOrder>>(emptyList()) }
    var favoritesCount by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(token != null) }
    var error by remember { mutableStateOf("") }
    var confirmSignOut by remember { mutableStateOf(false) }

    LaunchedEffect(token, userId) {
        if (token.isNullOrBlank()) { loading = false; return@LaunchedEffect }
        try {
            val latest = FuchsiaApi.profile(token)
            profile = latest
            SessionVault.save(context, latest, token)
            orders = FuchsiaApi.customerOrders(token)
            favoritesCount = userId?.let { FuchsiaApi.favorites(it, token).size } ?: 0
            error = ""
        } catch (failure: Exception) {
            error = failure.message ?: "تعذر تحديث بيانات الحساب من الخادم."
        } finally { loading = false }
    }

    val name = profile?.optString("fullName").orEmpty().trim()
    val greeting = name.substringBefore(" ").ifBlank { "بك" }
    val isGuest = token.isNullOrBlank() || profile?.optBoolean("isGuest", false) == true || profile?.optString("email").orEmpty().endsWith("@guest.fuchsia")
    val completed = orders.count { it.status.lowercase() in setOf("completed", "delivered", "مكتمل", "تم التسليم") }
    val cancelled = orders.count { it.status.lowercase() in setOf("cancelled", "canceled", "ملغي") }
    val current = orders.size - completed - cancelled
    val avatarLetter = name.firstOrNull()?.uppercaseChar()?.toString() ?: "ف"

    Scaffold(containerColor = FuchsiaColors.Cream, bottomBar = bottomBar) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = insets.calculateTopPadding() + 14.dp, bottom = insets.calculateBottomPadding() + 26.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Card(shape = RoundedCornerShape(26.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary)) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 20.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(Modifier.size(58.dp).background(Color.White.copy(alpha = .18f), CircleShape), contentAlignment = Alignment.Center) {
                            Text(avatarLetter, color = Color.White, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold)
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(if (isGuest) "مرحبًا بك في فوشيا" else "أهلًا بك، $greeting", color = Color.White, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                            Text("إدارة حسابك وطلباتك بسهولة", color = Color.White.copy(alpha = .84f), style = MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
            }
            if (isGuest) {
                item {
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Column(Modifier.fillMaxWidth().padding(19.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("سجّل الدخول لتجربة أكمل", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
                            Text("احفظ عناوينك ومفضلتك وتابع طلباتك بسهولة.", color = FuchsiaColors.Muted)
                            FuchsiaPrimaryButton(text = "تسجيل الدخول أو إنشاء حساب", modifier = Modifier.padding(top = 8.dp), onClick = onSignIn)
                        }
                    }
                }
            } else {
                item {
                    Card(onClick = onAccountInfo, shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 15.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(44.dp).background(FuchsiaColors.Rose, CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Person, contentDescription = null, tint = FuchsiaColors.IconAccent, modifier = Modifier.size(24.dp)) }
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                Text("معلومات الحساب", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                                Text("عرض وتعديل بيانات الملف الشخصي", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall)
                            }
                            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "فتح معلومات الحساب", tint = FuchsiaColors.Muted, modifier = Modifier.size(18.dp))
                        }
                    }
                }
                item {
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                                Text("طلباتي", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                                TextButton(onClick = onOrders) { Text("عرض الكل", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold) }
                            }
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly) {
                                AccountStat("الحالية", current.toString())
                                AccountStat("مكتملة", completed.toString())
                                AccountStat("ملغاة", cancelled.toString())
                            }
                        }
                    }
                }
                item { AccountAction(Icons.Rounded.LocationOn, "عناوين التوصيل", "إدارة العناوين المحفوظة", onAddresses) }
                item { AccountAction(Icons.Rounded.FavoriteBorder, "المنتجات المفضلة", "$favoritesCount منتجات محفوظة", onWishlist) }
                item { AccountAction(Icons.Rounded.NotificationsActive, "الإشعارات", "تفضيلات تحديثات الطلبات والعروض", onSettings) }
                item { AccountAction(Icons.Rounded.Settings, "الإعدادات والمظهر", "الوضع الليلي والأمان والتفضيلات", onSettings) }
                item { AccountAction(Icons.Rounded.Person, "المساعدة والدعم", "الأسئلة الشائعة والتواصل والاقتراحات", onContact) }
                item { AccountAction(Icons.Rounded.PrivacyTip, "الخصوصية والشروط", "اطّلع على سياسة الخصوصية وشروط الاستخدام", onPrivacy) }
                if (loading) item { Box(Modifier.fillMaxWidth().padding(8.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
                if (error.isNotBlank()) item { Text(error, color = FuchsiaColors.Error, style = MaterialTheme.typography.bodySmall) }
                item { OutlinedButton(onClick = { confirmSignOut = true }, modifier = Modifier.fillMaxWidth().height(50.dp), shape = RoundedCornerShape(15.dp)) { Icon(Icons.AutoMirrored.Rounded.Logout, contentDescription = null, tint = FuchsiaColors.Primary); Spacer(Modifier.width(8.dp)); Text("تسجيل الخروج", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold) } }
            }
        }
    }
    if (confirmSignOut) {
        androidx.compose.material3.ModalBottomSheet(onDismissRequest = { confirmSignOut = false }, containerColor = FuchsiaColors.White) {
            Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Text("هل تريد تسجيل الخروج؟", color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                Text("ستحتاج إلى تسجيل الدخول مجددًا لمتابعة طلباتك.", color = FuchsiaColors.Muted, modifier = Modifier.padding(top = 8.dp, bottom = 18.dp))
                Button(onClick = { confirmSignOut = false; SessionVault.clear(context); onSignedOut() }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("تسجيل الخروج", fontWeight = FontWeight.Bold) }
                TextButton(onClick = { confirmSignOut = false }, modifier = Modifier.fillMaxWidth()) { Text("إلغاء", color = FuchsiaColors.TextAccent) }
            }
        }
    }
}

@Composable
fun AccountInfoScreen(onBack: () -> Unit, onEdit: () -> Unit) {
    val context = LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    var profile by remember(context) { mutableStateOf(SessionVault.read(context)?.optJSONObject("user")) }
    var defaultAddress by remember { mutableStateOf<DeliveryAddress?>(null) }
    var loading by remember { mutableStateOf(token != null) }
    var error by remember { mutableStateOf("") }
    LaunchedEffect(token) {
        if (token.isNullOrBlank()) { loading = false; return@LaunchedEffect }
        runCatching {
            profile = FuchsiaApi.profile(token)
            defaultAddress = FuchsiaApi.addresses(token).firstOrNull { it.isDefault }
        }.onFailure { error = it.message ?: "تعذر تحميل معلومات الحساب." }
        loading = false
    }
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 20.dp, end = 20.dp, top = insets.calculateTopPadding() + 14.dp, bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            item { ScreenHeading("معلومات الحساب", onBack) }
            item {
                Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                    Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Box(Modifier.size(58.dp).background(FuchsiaColors.Rose, CircleShape), contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Person, contentDescription = null, tint = FuchsiaColors.IconAccent, modifier = Modifier.size(30.dp)) }
                            Column { Text("الملف الشخصي", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold); Text("بياناتك المحفوظة في الحساب", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall) }
                        }
                        HorizontalDivider(color = FuchsiaColors.Line)
                        AccountInfoLine("الاسم الكامل", profile?.optString("fullName").orEmpty().ifBlank { "غير مضاف" })
                        AccountInfoLine("رقم الهاتف", profile?.optString("phone").orEmpty().takeIf { it.isNotBlank() && it != "null" } ?: "غير مضاف")
                        AccountInfoLine("البريد الإلكتروني", profile?.optString("email").orEmpty().takeIf { it.isNotBlank() && it != "null" } ?: "غير مضاف")
                        AccountInfoLine("العنوان الافتراضي", defaultAddress?.address ?: "لم تتم إضافة عنوان بعد")
                    }
                }
            }
            if (loading) item { Box(Modifier.fillMaxWidth().padding(12.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            if (error.isNotBlank()) item { Text(error, color = FuchsiaColors.Error) }
            item { Button(onClick = onEdit, modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary), shape = RoundedCornerShape(15.dp)) { Icon(Icons.Rounded.Edit, contentDescription = null, tint = Color.White); Spacer(Modifier.width(8.dp)); Text("تعديل معلومات الحساب", color = Color.White, fontWeight = FontWeight.Bold) } }
        }
    }
}

@Composable
private fun AccountInfoLine(label: String, value: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(label, color = FuchsiaColors.Muted, style = MaterialTheme.typography.labelSmall)
        Text(value, color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
    }
}

@Composable
private fun AccountMetricCard(label: String, value: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier) {
    Card(modifier = modifier, shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.fillMaxWidth().padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Icon(icon, contentDescription = null, tint = FuchsiaColors.IconAccent, modifier = Modifier.size(29.dp))
            Text(value, color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            Text(label, color = FuchsiaColors.Muted, fontSize = 10.sp)
        }
    }
}

@Composable
private fun AccountStatsCard(orderCount: Int, rewardPoints: Int, totalSpent: Double) {
    Card(
        shape = RoundedCornerShape(19.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxWidth().padding(vertical = 15.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            AccountStat("الطلبات", orderCount.toString())
            HorizontalDivider(Modifier.height(34.dp).width(1.dp), color = FuchsiaColors.Line)
            AccountStat("النقاط", rewardPoints.toString())
            HorizontalDivider(Modifier.height(34.dp).width(1.dp), color = FuchsiaColors.Line)
            AccountStat("المصروف", formatRiyal(totalSpent))
        }
    }
}

@Composable
private fun AccountStat(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(value, color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
        Text(label, color = FuchsiaColors.Muted, fontSize = 10.sp)
    }
}

@Composable
private fun AccountAction(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, detail: String, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 15.dp, vertical = 14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(42.dp).background(FuchsiaColors.Rose, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                Icon(icon, contentDescription = null, tint = FuchsiaColors.IconAccent)
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
fun ProfileEditorScreen(onBack: () -> Unit, onSaved: () -> Unit) {
    val context = LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    val cachedUser = remember(context) { SessionVault.read(context)?.optJSONObject("user") }
    val scope = rememberCoroutineScope()
    var fullName by remember { mutableStateOf(cachedUser?.optString("fullName").orEmpty()) }
    var phone by remember { mutableStateOf(cachedUser?.optString("phone").orEmpty().takeUnless { it == "null" }.orEmpty()) }
    var secondPhone by remember { mutableStateOf(cachedUser?.optString("secondPhone").orEmpty().takeUnless { it == "null" }.orEmpty()) }
    var email by remember { mutableStateOf(cachedUser?.optString("email").orEmpty()) }
    var loading by remember { mutableStateOf(token != null) }
    var saving by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }

    LaunchedEffect(token) {
        if (token.isNullOrBlank()) {
            loading = false
            error = "انتهت الجلسة؛ سجّل الدخول لعرض بيانات الحساب."
            return@LaunchedEffect
        }
        try {
            val latest = FuchsiaApi.profile(token)
            fullName = latest.optString("fullName").ifBlank { fullName }
            phone = latest.optString("phone").takeUnless { it == "null" }.orEmpty()
            secondPhone = latest.optString("secondPhone").takeUnless { it == "null" }.orEmpty()
            email = latest.optString("email")
            SessionVault.save(context, latest, token)
        } catch (failure: Exception) {
            error = failure.message ?: "تعذر تحميل الملف الشخصي."
        } finally {
            loading = false
        }
    }

    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        Column(
            Modifier.fillMaxSize().padding(top = insets.calculateTopPadding()).verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 14.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            ScreenHeading("بيانات الحساب", onBack)
            Text("حدّث بيانات التواصل لتصل إليك تأكيدات الطلب والتوصيل بسهولة.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
            OutlinedTextField(fullName, { fullName = it; error = "" }, modifier = Modifier.fillMaxWidth(), label = { Text("الاسم الكامل") }, singleLine = true, shape = RoundedCornerShape(15.dp))
            OutlinedTextField(phone, { phone = it; error = "" }, modifier = Modifier.fillMaxWidth(), label = { Text("رقم التواصل الأساسي") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), shape = RoundedCornerShape(15.dp))
            OutlinedTextField(secondPhone, { secondPhone = it; error = "" }, modifier = Modifier.fillMaxWidth(), label = { Text("رقم تواصل إضافي (اختياري)") }, supportingText = { Text("يُستخدم كبديل عند الحاجة فقط") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone), shape = RoundedCornerShape(15.dp))
            OutlinedTextField(email, {}, modifier = Modifier.fillMaxWidth(), label = { Text("البريد الإلكتروني") }, singleLine = true, readOnly = true, shape = RoundedCornerShape(15.dp))
            if (loading) LinearLoading()
            if (error.isNotBlank()) Text(error, color = FuchsiaColors.Error, style = MaterialTheme.typography.bodySmall)
            Button(
                onClick = {
                    val sessionToken = token
                    if (sessionToken.isNullOrBlank()) {
                        error = "سجّل الدخول لحفظ التعديلات."
                    } else if (fullName.trim().length < 2) {
                        error = "أدخل الاسم الكامل."
                    } else {
                        saving = true
                        error = ""
                        scope.launch {
                            try {
                                val updated = FuchsiaApi.updateProfile(sessionToken, fullName.trim(), phone.trim(), secondPhone.trim())
                                SessionVault.save(context, updated, sessionToken)
                                onSaved()
                            } catch (failure: Exception) {
                                error = failure.message ?: "تعذر حفظ التعديلات. تحقق من الاتصال بالخادم."
                            } finally {
                                saving = false
                            }
                        }
                    }
                },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                enabled = !saving && !loading,
                colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                shape = RoundedCornerShape(15.dp),
            ) {
                if (saving) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = FuchsiaColors.OnPrimary, strokeWidth = 2.dp)
                else Text("حفظ البيانات", color = FuchsiaColors.OnPrimary, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun AddressBookScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    val scope = rememberCoroutineScope()
    var addresses by remember { mutableStateOf<List<DeliveryAddress>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var reloadKey by remember { mutableIntStateOf(0) }
    var editorVisible by remember { mutableStateOf(false) }
    var editingAddress by remember { mutableStateOf<DeliveryAddress?>(null) }
    var deletingAddress by remember { mutableStateOf<DeliveryAddress?>(null) }

    LaunchedEffect(token, reloadKey) {
        if (token.isNullOrBlank()) {
            loading = false
            error = "سجّل الدخول لعرض عناوين التوصيل المحفوظة."
            return@LaunchedEffect
        }
        loading = addresses.isEmpty()
        try {
            addresses = FuchsiaApi.addresses(token)
            error = ""
        } catch (failure: Exception) {
            error = failure.message ?: "تعذر تحميل العناوين."
        } finally {
            loading = false
        }
    }

    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        Column(Modifier.fillMaxSize().padding(top = insets.calculateTopPadding())) {
            Column(Modifier.padding(horizontal = 20.dp, vertical = 14.dp)) {
                ScreenHeading("عناوين التوصيل", onBack)
                Text("احفظ أكثر من عنوان وحدد العنوان الافتراضي للطلبات القادمة.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 4.dp))
                Button(
                    onClick = { editingAddress = null; editorVisible = true },
                    modifier = Modifier.fillMaxWidth().padding(top = 13.dp).height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                    shape = RoundedCornerShape(15.dp),
                ) {
                    Icon(Icons.Rounded.Add, contentDescription = null, tint = FuchsiaColors.OnPrimary)
                    Spacer(Modifier.width(7.dp))
                    Text("إضافة عنوان جديد", color = FuchsiaColors.OnPrimary, fontWeight = FontWeight.Bold)
                }
            }
            if (loading) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) }
            } else if (error.isNotBlank() && addresses.isEmpty()) {
                Box(Modifier.fillMaxSize().padding(24.dp), contentAlignment = Alignment.Center) {
                    Text(error, color = FuchsiaColors.Error, textAlign = TextAlign.Center)
                }
            } else if (addresses.isEmpty()) {
                Box(Modifier.fillMaxSize().padding(22.dp), contentAlignment = Alignment.Center) {
                    Text("لا توجد عناوين محفوظة بعد. أضف عنوانًا لتسريع إتمام الطلب.", color = FuchsiaColors.Muted, textAlign = TextAlign.Center)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 20.dp, end = 20.dp, bottom = insets.calculateBottomPadding() + 24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    if (error.isNotBlank()) item { Text(error, color = FuchsiaColors.Error, style = MaterialTheme.typography.bodySmall) }
                    items(addresses, key = { it.id }) { address ->
                        AddressCard(
                            address = address,
                            busy = busy,
                            onEdit = { editingAddress = address; editorVisible = true },
                            onDelete = { deletingAddress = address },
                            onDefault = {
                                val sessionToken = token ?: return@AddressCard
                                busy = true
                                scope.launch {
                                    try {
                                        FuchsiaApi.updateAddress(address.id, JSONObject().put("isDefault", true), sessionToken)
                                        reloadKey++
                                    } catch (failure: Exception) {
                                        error = failure.message ?: "تعذر تعيين العنوان الافتراضي."
                                    } finally {
                                        busy = false
                                    }
                                }
                            },
                        )
                    }
                }
            }
        }
    }

    if (editorVisible) {
        AddressEditorDialog(
            initial = editingAddress,
            initiallyDefault = editingAddress?.isDefault ?: addresses.isEmpty(),
            saving = busy,
            onDismiss = { if (!busy) editorVisible = false },
            onSave = { label, name, phone, address, notes, latitude, longitude, isDefault ->
                val sessionToken = token
                if (sessionToken.isNullOrBlank()) {
                    error = "سجّل الدخول لحفظ العنوان."
                    editorVisible = false
                } else {
                    busy = true
                    scope.launch {
                        try {
                            val payload = JSONObject()
                                .put("label", label)
                                .put("recipientName", name)
                                .put("phone", phone)
                                .put("address", address)
                                .put("notes", notes)
                                .put("latitude", latitude ?: JSONObject.NULL)
                                .put("longitude", longitude ?: JSONObject.NULL)
                                .put("isDefault", isDefault)
                            val editing = editingAddress
                            if (editing == null) FuchsiaApi.createAddress(payload, sessionToken)
                            else FuchsiaApi.updateAddress(editing.id, payload, sessionToken)
                            editorVisible = false
                            reloadKey++
                        } catch (failure: Exception) {
                            error = failure.message ?: "تعذر حفظ العنوان."
                        } finally {
                            busy = false
                        }
                    }
                }
            },
        )
    }

    deletingAddress?.let { address ->
        AlertDialog(
            onDismissRequest = { if (!busy) deletingAddress = null },
            title = { Text("حذف العنوان؟", color = FuchsiaColors.Ink) },
            text = { Text("سيُحذف عنوان «${address.label}» من هذا الحساب.", color = FuchsiaColors.Muted) },
            confirmButton = {
                TextButton(enabled = !busy, onClick = {
                    val sessionToken = token
                    if (sessionToken == null) {
                        error = "انتهت الجلسة؛ سجّل الدخول من جديد."
                        deletingAddress = null
                    } else {
                        busy = true
                        scope.launch {
                            try {
                                FuchsiaApi.deleteAddress(address.id, sessionToken)
                                deletingAddress = null
                                reloadKey++
                            } catch (failure: Exception) {
                                error = failure.message ?: "تعذر حذف العنوان."
                            } finally {
                                busy = false
                            }
                        }
                    }
                }) { Text("حذف", color = FuchsiaColors.TextAccent) }
            },
            dismissButton = { TextButton(enabled = !busy, onClick = { deletingAddress = null }) { Text("إلغاء") } },
        )
    }
}

@Composable
private fun AddressCard(
    address: DeliveryAddress,
    busy: Boolean,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onDefault: () -> Unit,
) {
    Card(
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, if (address.isDefault) FuchsiaColors.Primary else FuchsiaColors.Line),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(40.dp).background(FuchsiaColors.Rose, RoundedCornerShape(13.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary)
                }
                Column(Modifier.weight(1f)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        Text(address.label, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                        if (address.isDefault) Text("افتراضي", color = FuchsiaColors.TextAccent, style = MaterialTheme.typography.labelSmall)
                    }
                    Text(address.recipientName, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall)
                }
                IconButton(onClick = onEdit, enabled = !busy) { Icon(Icons.Rounded.Edit, contentDescription = "تعديل العنوان", tint = FuchsiaColors.Primary) }
                IconButton(onClick = onDelete, enabled = !busy) { Icon(Icons.Rounded.DeleteOutline, contentDescription = "حذف العنوان", tint = FuchsiaColors.Muted) }
            }
            HorizontalDivider(Modifier.padding(vertical = 10.dp), color = FuchsiaColors.Line)
            Text(address.address, color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodyMedium)
            Text(address.phone, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 5.dp))
            address.notes?.takeIf(String::isNotBlank)?.let { Text("ملاحظة: $it", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, modifier = Modifier.padding(top = 5.dp)) }
            if (!address.isDefault) {
                TextButton(onClick = onDefault, enabled = !busy, modifier = Modifier.align(Alignment.End)) {
                    Icon(Icons.Rounded.Star, contentDescription = null, tint = FuchsiaColors.Gold, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(4.dp))
                    Text("تعيين افتراضي", color = FuchsiaColors.TextAccent)
                }
            }
        }
    }
}

@Composable
private fun AddressEditorDialog(
    initial: DeliveryAddress?,
    initiallyDefault: Boolean,
    saving: Boolean,
    onDismiss: () -> Unit,
    onSave: (String, String, String, String, String, Double?, Double?, Boolean) -> Unit,
) {
    var label by remember(initial?.id) { mutableStateOf(initial?.label ?: "المنزل") }
    var name by remember(initial?.id) { mutableStateOf(initial?.recipientName.orEmpty()) }
    var phone by remember(initial?.id) { mutableStateOf(initial?.phone.orEmpty()) }
    var address by remember(initial?.id) { mutableStateOf(initial?.address.orEmpty()) }
    var notes by remember(initial?.id) { mutableStateOf(initial?.notes.orEmpty()) }
    var latitude by remember(initial?.id) { mutableStateOf(initial?.latitude) }
    var longitude by remember(initial?.id) { mutableStateOf(initial?.longitude) }
    var isDefault by remember(initial?.id) { mutableStateOf(initiallyDefault) }
    var error by remember(initial?.id) { mutableStateOf("") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(if (initial == null) "إضافة عنوان" else "تعديل العنوان", color = FuchsiaColors.Ink) },
        text = {
            Column(Modifier.fillMaxWidth().heightIn(max = 420.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                OutlinedTextField(label, { label = it }, modifier = Modifier.fillMaxWidth(), label = { Text("اسم العنوان، مثل المنزل") }, singleLine = true)
                OutlinedTextField(name, { name = it }, modifier = Modifier.fillMaxWidth(), label = { Text("اسم المستلم") }, singleLine = true)
                OutlinedTextField(phone, { phone = it }, modifier = Modifier.fillMaxWidth(), label = { Text("رقم الهاتف") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
                OutlinedTextField(address, { address = it }, modifier = Modifier.fillMaxWidth(), label = { Text("العنوان بالتفصيل") }, minLines = 2)
                OutlinedTextField(notes, { notes = it }, modifier = Modifier.fillMaxWidth(), label = { Text("ملاحظات للمندوب (اختياري)") }, minLines = 2)
                Text("موقع العنوان على الخريطة (اختياري)", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                MapLocationPicker(
                    selectedLatitude = latitude,
                    selectedLongitude = longitude,
                    onConfirmLocation = { selectedLatitude, selectedLongitude ->
                        latitude = selectedLatitude
                        longitude = selectedLongitude
                    },
                )
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(checked = isDefault, onCheckedChange = { isDefault = it })
                    Text("استخدامه كعنوان افتراضي", color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodySmall)
                }
                if (error.isNotBlank()) Text(error, color = FuchsiaColors.Error, style = MaterialTheme.typography.bodySmall)
            }
        },
        confirmButton = {
            TextButton(enabled = !saving, onClick = {
                if (label.trim().isBlank() || name.trim().length < 2 || phone.trim().length < 7 || address.trim().length < 5) {
                    error = "أكمل اسم العنوان والمستلم ورقم الهاتف والعنوان بالتفصيل."
                } else {
                    onSave(label.trim(), name.trim(), phone.trim(), address.trim(), notes.trim(), latitude, longitude, isDefault)
                }
            }) {
                if (saving) CircularProgressIndicator(Modifier.size(18.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                else Text("حفظ", color = FuchsiaColors.TextAccent)
            }
        },
        dismissButton = { TextButton(enabled = !saving, onClick = onDismiss) { Text("إلغاء") } },
    )
}

@Composable
private fun ScreenHeading(title: String, onBack: () -> Unit) {
    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
        IconButton(onClick = onBack, modifier = Modifier.size(44.dp)) {
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink)
        }
        Text(title, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge)
    }
}

@Composable
private fun LinearLoading() {
    Box(Modifier.fillMaxWidth().padding(8.dp), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(modifier = Modifier.size(22.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
    }
}
