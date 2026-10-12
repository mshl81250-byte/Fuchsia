package com.fuchsia.partner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Event
import androidx.compose.material.icons.rounded.Logout
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import com.fuchsia.designsystem.FuchsiaColors
import com.fuchsia.designsystem.FuchsiaPrimaryButton
import com.fuchsia.designsystem.FuchsiaSurfaceCard
import com.fuchsia.designsystem.FuchsiaStatusChip
import com.fuchsia.designsystem.FuchsiaStatusTone
import com.fuchsia.designsystem.FuchsiaTheme

private val Fuchsia: Color @Composable get() = FuchsiaColors.Primary
private val Green: Color @Composable get() = FuchsiaColors.Success
private val Amber: Color @Composable get() = FuchsiaColors.Warning
private val Red: Color @Composable get() = FuchsiaColors.Error
private val Weekdays = listOf("الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت")

private data class UnifiedCalendarEvent(val id: String, val startDate: String, val endDate: String, val title: String, val details: String, val status: String, val kind: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            FuchsiaTheme { PartnerRoot() }
        }
    }
}

@Composable
private fun PartnerRoot() {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var token by remember { mutableStateOf(PartnerSession.token(context)) }
    var profile by remember { mutableStateOf<JSONObject?>(null) }
    var profileError by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var loginBusy by remember { mutableStateOf(false) }
    var loginError by remember { mutableStateOf("") }
    var preview by remember { mutableStateOf(false) }
    var reloadKey by remember { mutableStateOf(0) }

    LaunchedEffect(token, reloadKey, preview) {
        if (!preview && !token.isNullOrBlank()) {
            loading = true
            profileError = ""
            runCatching { PartnerApi.profile(token.orEmpty()) }
                .onSuccess { profile = it }
                .onFailure { profile = null; profileError = it.message ?: "تعذر تحميل حساب الشريك" }
            loading = false
        }
    }

    when {
        preview -> PartnerDashboard(
            token = null, profile = null, preview = true,
            onExit = { preview = false },
        )
        token.isNullOrBlank() -> LoginScreen(
            busy = loginBusy,
            error = loginError,
            onLogin = { email, password ->
                scope.launch {
                    loginBusy = true; loginError = ""
                    runCatching { PartnerApi.login(email.trim(), password) }
                        .onSuccess { session ->
                            PartnerSession.save(context, session.user, session.token)
                            profile = null
                            token = session.token
                        }
                        .onFailure { loginError = it.message ?: "تعذر تسجيل الدخول" }
                    loginBusy = false
                }
            },
            onPreview = { preview = true },
        )
        loading -> CenterMessage("جارٍ تحميل مساحة الشريك…", busy = true)
        profileError.isNotBlank() -> ServiceErrorScreen(
            message = profileError,
            onRetry = { reloadKey++ },
            onPreview = { if (BuildConfig.DEBUG) preview = true },
            onLogout = { PartnerSession.clear(context); token = null; profile = null; profileError = "" },
        )
        else -> {
            val owner = profile?.optJSONObject("owner")
            val status = owner?.optString("status").orEmpty()
            val hasRentalStore = (profile?.optJSONArray("rentalStores")?.length() ?: 0) > 0
            when {
                owner == null && !hasRentalStore -> PartnerRequestScreen(
                    onSubmit = { business, phone ->
                        scope.launch {
                            loading = true
                            runCatching { PartnerApi.requestPartner(token.orEmpty(), business, phone) }
                                .onSuccess { reloadKey++ }
                                .onFailure { profileError = it.message ?: "تعذر إرسال الطلب" }
                            loading = false
                        }
                    },
                    onLogout = { PartnerSession.clear(context); token = null; profile = null },
                    error = profileError,
                )
                status == "pending" && !hasRentalStore -> PendingApprovalScreen(
                    businessName = owner?.optString("businessName").orEmpty(),
                    onRefresh = { reloadKey++ },
                    onLogout = { PartnerSession.clear(context); token = null; profile = null },
                )
                status.isNotBlank() && status != "active" && !hasRentalStore -> InactivePartnerScreen(
                    status = status,
                    onLogout = { PartnerSession.clear(context); token = null; profile = null },
                )
                else -> PartnerDashboard(
                    token = token,
                    profile = profile,
                    preview = false,
                    onExit = { PartnerSession.clear(context); token = null; profile = null },
                )
            }
        }
    }
}

@Composable
private fun LoginScreen(busy: Boolean, error: String, onLogin: (String, String) -> Unit, onPreview: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    Column(
        Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        BrandMark()
        Spacer(Modifier.height(18.dp))
        Text("Fuchsia Partner", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
        Text("إدارة قاعاتك وحجوزاتك بسهولة", color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 6.dp, bottom = 24.dp))
        FuchsiaSurfaceCard {
            Column(Modifier.fillMaxWidth().padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Text("تسجيل دخول الشريك", fontWeight = FontWeight.Bold, fontSize = 18.sp)
                OutlinedTextField(email, { email = it }, Modifier.fillMaxWidth(), label = { Text("البريد الإلكتروني") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email))
                OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("كلمة المرور") }, singleLine = true, visualTransformation = PasswordVisualTransformation())
                if (error.isNotBlank()) Notice(error, error = true)
                FuchsiaPrimaryButton(
                    text = "دخول إلى مساحة الشريك",
                    enabled = email.isNotBlank() && password.isNotBlank(),
                    busy = busy,
                    onClick = { onLogin(email, password) },
                )
            }
        }
        Text("استخدم حسابك في فوشيا بوتيك. يلزم اعتماد الحساب كشريك من الإدارة.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, textAlign = TextAlign.Center, modifier = Modifier.padding(top = 18.dp))
        if (BuildConfig.DEBUG) {
            TextButton(onClick = onPreview, modifier = Modifier.padding(top = 4.dp)) { Text("معاينة الواجهة دون اتصال", color = MaterialTheme.colorScheme.primary) }
        }
    }
}

