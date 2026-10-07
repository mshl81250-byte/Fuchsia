package com.fuchsia.platform.compose.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.ChevronLeft
import androidx.compose.material.icons.rounded.ChevronRight
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.PeopleAlt
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.Rule
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.PaymentWallet
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.TableReservation
import com.fuchsia.platform.compose.data.VenueAvailability
import com.fuchsia.platform.compose.data.VenueSummary
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale

@Composable
fun VenueBookingScreen(onBack: () -> Unit) {
    var selectedVenue by remember { mutableStateOf<VenueSummary?>(null) }
    if (selectedVenue == null) VenueListScreen(onBack = onBack, onVenue = { selectedVenue = it })
    else VenueDetailScreen(venue = selectedVenue!!, onBack = { selectedVenue = null })
}

@Composable
private fun VenueListScreen(onBack: () -> Unit, onVenue: (VenueSummary) -> Unit) {
    var query by remember { mutableStateOf("") }
    var venues by remember { mutableStateOf<List<VenueSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    LaunchedEffect(query) {
        delay(250)
        loading = true
        runCatching { FuchsiaApi.venues(query) }
            .onSuccess { venues = it; error = "" }
            .onFailure { error = it.message ?: "تعذر تحميل القاعات." }
        loading = false
    }
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item { CommerceHeader("حجز قاعة أعراس", "ابحث عن القاعة المناسبة لمناسبتك", onBack) }
            item {
                OutlinedTextField(
                    value = query,
                    onValueChange = { query = it },
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    singleLine = true,
                    placeholder = { Text("ابحث عن قاعة أو صالة أعراس", color = FuchsiaColors.Muted, fontSize = 13.sp) },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = "بحث", tint = FuchsiaColors.Primary) },
                    shape = RoundedCornerShape(17.dp),
                    colors = OutlinedTextFieldDefaults.colors(unfocusedContainerColor = FuchsiaColors.White, focusedContainerColor = FuchsiaColors.White, unfocusedBorderColor = FuchsiaColors.Line, focusedBorderColor = FuchsiaColors.Primary),
                )
            }
            item {
                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary)) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Rounded.CalendarMonth, contentDescription = null, tint = FuchsiaColors.White, modifier = Modifier.size(32.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text("احجز يوم مناسبتك بثقة", color = FuchsiaColors.White, fontWeight = FontWeight.ExtraBold)
                            Text("شاهد التوفر والشروط قبل إرسال طلب الحجز.", color = FuchsiaColors.White.copy(alpha = .9f), fontSize = 12.sp)
                        }
                    }
                }
            }
            item { CommerceSectionTitle("القاعات المتاحة", if (loading) "جارٍ البحث..." else "${venues.size} قاعة") }
            if (loading && venues.isEmpty()) item { Box(Modifier.fillMaxWidth().padding(38.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            else if (error.isNotBlank() && venues.isEmpty()) item { CommerceNotice(error, isError = true) }
            else if (venues.isEmpty()) item { CommerceEmptyState("لا توجد نتائج", "جرّب اسمًا أو منطقة أخرى.", "مسح البحث", { query = "" }) }
            else items(venues, key = { it.id }) { venue -> VenueCard(venue, onClick = { onVenue(venue) }) }
        }
    }
}