@Composable
private fun PartnerRequestScreen(onSubmit: (String, String) -> Unit, onLogout: () -> Unit, error: String) {
    var business by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var sending by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(22.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        BrandMark()
        Spacer(Modifier.height(18.dp))
        Text("ابدأ كشريك", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
        Text("أرسل بيانات نشاط القاعة لمراجعتها واعتماد حسابك.", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
        OutlinedTextField(business, { business = it }, Modifier.fillMaxWidth(), label = { Text("اسم النشاط أو القاعة") }, singleLine = true)
        Spacer(Modifier.height(10.dp))
        OutlinedTextField(phone, { phone = it }, Modifier.fillMaxWidth(), label = { Text("رقم التواصل") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone))
        if (error.isNotBlank()) Notice(error, error = true)
        Button(onClick = { sending = true; onSubmit(business, phone) }, enabled = !sending && business.isNotBlank() && phone.isNotBlank(), modifier = Modifier.fillMaxWidth().padding(top = 14.dp).height(50.dp)) { Text("إرسال طلب الاعتماد") }
        TextButton(onClick = onLogout) { Text("تسجيل الخروج") }
    }
}

@Composable
private fun PendingApprovalScreen(businessName: String, onRefresh: () -> Unit, onLogout: () -> Unit) {
    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        BrandMark()
        Spacer(Modifier.height(20.dp))
        Text("طلبك قيد المراجعة", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
        Text(businessName, color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, modifier = Modifier.padding(8.dp))
        Text("ستظهر لك حجوزات القاعة بعد اعتماد الشراكة من الإدارة.", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Button(onClick = onRefresh, modifier = Modifier.fillMaxWidth().padding(top = 20.dp)) { Icon(Icons.Rounded.Refresh, contentDescription = null); Text("تحديث الحالة", modifier = Modifier.padding(start = 6.dp)) }
        TextButton(onClick = onLogout) { Text("تسجيل الخروج") }
    }
}

@Composable
private fun InactivePartnerScreen(status: String, onLogout: () -> Unit) {
    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        BrandMark()
        Spacer(Modifier.height(20.dp))
        Text("حساب الشريك غير مفعّل", style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
        Text("حالة الحساب: ${status.ifBlank { "غير متاح" }}. تواصل مع إدارة فوشيا لمراجعة الحساب.", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(vertical = 12.dp))
        Button(onClick = onLogout) { Text("تسجيل الخروج") }
    }
}

@Composable
private fun ServiceErrorScreen(message: String, onRetry: () -> Unit, onPreview: () -> Unit, onLogout: () -> Unit) {
    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        BrandMark()
        Spacer(Modifier.height(20.dp))
        Text("تعذر تحميل مساحة الشريك", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
        Text(message, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center, modifier = Modifier.padding(vertical = 12.dp))
        Text("تحقق من نشر واجهات /api/venue-partner على الخادم ثم أعد المحاولة.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp, textAlign = TextAlign.Center)
        Button(onClick = onRetry, modifier = Modifier.fillMaxWidth().padding(top = 18.dp)) { Icon(Icons.Rounded.Refresh, contentDescription = null); Text("إعادة المحاولة", modifier = Modifier.padding(start = 6.dp)) }
        if (BuildConfig.DEBUG) TextButton(onClick = onPreview) { Text("عرض معاينة الواجهة") }
        TextButton(onClick = onLogout) { Text("تسجيل الخروج") }
    }
}

@Composable
private fun PartnerDashboard(token: String?, profile: JSONObject?, preview: Boolean, onExit: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    val venueRows = remember(profile, preview) { if (preview) demoVenues() else parseVenues(profile?.optJSONArray("venues")) }
    val rentalStores = remember(profile, preview) { if (preview) demoRentalStores() else parseRentalStores(profile?.optJSONArray("rentalStores")) }
    var selectedVenueId by remember(venueRows) { mutableStateOf(venueRows.firstOrNull()?.id ?: 0) }
    val selectedVenue = venueRows.firstOrNull { it.id == selectedVenueId } ?: venueRows.firstOrNull()
    var activeTab by remember(venueRows, rentalStores) { mutableStateOf(if (venueRows.isEmpty() && rentalStores.isNotEmpty()) 2 else 0) }
    var bookings by remember(preview) { mutableStateOf(if (preview) demoBookings() else emptyList()) }
    var unifiedEvents by remember(preview) { mutableStateOf(emptyList<UnifiedCalendarEvent>()) }
    var loadingBookings by remember { mutableStateOf(!preview) }
    var bookingsError by remember { mutableStateOf("") }
    var monthAnchor by remember { mutableStateOf(Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, 1) }) }
    val monthKey = remember(monthAnchor.timeInMillis) { SimpleDateFormat("yyyy-MM", Locale.US).format(monthAnchor.time) }
    var audience by remember(selectedVenueId) { mutableStateOf(if (selectedVenue?.audienceScope == "men") "men" else "women") }
    var availability by remember { mutableStateOf(PartnerMonthAvailability(emptySet(), emptySet())) }
    var blackouts by remember(preview) { mutableStateOf(if (preview) demoBlackouts() else emptyList()) }
    var weeklyRows by remember(preview) { mutableStateOf(emptyList<PartnerWeeklySlot>()) }
    var weeklyOpenDays by remember(preview) { mutableStateOf(if (preview) setOf(0, 1, 2, 3, 4, 6) else emptySet()) }
    var loadingCalendar by remember { mutableStateOf(false) }
    var calendarError by remember { mutableStateOf("") }
    var selectedStart by remember { mutableStateOf<String?>(null) }
    var selectedEnd by remember { mutableStateOf<String?>(null) }
    var selectedBooking by remember { mutableStateOf<PartnerBooking?>(null) }
    var rejectTarget by remember { mutableStateOf<PartnerBooking?>(null) }
    var rejectReason by remember { mutableStateOf("") }
    var selectedBlackout by remember { mutableStateOf<PartnerBlackout?>(null) }
    var showCloseDialog by remember { mutableStateOf(false) }
    var closeReason by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val businessName = profile?.optJSONObject("owner")?.optString("businessName")?.takeIf(String::isNotBlank)
        ?: rentalStores.firstOrNull()?.name.orEmpty()

    suspend fun reloadBookings() {
        if (preview) {
            bookings = demoBookings()
            val cal = Calendar.getInstance()
            cal.add(Calendar.DAY_OF_MONTH, 7)
            val first = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
            cal.add(Calendar.DAY_OF_MONTH, 7)
            val second = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(cal.time)
            unifiedEvents = listOf(
                UnifiedCalendarEvent("demo-rental-1", first, first, "إيجار كوش ملكية", "طلب معاينة · كمية 1", "rental_confirmed", "rental"),
                UnifiedCalendarEvent("demo-rental-2", second, second, "إيجار طاولات مناسبات", "طلب معاينة · كمية 8", "rental_pending_confirmation", "rental"),
            ) + demoBookings().filter { it.status in setOf("pending", "confirmed") }.map { booking ->
                val end = (Calendar.getInstance().apply { time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(booking.dateOnly) ?: Date(); add(Calendar.DAY_OF_MONTH, booking.bookingDays - 1) }).time
                UnifiedCalendarEvent("venue-${booking.id}", booking.dateOnly, SimpleDateFormat("yyyy-MM-dd", Locale.US).format(end), "حجز قاعة · ${venueRows.firstOrNull { it.id == booking.venueId }?.name.orEmpty()}", "${booking.partySize} ضيف · ${booking.bookingDays} يوم", booking.status, "venue")
            }
            return
        }
        val auth = token ?: return
        loadingBookings = true
        bookingsError = ""
        val venueResult = runCatching { PartnerApi.bookings(auth) }
        venueResult.onSuccess { bookings = it }.onFailure { bookingsError = it.message ?: "تعذر تحميل حجوزات القاعات" }
        val rentalResult = runCatching { rentalStores.flatMap { store -> PartnerRentalApi.bookings(auth, store.id).flatMap { booking ->
            booking.items.map { item -> UnifiedCalendarEvent("rental-${booking.id}-${item.name}", item.startDate.take(10), item.endDate.take(10), "إيجار · ${item.name}", "${store.name} · ${booking.customerName} · كمية ${item.quantity}", booking.status, "rental") }
        } } }
        rentalResult.onSuccess { rentalEvents ->
            val venueEvents = (venueResult.getOrNull() ?: bookings).filter { it.status in setOf("pending", "confirmed") && !isBookingExpired(it) }.map { booking ->
                val end = Calendar.getInstance().apply { time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(booking.dateOnly) ?: Date(); add(Calendar.DAY_OF_MONTH, booking.bookingDays.coerceAtLeast(1) - 1) }
                UnifiedCalendarEvent("venue-${booking.id}", booking.dateOnly, SimpleDateFormat("yyyy-MM-dd", Locale.US).format(end.time), "حجز قاعة · ${venueRows.firstOrNull { it.id == booking.venueId }?.name.orEmpty()}", "${booking.partySize} ضيف · ${booking.bookingDays} يوم", booking.status, "venue")
            }
            unifiedEvents = venueEvents + rentalEvents.filter { it.status !in setOf("rental_rejected", "rental_cancelled", "rental_returned") }
        }.onFailure { if (bookingsError.isBlank()) bookingsError = it.message ?: "تعذر تحميل حجوزات الإيجار للتقويم الموحد" }
        loadingBookings = false
    }

    LaunchedEffect(token, preview, venueRows.size, rentalStores.size) { reloadBookings() }

    LaunchedEffect(token, selectedVenueId, monthKey, audience, preview) {
        selectedStart = null; selectedEnd = null
        if (selectedVenue == null) return@LaunchedEffect
        if (preview) {
            availability = PartnerMonthAvailability(emptySet(), emptySet())
            blackouts = demoBlackouts()
            weeklyRows = emptyList()
            weeklyOpenDays = setOf(0, 1, 2, 3, 4, 6)
            return@LaunchedEffect
        }
        val auth = token ?: return@LaunchedEffect
        loadingCalendar = true; calendarError = ""
        try {
            availability = PartnerApi.monthAvailability(auth, selectedVenue.id, monthKey, audience)
            blackouts = PartnerApi.blackouts(auth, selectedVenue.id, monthKey)
            weeklyRows = PartnerApi.weeklySchedule(auth, selectedVenue.id)
            val scheduleScope = selectedVenue.audienceScope
            weeklyOpenDays = weeklyRows.filter { it.audienceScope == scheduleScope && it.isOpen }.map { it.weekDay }.toSet()
        } catch (failure: Exception) {
            calendarError = failure.message ?: "تعذر تحميل تقويم القاعة"
        }
        loadingCalendar = false
    }

    Scaffold(snackbarHost = { SnackbarHost(snackbar) }) { insets ->
        Column(Modifier.fillMaxSize().padding(insets).windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 16.dp)) {
            Row(Modifier.fillMaxWidth().padding(top = 10.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                BrandMark(compact = true)
                Column(Modifier.weight(1f).padding(start = 10.dp)) {
                    Text("مساحة الشريك", fontWeight = FontWeight.ExtraBold, fontSize = 18.sp)
                    Text(if (preview) "معاينة فقط · لا تحفظ أي تغييرات" else businessName.ifBlank { "إدارة القاعات والحجوزات" }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                }
                TextButton(onClick = onExit) { Icon(Icons.Rounded.Logout, contentDescription = "تسجيل الخروج"); Text("خروج", fontSize = 12.sp) }
            }
            if (preview) Notice("وضع معاينة محلي — البيانات والأزرار لا تنشئ حجوزات أو تغييرات حقيقية.")
            if (venueRows.isEmpty()) {
                if (rentalStores.isNotEmpty()) {
                    RentalPartnerHub(token = token, stores = rentalStores, preview = preview, onMessage = { message -> scope.launch { snackbar.showSnackbar(message) } }, modifier = Modifier.weight(1f))
                } else EmptyVenues()
            } else {
                if (activeTab !in setOf(2, 3)) {
                VenuePicker(venueRows, selectedVenueId) { venue ->
                    selectedVenueId = venue.id
                    audience = if (venue.audienceScope == "men") "men" else "women"
                }
                Row(Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    StatCard("طلبات جديدة", bookings.count { it.venueId == selectedVenue?.id && it.status == "pending" && !isBookingExpired(it) }.toString(), Modifier.weight(1f), Fuchsia)
                    StatCard("حجوزات مؤكدة", bookings.count { it.venueId == selectedVenue?.id && it.status == "confirmed" }.toString(), Modifier.weight(1f), Green)
                }
                }
                Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    FilterChip(selected = activeTab == 0, onClick = { activeTab = 0 }, label = { Text("تقويم القاعات") }, leadingIcon = { Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(18.dp)) })
                    FilterChip(selected = activeTab == 1, onClick = { activeTab = 1 }, label = { Text("طلبات القاعات") }, leadingIcon = { Icon(Icons.Rounded.Event, null, Modifier.size(18.dp)) })
                    if (rentalStores.isNotEmpty()) FilterChip(selected = activeTab == 2, onClick = { activeTab = 2 }, label = { Text("إدارة الإيجارات") }, leadingIcon = { Icon(Icons.Rounded.Business, null, Modifier.size(18.dp)) })
                    if (rentalStores.isNotEmpty() && venueRows.isNotEmpty()) FilterChip(selected = activeTab == 3, onClick = { activeTab = 3 }, label = { Text("التقويم الموحد") }, leadingIcon = { Icon(Icons.Rounded.CalendarMonth, null, Modifier.size(18.dp)) })
                }
                if (activeTab == 0) {
                    CalendarContent(
                        venue = selectedVenue!!, audience = audience, onAudience = { audience = it },
                        monthAnchor = monthAnchor, onMonth = { delta -> monthAnchor = (monthAnchor.clone() as Calendar).apply { add(Calendar.MONTH, delta) } },
                        bookings = bookings, availability = availability, blackouts = blackouts,
                        weeklyOpenDays = weeklyOpenDays, onToggleWeekday = { day -> weeklyOpenDays = if (day in weeklyOpenDays) weeklyOpenDays - day else weeklyOpenDays + day },
                        loading = loadingCalendar, error = calendarError, preview = preview,
                        selectedStart = selectedStart, selectedEnd = selectedEnd,
                        onClearSelection = { selectedStart = null; selectedEnd = null },
                        onSelectDate = { date ->
                            val blackout = blackouts.firstOrNull { date >= it.startDate && date <= it.endDate && (it.audienceScope == "both" || it.audienceScope == audience) }
                            if (blackout != null) selectedBlackout = blackout
                            else {
                                val booking = bookings.firstOrNull { it.venueId == selectedVenue.id && it.audience == audience && it.status in setOf("pending", "confirmed") && !isBookingExpired(it) && isWithinBooking(date, it) }
                                if (booking != null) selectedBooking = booking
                                else if (date in availability.closed) scope.launch { snackbar.showSnackbar("هذا اليوم خارج جدول الدوام الأسبوعي") }
                                else if (date in availability.booked) scope.launch { snackbar.showSnackbar("هذا اليوم مرتبط بحجز أو إغلاق؛ لا يمكن اختياره") }
                                else if (selectedStart == null || selectedEnd != null || date < selectedStart.orEmpty()) { selectedStart = date; selectedEnd = null }
                                else selectedEnd = date
                            }
                        },
                        onSaveSchedule = {
                            if (preview) scope.launch { snackbar.showSnackbar("المعاينة لا تحفظ التعديلات") }
                            else scope.launch {
                                busy = true
                                val scheduleScope = selectedVenue.audienceScope
                                val updated = weeklyRows.filter { it.audienceScope != scheduleScope } + (0..6).map { day -> PartnerWeeklySlot(scheduleScope, day, day in weeklyOpenDays) }
                                runCatching { PartnerApi.saveWeeklySchedule(token.orEmpty(), selectedVenue.id, updated) }
                                    .onSuccess {
                                        weeklyRows = updated
                                        availability = PartnerApi.monthAvailability(token.orEmpty(), selectedVenue.id, monthKey, audience)
                                        snackbar.showSnackbar("تم حفظ الدوام الأسبوعي")
                                    }
                                    .onFailure { snackbar.showSnackbar(it.message ?: "تعذر حفظ الدوام") }
                                busy = false
                            }
                        },
                        onCloseRequest = { showCloseDialog = true },
                        busy = busy,
                    )
                } else if (activeTab == 1) {
                    BookingsContent(
                        bookings = bookings.filter { it.venueId == selectedVenue?.id },
                        loading = loadingBookings,
                        error = bookingsError,
                        onRefresh = { scope.launch { reloadBookings() } },
                        onOpen = { selectedBooking = it },
                    )
                } else if (activeTab == 2) {
                    RentalPartnerHub(token = token, stores = rentalStores, preview = preview, onMessage = { message -> scope.launch { snackbar.showSnackbar(message) } }, modifier = Modifier.weight(1f))
                } else if (activeTab == 3) {
                    UnifiedPartnerCalendar(
                        modifier = Modifier.weight(1f),
                        events = unifiedEvents,
                        monthAnchor = monthAnchor,
                        onMonth = { delta -> monthAnchor = (monthAnchor.clone() as Calendar).apply { add(Calendar.MONTH, delta) } },
                        loading = loadingBookings,
                        error = bookingsError,
                        onRefresh = { scope.launch { reloadBookings() } },
                    )
                }
            }
        }
    }

    selectedBooking?.let { booking ->
        BookingDetailsDialog(
            booking = booking,
            venueName = venueRows.firstOrNull { it.id == booking.venueId }?.name.orEmpty(),
            preview = preview,
            busy = busy,
            onDismiss = { selectedBooking = null },
            onUpdate = { status ->
                if (status == "rejected") {
                    selectedBooking = null
                    rejectTarget = booking
                    rejectReason = ""
                } else if (preview) scope.launch { snackbar.showSnackbar("المعاينة لا تحدّث حجوزات حقيقية") }
                else scope.launch {
                    busy = true
                    runCatching { PartnerApi.setBookingStatus(token.orEmpty(), booking.id, status) }
                        .onSuccess { selectedBooking = null; reloadBookings(); snackbar.showSnackbar(if (status == "confirmed") "تم تأكيد الحجز بعد مراجعة الإيصال" else "تم رفض طلب الحجز") }
                        .onFailure { snackbar.showSnackbar(it.message ?: "تعذر تحديث الحجز") }
                    busy = false
                }
            },
        )
    }

    rejectTarget?.let { booking ->
        AlertDialog(
            onDismissRequest = { rejectTarget = null },
            title = { Text("سبب رفض الطلب") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("سيُحفظ السبب ضمن سجل الحجز ويُرسل للعميل.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    OutlinedTextField(rejectReason, { rejectReason = it.take(500) }, modifier = Modifier.fillMaxWidth(), label = { Text("اكتب سبب الرفض") }, minLines = 2)
                }
            },
            confirmButton = {
                TextButton(enabled = !busy && rejectReason.isNotBlank(), onClick = {
                    scope.launch {
                        busy = true
                        runCatching { PartnerApi.setBookingStatus(token.orEmpty(), booking.id, "rejected", rejectReason) }
                            .onSuccess { rejectTarget = null; rejectReason = ""; reloadBookings(); snackbar.showSnackbar("تم رفض الطلب وإبلاغ العميل") }
                            .onFailure { snackbar.showSnackbar(it.message ?: "تعذر رفض الطلب") }
                        busy = false
                    }
                }) { Text("تأكيد الرفض") }
            },
            dismissButton = { TextButton(onClick = { rejectTarget = null }) { Text("رجوع") } },
        )
    }

    selectedBlackout?.let { blackout ->
        AlertDialog(
            onDismissRequest = { selectedBlackout = null },
            title = { Text("فترة مغلقة") },
            text = { Text("من ${prettyDate(blackout.startDate)} إلى ${prettyDate(blackout.endDate)}${blackout.reason?.let { "\nالسبب: $it" }.orEmpty()}") },
            confirmButton = {
                TextButton(enabled = !preview && !busy, onClick = {
                    scope.launch {
                        busy = true
                        runCatching { PartnerApi.reopenDates(token.orEmpty(), selectedVenue?.id ?: 0, blackout.id) }
                            .onSuccess {
                                selectedBlackout = null
                                val venueId = selectedVenue?.id ?: 0
                                blackouts = PartnerApi.blackouts(token.orEmpty(), venueId, monthKey)
                                snackbar.showSnackbar("تمت إعادة فتح الأيام")
                            }
                            .onFailure { snackbar.showSnackbar(it.message ?: "تعذرت إعادة فتح الأيام") }
                        busy = false
                    }
                }) { Text(if (preview) "معاينة فقط" else "إعادة فتح الأيام") }
            },
            dismissButton = { TextButton(onClick = { selectedBlackout = null }) { Text("إغلاق") } },
        )
    }

    if (showCloseDialog) {
        AlertDialog(
            onDismissRequest = { showCloseDialog = false },
            title = { Text("تأكيد إغلاق الأيام") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text("${selectedStart?.let(::prettyDate).orEmpty()} — ${selectedEnd?.let(::prettyDate).orEmpty()}")
                    Text("سيُرفض الإغلاق إذا كان ضمن الفترة حجز مؤكد أو طلب مؤقت نشط.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
                    OutlinedTextField(closeReason, { closeReason = it.take(300) }, label = { Text("السبب (اختياري)") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
                    if (preview) Notice("المعاينة لا ترسل طلبًا إلى الخادم.")
                }
            },
            confirmButton = {
                TextButton(enabled = !preview && !busy && selectedStart != null && selectedEnd != null, onClick = {
                    val start = selectedStart.orEmpty(); val end = selectedEnd.orEmpty(); val venue = selectedVenue
                    if (venue != null) scope.launch {
                        busy = true
                        runCatching { PartnerApi.closeDates(token.orEmpty(), venue.id, start, end, audience, closeReason) }
                            .onSuccess {
                                showCloseDialog = false; closeReason = ""; selectedStart = null; selectedEnd = null
                                val latest = PartnerApi.blackouts(token.orEmpty(), venue.id, monthKey)
                                blackouts = latest
                                snackbar.showSnackbar("تم إغلاق الفترة المحددة")
                            }
                            .onFailure { snackbar.showSnackbar(it.message ?: "تعذر إغلاق الأيام") }
                        busy = false
                    }
                }) { Text("تأكيد الإغلاق") }
            },
            dismissButton = { TextButton(onClick = { showCloseDialog = false }) { Text("إلغاء") } },
        )
    }
}

@Composable
private fun CalendarContent(
    venue: PartnerVenue,
    audience: String,
    onAudience: (String) -> Unit,
    monthAnchor: Calendar,
    onMonth: (Int) -> Unit,
    bookings: List<PartnerBooking>,
    availability: PartnerMonthAvailability,
    blackouts: List<PartnerBlackout>,
    weeklyOpenDays: Set<Int>,
    onToggleWeekday: (Int) -> Unit,
    loading: Boolean,
    error: String,
    preview: Boolean,
    selectedStart: String?,
    selectedEnd: String?,
    onClearSelection: () -> Unit,
    onSelectDate: (String) -> Unit,
    onSaveSchedule: () -> Unit,
    onCloseRequest: () -> Unit,
    busy: Boolean,
) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Column(Modifier.fillMaxWidth().padding(13.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(venue.name, fontWeight = FontWeight.Bold)
                        Text("${venue.city} · ${venue.capacity} ضيف · ${formatMoney(venue.dailyPrice)} لليوم", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                    }
                    Icon(Icons.Rounded.Business, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                }
                if (venue.audienceScope == "both") {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = audience == "women", onClick = { onAudience("women") }, label = { Text("النساء") })
                        FilterChip(selected = audience == "men", onClick = { onAudience("men") }, label = { Text("الرجال") })
                    }
                } else Notice("متاح لقسم ${audienceLabel(venue.audienceScope)} فقط")
            }
        }
        if (error.isNotBlank()) Notice(error, error = true)
        if (loading) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Text("يتم تحديث بيانات التقويم…", fontSize = 12.sp) }
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            TextButton(onClick = { onMonth(-1) }) { Text("‹ السابق") }
            Text(SimpleDateFormat("MMMM yyyy", Locale("ar", "YE")).format(monthAnchor.time), fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            TextButton(onClick = { onMonth(1) }) { Text("التالي ›") }
        }
        Row(Modifier.fillMaxWidth()) {
            Weekdays.forEach { Text(it.take(3), Modifier.weight(1f), textAlign = TextAlign.Center, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant, fontWeight = FontWeight.Bold) }
        }
        val days = buildMonthCells(monthAnchor)
        days.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth()) {
                week.forEach { day ->
                    if (day == null) Spacer(Modifier.weight(1f).aspectRatio(0.92f))
                    else {
                        val date = dateKey(monthAnchor.get(Calendar.YEAR), monthAnchor.get(Calendar.MONTH), day)
                        val booking = bookings.firstOrNull { it.venueId == venue.id && it.audience == audience && it.status in setOf("pending", "confirmed") && !isBookingExpired(it) && isWithinBooking(date, it) }
                        val blackout = blackouts.firstOrNull { date >= it.startDate && date <= it.endDate && (it.audienceScope == "both" || it.audienceScope == audience) }
                        val weeklyClosed = date in availability.closed
                        val genericBooked = date in availability.booked && booking == null && blackout == null
                        val isRange = date == selectedStart || date == selectedEnd || (selectedStart != null && selectedEnd != null && date > selectedStart && date < selectedEnd)
                        DayCell(
                            day = day,
                            status = when { booking?.status == "pending" -> "طلب"; booking?.status == "confirmed" -> "مؤكد"; blackout != null -> "مغلق"; genericBooked -> "مشغول"; weeklyClosed -> "دوام"; else -> "متاح" },
                            selected = isRange,
                            today = date == todayKey(),
                            onClick = { onSelectDate(date) },
                            modifier = Modifier.weight(1f),
                        )
                    }
                }
            }
        }
        CalendarLegend()
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Text("الدوام الأسبوعي", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                Text("حدد الأيام التي تستقبل فيها القاعة الحجوزات. التغيير يطبّق على الأسابيع القادمة.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                Weekdays.indices.toList().chunked(4).forEach { rowDays ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        rowDays.forEach { day ->
                            FilterChip(selected = day in weeklyOpenDays, onClick = { if (!preview) onToggleWeekday(day) }, enabled = !preview, modifier = Modifier.weight(1f), label = { Text(Weekdays[day].take(3), fontSize = 11.sp) })
                        }
                        repeat(4 - rowDays.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
                Button(onClick = onSaveSchedule, enabled = !preview && !busy, modifier = Modifier.fillMaxWidth()) {
                    Text(if (preview) "المعاينة لا تحفظ" else if (busy) "جارٍ الحفظ…" else "حفظ الدوام الأسبوعي")
                }
            }
        }
        Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Text("إغلاق يوم أو فترة", fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                Text(if (selectedStart == null) "اضغط يومًا متاحًا لاختيار البداية، ثم اضغط يوم النهاية." else if (selectedEnd == null) "البداية: ${prettyDate(selectedStart)} — اختر يوم النهاية أو اضغط اليوم نفسه لإغلاق يوم واحد." else "الفترة المحددة: ${prettyDate(selectedStart)} — ${prettyDate(selectedEnd)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                if (selectedStart != null) OutlinedButton(onClick = onClearSelection, modifier = Modifier.fillMaxWidth()) { Text("مسح التحديد · ${prettyDate(selectedStart)}${selectedEnd?.let { " — ${prettyDate(it)}" }.orEmpty()}") }
                Button(onClick = onCloseRequest, enabled = selectedStart != null && selectedEnd != null && !busy, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = Fuchsia)) {
                    Text(if (preview) "معاينة إغلاق الفترة" else "إغلاق الفترة المحددة")
                }
                if (blackouts.isNotEmpty()) Text("لإعادة فتح يوم مغلق، اضغط عليه في التقويم.", color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
            }
        }
    }
}