@Composable
private fun VenueCard(venue: VenueSummary, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(21.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column {
            Box(Modifier.fillMaxWidth().height(170.dp).background(FuchsiaColors.RoseLight)) {
                if (!venue.imageUrl.isNullOrBlank()) AsyncImage(venue.imageUrl, contentDescription = venue.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Rounded.EventAvailable, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(52.dp))
                Surface(Modifier.align(Alignment.TopEnd).padding(12.dp), shape = RoundedCornerShape(10.dp), color = FuchsiaColors.White.copy(alpha = .94f)) { Text("متاحة للحجز", Modifier.padding(horizontal = 9.dp, vertical = 5.dp), color = FuchsiaColors.TextAccent, fontSize = 11.sp, fontWeight = FontWeight.Bold) }
            }
            Column(Modifier.fillMaxWidth().padding(14.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                Text(venue.name, color = FuchsiaColors.Ink, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp))
                    Text(venue.address, color = FuchsiaColors.Muted, fontSize = 12.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Row(horizontalArrangement = Arrangement.spacedBy(5.dp), verticalAlignment = Alignment.CenterVertically) { Text("★ ${venue.rating}", color = FuchsiaColors.Gold, fontWeight = FontWeight.Bold, fontSize = 12.sp); Text("· ${venue.capacity} شخص", color = FuchsiaColors.Muted, fontSize = 12.sp) }
                    Text("من ${formatYemeniRiyal(venue.priceFrom)}", color = FuchsiaColors.TextAccent, fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
    }
}

@Composable
private fun VenueDetailScreen(venue: VenueSummary, onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val bearerToken = remember(context) { SessionVault.token(context) }
    val user = remember(context) { SessionVault.read(context)?.optJSONObject("user") }
    val month = remember { mutableStateOf(Calendar.getInstance().apply { set(Calendar.DAY_OF_MONTH, 1) }) }
    var availability by remember { mutableStateOf<VenueAvailability?>(null) }
    var loading by remember { mutableStateOf(true) }
    var selectedDate by remember { mutableStateOf<String?>(null) }
    var showRules by remember { mutableStateOf(false) }
    var customerName by remember { mutableStateOf(user?.optString("fullName").orEmpty()) }
    var customerPhone by remember { mutableStateOf(user?.optString("phone").orEmpty()) }
    var partySize by remember { mutableStateOf("100") }
    var submitting by remember { mutableStateOf(false) }
    var submitted by remember { mutableStateOf<TableReservation?>(null) }
    var submitError by remember { mutableStateOf("") }
    var wallets by remember { mutableStateOf<List<PaymentWallet>>(emptyList()) }
    var paymentType by remember { mutableStateOf("deposit") }
    var selectedWalletId by remember { mutableStateOf<Int?>(null) }
    var transactionReference by remember { mutableStateOf("") }
    var receiptUrl by remember { mutableStateOf("") }
    var uploading by remember { mutableStateOf(false) }
    val receiptPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        if (uri != null) scope.launch {
            uploading = true
            runCatching { FuchsiaApi.uploadReceipt(context, uri).optString("url") }
                .onSuccess { receiptUrl = it }
                .onFailure { submitError = it.message ?: "تعذر رفع الإيصال." }
            uploading = false
        }
    }
    val monthKey = SimpleDateFormat("yyyy-MM", Locale.US).format(month.value.time)
    LaunchedEffect(venue.id, monthKey) {
        loading = true
        availability = runCatching { FuchsiaApi.venueAvailability(venue.id, monthKey) }.getOrNull()
        loading = false
    }
    LaunchedEffect(Unit) { wallets = runCatching { FuchsiaApi.paymentWallets() }.getOrDefault(emptyList()) }
    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 8.dp, bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink) }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) { Text("تفاصيل القاعة", color = FuchsiaColors.Ink, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold); Text("اختر اليوم المناسب لمناسبتك", color = FuchsiaColors.Muted, fontSize = 12.sp) }
                }
            }
            item {
                Card(shape = RoundedCornerShape(22.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                    Column {
                        Box(Modifier.fillMaxWidth().height(205.dp).background(FuchsiaColors.RoseLight)) { if (!venue.imageUrl.isNullOrBlank()) AsyncImage(venue.imageUrl, contentDescription = venue.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop) else Icon(Icons.Rounded.EventAvailable, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(60.dp)) }
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                            Text(venue.name, color = FuchsiaColors.Ink, fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
                            Text(venue.description, color = FuchsiaColors.Muted, fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(17.dp)); Text(venue.address, color = FuchsiaColors.Ink, fontSize = 12.sp) }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { InfoPill("${venue.capacity} شخص", Icons.Rounded.PeopleAlt); InfoPill("★ ${venue.rating}", Icons.Rounded.EventAvailable) }
                        }
                    }
                }
            }
            item {
                Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            IconButton(onClick = { month.value = (month.value.clone() as Calendar).apply { add(Calendar.MONTH, -1) } }) { Icon(Icons.Rounded.ChevronRight, contentDescription = "الشهر السابق", tint = FuchsiaColors.Primary) }
                            Text(SimpleDateFormat("MMMM yyyy", Locale.forLanguageTag("ar-YE")).format(month.value.time), color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
                            IconButton(onClick = { month.value = (month.value.clone() as Calendar).apply { add(Calendar.MONTH, 1) } }) { Icon(Icons.Rounded.ChevronLeft, contentDescription = "الشهر التالي", tint = FuchsiaColors.Primary) }
                        }
                        if (loading) Box(Modifier.fillMaxWidth().height(190.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) }
                        else AvailabilityCalendar(month.value, availability?.booked.orEmpty(), selectedDate, onDate = { selectedDate = it })
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) { LegendDot(FuchsiaColors.Primary, "متاح"); LegendDot(FuchsiaColors.Muted.copy(alpha = .35f), "محجوز") }
                    }
                }
            }
            item {
                Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.RoseLight), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                    Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) { Text("بعد اختيار اليوم", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold); Text(if (selectedDate == null) "حدد يومًا متاحًا من التقويم لقراءة الخطوة التالية." else "التاريخ المختار: $selectedDate\nسيتم لاحقًا إضافة بيانات العميل والدفع وتأكيد الحجز.", color = FuchsiaColors.Muted, fontSize = 13.sp) }
                }
            }
            if (selectedDate != null) {
                item {
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Column(Modifier.padding(15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Text("إرسال طلب حجز القاعة", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
                            Text("سيبقى الطلب بانتظار مراجعة القاعة، وستظهر النتيجة في سجل الحجوزات.", color = FuchsiaColors.Muted, fontSize = 12.sp)
                            OutlinedTextField(value = customerName, onValueChange = { customerName = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("اسم العميل") }, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FuchsiaColors.Primary, focusedLabelColor = FuchsiaColors.Primary))
                            OutlinedTextField(value = customerPhone, onValueChange = { customerPhone = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("رقم الهاتف") }, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FuchsiaColors.Primary, focusedLabelColor = FuchsiaColors.Primary))
                            OutlinedTextField(value = partySize, onValueChange = { partySize = it.filter(Char::isDigit).take(4) }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("عدد الضيوف المتوقع") }, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FuchsiaColors.Primary, focusedLabelColor = FuchsiaColors.Primary))
                            Text("طريقة الدفع", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Button(onClick = { paymentType = "deposit" }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (paymentType == "deposit") FuchsiaColors.Primary else FuchsiaColors.RoseLight)) { Text("عربون 30%", color = if (paymentType == "deposit") Color.White else FuchsiaColors.Ink, fontSize = 12.sp) }
                                Button(onClick = { paymentType = "full" }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (paymentType == "full") FuchsiaColors.Primary else FuchsiaColors.RoseLight)) { Text("دفع كامل", color = if (paymentType == "full") Color.White else FuchsiaColors.Ink, fontSize = 12.sp) }
                            }
                            val venueAmount = if (paymentType == "full") venue.priceFrom else venue.priceFrom * 0.30
                            Text("المطلوب: ${formatYemeniRiyal(venueAmount + 1000)} شامل عمولة التطبيق 1,000 ريال", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                            Text("اختر المحفظة للتحويل", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                            wallets.forEach { wallet ->
                                Card(Modifier.fillMaxWidth().clickable { selectedWalletId = wallet.id }, shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = if (selectedWalletId == wallet.id) FuchsiaColors.Rose else FuchsiaColors.White), border = BorderStroke(1.dp, if (selectedWalletId == wallet.id) FuchsiaColors.Primary else FuchsiaColors.Line)) {
                                    Column(Modifier.padding(11.dp)) { Text(wallet.name, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold); Text("رقم الحساب: ${wallet.accountNumber}", color = FuchsiaColors.TextAccent, fontSize = 12.sp); Text(wallet.instructions, color = FuchsiaColors.Muted, fontSize = 11.sp) }
                                }
                            }
                            OutlinedTextField(value = transactionReference, onValueChange = { transactionReference = it }, modifier = Modifier.fillMaxWidth(), singleLine = true, label = { Text("رقم عملية التحويل") }, colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = FuchsiaColors.Primary, focusedLabelColor = FuchsiaColors.Primary))
                            Button(onClick = { receiptPicker.launch("image/*") }, modifier = Modifier.fillMaxWidth(), enabled = !uploading, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.RoseLight)) { if (uploading) CircularProgressIndicator(color = FuchsiaColors.Primary, modifier = Modifier.size(18.dp)) else Text(if (receiptUrl.isBlank()) "رفع صورة إيصال التحويل" else "تم رفع الإيصال · تغيير الصورة", color = FuchsiaColors.Ink, fontSize = 12.sp) }
                            if (submitError.isNotBlank()) Text(submitError, color = FuchsiaColors.Error, fontSize = 12.sp)
                            submitted?.let { reservation ->
                                Text("تم إرسال طلب حجز ${venue.name} رقم #${reservation.id}", color = FuchsiaColors.Success, fontWeight = FontWeight.Bold)
                                Text("الحالة: بانتظار مراجعة القاعة والتأكد من التوفر", color = FuchsiaColors.Muted, fontSize = 12.sp)
                            } ?: Button(onClick = {
                                val token = bearerToken
                                val guests = partySize.toIntOrNull() ?: 0
                                if (token.isNullOrBlank()) submitError = "يرجى تسجيل الدخول لإرسال طلب الحجز."
                                else if (customerName.isBlank() || customerPhone.isBlank()) submitError = "أدخل الاسم ورقم الهاتف."
                                else if (guests < 1) submitError = "أدخل عدد الضيوف."
                                else if (selectedWalletId == null || transactionReference.isBlank() || receiptUrl.isBlank()) submitError = "اختر المحفظة وأدخل رقم العملية وارفع الإيصال."
                                else scope.launch {
                                    submitting = true; submitError = ""
                                    runCatching {
                                        val venueAmount = if (paymentType == "full") venue.priceFrom else venue.priceFrom * 0.30
                                        FuchsiaApi.createReservation(JSONObject().put("storeId", venue.id).put("reservationAt", "${selectedDate}T18:00:00+03:00").put("partySize", guests).put("customerName", customerName.trim()).put("customerPhone", customerPhone.trim()).put("occasion", "حجز قاعة أعراس").put("paymentType", paymentType).put("paymentAmount", venueAmount + 1000).put("paymentWalletId", selectedWalletId).put("transactionReference", transactionReference.trim()).put("paymentReceiptUrl", receiptUrl), token)
                                    }.onSuccess { submitted = it }.onFailure { submitError = it.message ?: "تعذر إرسال طلب الحجز." }
                                    submitting = false
                                }
                            }, modifier = Modifier.fillMaxWidth().height(52.dp), enabled = !submitting, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                                if (submitting) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp)) else Text("إرسال طلب الحجز", fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
            item { Button(onClick = { showRules = true }, modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Primary)) { Icon(Icons.Rounded.Rule, contentDescription = null, tint = FuchsiaColors.Primary); Spacer(Modifier.width(7.dp)); Text("قراءة شروط الحجز", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold) } }
        }
    }
    if (showRules) AlertDialog(onDismissRequest = { showRules = false }, title = { Text("شروط حجز ${venue.name}", fontWeight = FontWeight.ExtraBold) }, text = { Text(venue.rules, color = FuchsiaColors.Muted) }, confirmButton = { Button(onClick = { showRules = false }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("فهمت") } })
}