@Composable
private fun DayCell(day: Int, status: String, selected: Boolean, today: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val background = when {
        selected -> Fuchsia
        status == "طلب" -> Color(0xFFFFE7B5)
        status == "مؤكد" || status == "مشغول" -> Color(0xFFDDE9FF)
        status == "مغلق" || status == "دوام" -> MaterialTheme.colorScheme.surfaceVariant
        else -> Color(0xFFE3F3E9)
    }
    val foreground = if (selected) Color.White else MaterialTheme.colorScheme.onSurface
    Column(
        modifier.padding(2.dp).aspectRatio(0.92f).clip(RoundedCornerShape(10.dp)).background(background).clickable(onClick = onClick).padding(vertical = 4.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(day.toString(), color = foreground, fontWeight = if (today) FontWeight.ExtraBold else FontWeight.SemiBold, fontSize = 13.sp)
        Text(if (today) "اليوم" else status.take(4), color = if (selected) Color.White else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 8.sp, maxLines = 1)
    }
}

@Composable
private fun CalendarLegend() {
    Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            LegendDot(Color(0xFFE3F3E9), "متاح")
            LegendDot(Color(0xFFFFE7B5), "طلب جديد")
            LegendDot(Color(0xFFDDE9FF), "مؤكد")
            LegendDot(MaterialTheme.colorScheme.surfaceVariant, "مغلق")
        }
        Text("اضغط على يوم متاح لاختيار بداية الإغلاق. الأيام ذات الحجز لا يمكن إغلاقها.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
    }
}

@Composable
private fun LegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        Box(Modifier.size(10.dp).clip(CircleShape).background(color))
        Text(label, fontSize = 9.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun BookingsContent(bookings: List<PartnerBooking>, loading: Boolean, error: String, onRefresh: () -> Unit, onOpen: (PartnerBooking) -> Unit) {
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Text("طلبات هذه القاعة", Modifier.weight(1f), fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            TextButton(onClick = onRefresh) { Icon(Icons.Rounded.Refresh, null); Text("تحديث") }
        }
        if (loading) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp); Text("جارٍ تحميل الطلبات…") }
        if (error.isNotBlank()) Notice(error, error = true)
        if (bookings.isEmpty() && !loading) EmptyBookings()
        bookings.sortedByDescending { it.reservationAt }.forEach { booking -> BookingCard(booking, onOpen) }
    }
}

@Composable
private fun BookingCard(booking: PartnerBooking, onOpen: (PartnerBooking) -> Unit) {
    Card(Modifier.fillMaxWidth().clickable { onOpen(booking) }, shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(booking.customerName.ifBlank { "عميل" }, Modifier.weight(1f), fontWeight = FontWeight.Bold)
                StatusPill(if (isBookingExpired(booking)) "expired" else booking.status)
            }
            Text("${prettyDate(booking.dateOnly)} · ${booking.bookingDays} ${if (booking.bookingDays == 1) "يوم" else "أيام"} · ${audienceLabel(booking.audience)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            Text("${booking.partySize} ضيف · المبلغ ${formatMoney(booking.totalAmount)} ر.ي", fontSize = 12.sp)
            if (isBookingExpired(booking)) Text("انتهت مهلة الحجز المؤقت؛ لا يمكن تأكيده الآن.", color = Red, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
            else if (booking.status == "pending") Text("بانتظار مراجعة الطلب والإيصال", color = Amber, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
        }
    }
}

@Composable
private fun BookingDetailsDialog(booking: PartnerBooking, venueName: String, preview: Boolean, busy: Boolean, onDismiss: () -> Unit, onUpdate: (String) -> Unit) {
    val uriHandler = LocalUriHandler.current
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("تفاصيل طلب الحجز") },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                DetailLine("القاعة", venueName)
                DetailLine("العميل", booking.customerName)
                DetailLine("الهاتف", booking.customerPhone)
                DetailLine("القسم", audienceLabel(booking.audience))
                DetailLine("التاريخ", prettyDate(booking.dateOnly))
                DetailLine("المدة", "${booking.bookingDays} ${if (booking.bookingDays == 1) "يوم" else "أيام"}")
                DetailLine("عدد الضيوف", booking.partySize.toString())
                DetailLine("الإجمالي", "${formatMoney(booking.totalAmount)} ر.ي")
                DetailLine("المبلغ المرفق", "${formatMoney(booking.paymentAmount)} ر.ي")
                DetailLine("حالة الإيصال", paymentLabel(booking.paymentStatus))
                DetailLine("حالة الحجز", if (isBookingExpired(booking)) "انتهت المهلة" else statusLabel(booking.status))
                booking.notes?.let { DetailLine("ملاحظات العميل", it) }
                booking.paymentReceiptUrl?.let { url ->
                    TextButton(onClick = { runCatching { uriHandler.openUri(url) } }) { Text("فتح صورة إيصال التحويل") }
                } ?: Text("لم يُرفق رابط إيصال في بيانات هذا الطلب.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                if (isBookingExpired(booking)) Text("انتهت مهلة الحجز المؤقت؛ أعد التواصل مع العميل ليُرسل طلبًا جديدًا.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                else if (booking.status == "pending") Text("تأكد من مراجعة الإيصال والتوفر قبل تأكيد الحجز.", color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
                if (preview) Notice("بيانات تجريبية للعرض فقط.")
            }
        },
        confirmButton = {
            if (booking.status == "pending" && !isBookingExpired(booking)) TextButton(enabled = !preview && !busy, onClick = { onUpdate("confirmed") }) {
                Icon(Icons.Rounded.Check, null, tint = Green); Text("تأكيد بعد المراجعة", color = Green)
            }
        },
        dismissButton = {
            Row {
                if (booking.status == "pending") TextButton(enabled = !preview && !busy, onClick = { onUpdate("rejected") }) {
                    Icon(Icons.Rounded.Close, null, tint = Red); Text("رفض", color = Red)
                }
                TextButton(onClick = onDismiss) { Text("إغلاق") }
            }
        },
    )
}