@Composable
private fun AvailabilityCalendar(month: Calendar, booked: Set<String>, selected: String?, onDate: (String) -> Unit) {
    val first = (month.clone() as Calendar).apply { set(Calendar.DAY_OF_MONTH, 1) }
    val offset = (first.get(Calendar.DAY_OF_WEEK) + 5) % 7
    val days = month.getActualMaximum(Calendar.DAY_OF_MONTH)
    val keyFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US)
    val todayKey = keyFormat.format(Calendar.getInstance().time)
    val availableCount = (1..days).count { day ->
        val date = (month.clone() as Calendar).apply { set(Calendar.DAY_OF_MONTH, day) }
        val key = keyFormat.format(date.time)
        key !in booked && !date.before(Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) })
    }
    Column(verticalArrangement = Arrangement.spacedBy(11.dp)) {
        Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text("اختر يوم مناسبتك", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 15.sp)
                Text("الأيام المتاحة للحجز تظهر بإطار واضح", color = FuchsiaColors.Muted, fontSize = 11.sp)
            }
            Surface(shape = RoundedCornerShape(12.dp), color = FuchsiaColors.RoseLight) { Text("$availableCount يوم متاح", Modifier.padding(horizontal = 10.dp, vertical = 7.dp), color = FuchsiaColors.Primary, fontSize = 10.sp, fontWeight = FontWeight.Bold) }
        }
        Row(Modifier.fillMaxWidth().background(FuchsiaColors.Cream, RoundedCornerShape(12.dp)).padding(vertical = 8.dp), horizontalArrangement = Arrangement.SpaceEvenly) { listOf("السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة").forEach { Text(it.take(2), Modifier.weight(1f), textAlign = TextAlign.Center, color = FuchsiaColors.Muted, fontSize = 10.sp, fontWeight = FontWeight.Bold) } }
        val cells = List(offset) { null } + (1..days).map { it }
        cells.chunked(7).forEach { week ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                week.forEach { day ->
                    Box(Modifier.weight(1f).height(67.dp), contentAlignment = Alignment.Center) {
                        if (day != null) {
                            val date = (month.clone() as Calendar).apply { set(Calendar.DAY_OF_MONTH, day) }
                            val key = keyFormat.format(date.time)
                            val isBooked = key in booked
                            val isPast = date.before(Calendar.getInstance().apply { set(Calendar.HOUR_OF_DAY, 0); set(Calendar.MINUTE, 0); set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0) })
                            val isSelected = selected == key
                            val statusLabel = when { isSelected -> "محدد"; isBooked -> "محجوز"; isPast -> "مكتمل"; else -> "متاح" }
                            val statusColor = when { isSelected -> Color.White; isBooked -> FuchsiaColors.Error; isPast -> FuchsiaColors.Muted; else -> FuchsiaColors.Success }
                            Surface(onClick = { if (!isBooked && !isPast) onDate(key) }, modifier = Modifier.fillMaxWidth().height(61.dp), shape = RoundedCornerShape(12.dp), color = when { isSelected -> FuchsiaColors.Primary; isBooked -> Color(0xFFFFEBEE); isPast -> FuchsiaColors.Cream; else -> Color(0xFFEAF8F0) }, border = when { isSelected -> null; isBooked -> BorderStroke(1.dp, Color(0xFFE57373)); isPast -> BorderStroke(1.dp, FuchsiaColors.Line); key == todayKey -> BorderStroke(2.dp, FuchsiaColors.Gold); else -> BorderStroke(1.dp, Color(0xFF9AD8B2)) }, enabled = !isBooked && !isPast) {
                                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                                    Text(day.toString(), color = if (isSelected) Color.White else FuchsiaColors.Ink, fontSize = 14.sp, fontWeight = FontWeight.ExtraBold)
                                    if (isPast) Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = statusColor, modifier = Modifier.size(13.dp))
                                    Text(statusLabel, color = statusColor, fontSize = 8.sp, fontWeight = FontWeight.Bold, maxLines = 1)
                                }
                            }
                        }
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) { LegendDot(FuchsiaColors.Primary, "محدد"); LegendDot(FuchsiaColors.White, "متاح"); LegendDot(FuchsiaColors.Muted.copy(alpha = .25f), "محجوز") }
    }
}

@Composable
private fun InfoPill(text: String, icon: androidx.compose.ui.graphics.vector.ImageVector) { Surface(shape = RoundedCornerShape(10.dp), color = FuchsiaColors.RoseLight) { Row(Modifier.padding(horizontal = 9.dp, vertical = 6.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) { Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(15.dp)); Text(text, color = FuchsiaColors.Ink, fontSize = 11.sp, fontWeight = FontWeight.Bold) } } }

@Composable
private fun LegendDot(color: Color, label: String) { Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) { Box(Modifier.size(9.dp).clip(CircleShape).background(color)); Text(label, color = FuchsiaColors.Muted, fontSize = 11.sp) } }