@Composable
private fun DetailLine(label: String, value: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Top) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        Spacer(Modifier.width(10.dp))
        Text(value, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, textAlign = TextAlign.End)
    }
}

@Composable
private fun StatusPill(status: String) {
    val tone = when (status) {
        "pending", "rental_pending_confirmation" -> FuchsiaStatusTone.Warning
        "confirmed", "rental_confirmed", "rental_preparing", "rental_out", "rental_returned" -> FuchsiaStatusTone.Success
        "rejected", "cancelled", "expired", "rental_rejected", "rental_cancelled" -> FuchsiaStatusTone.Error
        else -> FuchsiaStatusTone.Neutral
    }
    FuchsiaStatusChip(label = statusLabel(status), tone = tone)
}

@Composable
private fun VenuePicker(venues: List<PartnerVenue>, selectedId: Int, onSelect: (PartnerVenue) -> Unit) {
    var expanded by remember { mutableStateOf(false) }
    val selected = venues.firstOrNull { it.id == selectedId } ?: venues.first()
    Box {
        OutlinedButton(onClick = { expanded = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
            Icon(Icons.Rounded.Business, null)
            Text(selected.name, Modifier.weight(1f).padding(horizontal = 8.dp), textAlign = TextAlign.Start, maxLines = 1)
            Text("⌄")
        }
        androidx.compose.material3.DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
            venues.forEach { venue ->
                androidx.compose.material3.DropdownMenuItem(text = { Text(venue.name) }, onClick = { expanded = false; onSelect(venue) })
            }
        }
    }
}

@Composable
private fun StatCard(title: String, value: String, modifier: Modifier, accent: Color) {
    Card(modifier, colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface), shape = RoundedCornerShape(16.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { Text(title, fontSize = 10.sp, color = MaterialTheme.colorScheme.onSurfaceVariant); Text(value, fontWeight = FontWeight.ExtraBold, fontSize = 19.sp, color = accent) }
            Box(Modifier.size(30.dp).clip(CircleShape).background(accent.copy(alpha = 0.12f)), contentAlignment = Alignment.Center) { Text(value, color = accent, fontWeight = FontWeight.Bold, fontSize = 11.sp) }
        }
    }
}

@Composable
private fun BrandMark(compact: Boolean = false) {
    Box(Modifier.size(if (compact) 42.dp else 68.dp).clip(RoundedCornerShape(if (compact) 14.dp else 22.dp)).background(Fuchsia), contentAlignment = Alignment.Center) {
        Text("F", color = Color.White, fontWeight = FontWeight.Black, fontSize = if (compact) 25.sp else 38.sp)
    }
}

@Composable
private fun Notice(text: String, error: Boolean = false) {
    val tint = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.primary
    Surface(color = tint.copy(alpha = 0.09f), shape = RoundedCornerShape(13.dp), border = BorderStroke(1.dp, tint.copy(alpha = 0.26f))) {
        Text(text, Modifier.fillMaxWidth().padding(11.dp), color = if (error) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface, fontSize = 12.sp)
    }
}

@Composable
private fun CenterMessage(text: String, busy: Boolean = false) {
    Column(Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        if (busy) CircularProgressIndicator()
        Text(text, modifier = Modifier.padding(18.dp), color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}

@Composable
private fun EmptyVenues() {
    Column(Modifier.fillMaxSize().padding(24.dp), verticalArrangement = Arrangement.Center, horizontalAlignment = Alignment.CenterHorizontally) {
        Text("لا توجد قاعات مرتبطة بالحساب", fontWeight = FontWeight.Bold, fontSize = 18.sp)
        Text("بعد اعتماد الشراكة، اطلب من الإدارة ربط القاعة بحسابك لتظهر هنا.", textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.padding(top = 8.dp))
    }
}

@Composable
private fun EmptyBookings() {
    Card(Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
        Column(Modifier.fillMaxWidth().padding(22.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Rounded.Event, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp))
            Text("لا توجد طلبات لهذه القاعة", modifier = Modifier.padding(top = 8.dp), fontWeight = FontWeight.Bold)
            Text("ستظهر الطلبات الجديدة هنا فور وصولها.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
        }
    }
}

private fun parseVenues(rows: org.json.JSONArray?): List<PartnerVenue> {
    if (rows == null) return emptyList()
    return buildList {
        for (index in 0 until rows.length()) {
            val row = rows.optJSONObject(index) ?: continue
            add(PartnerVenue(
                id = row.optInt("id"),
                name = row.optString("nameAr", "قاعة"),
                audienceScope = row.optString("audienceScope", "both"),
                city = row.optString("city"),
                capacity = row.optInt("capacity"),
                dailyPrice = row.optDouble("dailyPrice"),
            ))
        }
    }
}

private fun parseRentalStores(rows: org.json.JSONArray?): List<PartnerStore> {
    if (rows == null) return emptyList()
    return buildList {
        for (index in 0 until rows.length()) {
            val row = rows.optJSONObject(index) ?: continue
            val id = row.optInt("id")
            if (id > 0) add(PartnerStore(id, row.optString("nameAr", "متجر تأجير"), row.optString("logoUrl"), row.optBoolean("isOpen", true)))
        }
    }
}

private fun demoRentalStores() = listOf(PartnerStore(-901, "[معاينة] كوش وطاولات فوشيا", "", true))

private fun demoVenues() = listOf(
    PartnerVenue(-501, "[معاينة] قاعة ليالي صنعاء", "both", "صنعاء", 320, 350000.0),
    PartnerVenue(-502, "[معاينة] قصر الورد — نسائي", "women", "صنعاء", 220, 240000.0),
)

private fun demoBookings(): List<PartnerBooking> = listOf(
    PartnerBooking(-701, -501, "women", daysFromToday(8), 1, 220, "سارة محمد", "77XXXXXXX", 350000.0, 105000.0, "pending_review", "pending", null, "حفل زفاف"),
    PartnerBooking(-702, -501, "men", daysFromToday(16), 2, 180, "عبدالله علي", "73XXXXXXX", 700000.0, 700000.0, "approved", "confirmed", null, null),
    PartnerBooking(-703, -502, "women", daysFromToday(24), 1, 140, "أمل صالح", "71XXXXXXX", 240000.0, 72000.0, "pending_review", "pending", null, "يرجى التواصل مساءً"),
)

private fun demoBlackouts() = listOf(
    PartnerBlackout(-801, daysFromToday(4), daysFromToday(5), "both", "صيانة — معاينة"),
)

private fun buildMonthCells(anchor: Calendar): List<Int?> {
    val first = (anchor.clone() as Calendar).apply { set(Calendar.DAY_OF_MONTH, 1) }
    val offset = first.get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY
    val count = first.getActualMaximum(Calendar.DAY_OF_MONTH)
    return List(offset) { null } + (1..count).map { it }
}

private fun dateKey(year: Int, zeroBasedMonth: Int, day: Int): String = String.format(Locale.US, "%04d-%02d-%02d", year, zeroBasedMonth + 1, day)
private fun todayKey(): String = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
private fun daysFromToday(days: Int): String = SimpleDateFormat("yyyy-MM-dd'T'12:00:00.000'Z'", Locale.US).format(Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, days) }.time)
private fun prettyDate(value: String): String = runCatching {
    val key = value.substringBefore('T')
    SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(key)?.let { SimpleDateFormat("d MMMM yyyy", Locale("ar", "YE")).format(it) } ?: key
}.getOrDefault(value)
private fun formatMoney(value: Double): String = String.format(Locale("ar", "YE"), "%,.0f", value)
private fun audienceLabel(value: String): String = when (value) { "women" -> "النساء"; "men" -> "الرجال"; else -> "النساء والرجال" }
private fun statusLabel(value: String): String = when (value) { "pending" -> "طلب جديد"; "confirmed" -> "مؤكد"; "rejected" -> "مرفوض"; "cancelled" -> "ملغى"; "expired" -> "انتهت المهلة"; else -> value }
private fun paymentLabel(value: String): String = when (value) { "approved" -> "تمت المراجعة"; "pending_review" -> "بانتظار المراجعة"; "rejected" -> "مرفوض"; else -> value }

private fun isWithinBooking(date: String, booking: PartnerBooking): Boolean {
    val start = booking.dateOnly
    val startCalendar = Calendar.getInstance().apply { time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(start) ?: return false }
    val dayCalendar = Calendar.getInstance().apply { time = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(date) ?: return false }
    val endCalendar = (startCalendar.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, booking.bookingDays.coerceAtLeast(1) - 1) }
    val target = dayCalendar.timeInMillis
    return target >= startCalendar.timeInMillis && target <= endCalendar.timeInMillis
}

private fun isBookingExpired(booking: PartnerBooking): Boolean {
    if (booking.status != "pending") return false
    val expiresAt = booking.expiresAt ?: return false
    val parsed = runCatching { SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSX", Locale.US).parse(expiresAt) }
        .recoverCatching { SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssX", Locale.US).parse(expiresAt) }
        .getOrNull() ?: return false
    return parsed.time <= System.currentTimeMillis()
}

@Composable
private fun UnifiedPartnerCalendar(
    modifier: Modifier = Modifier,
    events: List<UnifiedCalendarEvent>,
    monthAnchor: Calendar,
    onMonth: (Int) -> Unit,
    loading: Boolean,
    error: String,
    onRefresh: () -> Unit,
) {
    val year = monthAnchor.get(Calendar.YEAR)
    val month = monthAnchor.get(Calendar.MONTH)
    var selectedDate by remember(year, month) { mutableStateOf(todayKey().takeIf { it.substring(0, 7) == String.format(Locale.US, "%04d-%02d", year, month + 1) } ?: dateKey(year, month, 1)) }
    val cells = buildMonthCells(monthAnchor)
    val monthEvents = events.filter { it.startDate.take(7) <= String.format(Locale.US, "%04d-%02d", year, month + 1) && it.endDate.take(7) >= String.format(Locale.US, "%04d-%02d", year, month + 1) }
    val selectedEvents = monthEvents.filter { selectedDate >= it.startDate && selectedDate <= it.endDate }
    Column(modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Card(shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
            Row(Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { onMonth(-1) }) { Text("‹", fontSize = 22.sp) }
                Text(SimpleDateFormat("MMMM yyyy", Locale("ar", "YE")).format(monthAnchor.time), modifier = Modifier.weight(1f), textAlign = TextAlign.Center, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
                TextButton(onClick = { onMonth(1) }) { Text("›", fontSize = 22.sp) }
                TextButton(onClick = onRefresh, enabled = !loading) { if (loading) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Icon(Icons.Rounded.Refresh, "تحديث") }
            }
        }
        Text("اليوم: ${prettyDate(todayKey())} · ${Weekdays[Calendar.getInstance().get(Calendar.DAY_OF_WEEK) - 1]}", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 12.sp)
        Card(shape = RoundedCornerShape(18.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
            Column(Modifier.fillMaxWidth().padding(10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(Modifier.fillMaxWidth()) {
                    Weekdays.forEach { day -> Text(day.take(2), modifier = Modifier.weight(1f), textAlign = TextAlign.Center, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
                }
                cells.chunked(7).forEach { week ->
                    Row(Modifier.fillMaxWidth()) {
                        week.forEach { day ->
                            if (day == null) Spacer(Modifier.weight(1f).aspectRatio(0.95f))
                            else {
                                val key = dateKey(year, month, day)
                                val dayEvents = monthEvents.filter { key >= it.startDate && key <= it.endDate }
                                val isToday = key == todayKey()
                                val isSelected = key == selectedDate
                                Box(Modifier.weight(1f).aspectRatio(0.95f).padding(2.dp).clip(RoundedCornerShape(10.dp))
                                    .background(when { isSelected -> MaterialTheme.colorScheme.primary; isToday -> MaterialTheme.colorScheme.primaryContainer; else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = .45f) })
                                    .clickable { selectedDate = key }, contentAlignment = Alignment.Center) {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                        Text(day.toString(), color = if (isSelected) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurface, fontWeight = if (isToday || isSelected) FontWeight.ExtraBold else FontWeight.Medium, fontSize = 12.sp)
                                        if (dayEvents.isNotEmpty()) Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                                            dayEvents.take(3).forEach { event -> Box(Modifier.size(4.dp).clip(CircleShape).background(if (isSelected) MaterialTheme.colorScheme.onPrimary else if (event.kind == "venue") Fuchsia else Green)) }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Text("● القاعات", color = Fuchsia, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text("● الإيجارات", color = Green, fontSize = 11.sp, fontWeight = FontWeight.Bold)
            Text("${monthEvents.size} حجز هذا الشهر", modifier = Modifier.weight(1f), textAlign = TextAlign.End, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
        }
        if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
        Text("${prettyDate(selectedDate)} · ${Weekdays[(SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(selectedDate)?.let { Calendar.getInstance().apply { time = it }.get(Calendar.DAY_OF_WEEK) } ?: Calendar.SUNDAY) - 1]}", fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
        if (selectedEvents.isEmpty()) {
            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)) {
                Text("لا توجد حجوزات في هذا اليوم", Modifier.fillMaxWidth().padding(16.dp), color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
            }
        } else selectedEvents.forEach { event ->
            Card(shape = RoundedCornerShape(15.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Row(Modifier.fillMaxWidth().padding(13.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(9.dp).clip(CircleShape).background(if (event.kind == "venue") Fuchsia else Green))
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text(event.title, fontWeight = FontWeight.Bold)
                        Text(event.details, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        if (event.endDate > event.startDate) Text("${prettyDate(event.startDate)} – ${prettyDate(event.endDate)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp)
                    }
                    Text(if (event.status == "pending" || event.status == "rental_pending_confirmation") "بانتظار الرد" else "مؤكد", color = if (event.status == "pending" || event.status == "rental_pending_confirmation") Amber else Green, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                }
            }
        }
    }
}
