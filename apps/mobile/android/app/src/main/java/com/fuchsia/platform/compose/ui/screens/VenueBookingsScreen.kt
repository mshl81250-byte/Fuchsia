package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.PeopleAlt
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.VenueBooking
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun VenueBookingsScreen(onBack: () -> Unit, onSignIn: () -> Unit) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    var bookings by remember { mutableStateOf<List<VenueBooking>>(emptyList()) }
    var venueNames by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var refreshKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(token, refreshKey) {
        if (token.isNullOrBlank()) {
            loading = false
            return@LaunchedEffect
        }
        loading = true
        error = ""
        runCatching { FuchsiaApi.venueBookings(token) }
            .onSuccess { bookings = it }
            .onFailure { error = it.message ?: "تعذر تحميل سجل حجوزاتك." }
        venueNames = runCatching { FuchsiaApi.venues().associate { it.id to it.name } }.getOrDefault(emptyMap())
        loading = false
    }

    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 8.dp, bottom = 26.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                CommerceHeader(
                    "حجوزات القاعات",
                    "تابع حالة الموعد ومراجعة إيصال الدفع",
                    onBack,
                    trailing = {
                        IconButton(onClick = { refreshKey++ }, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Rounded.History, contentDescription = "تحديث السجل", tint = FuchsiaColors.Primary)
                        }
                    },
                )
            }
            if (token.isNullOrBlank()) {
                item {
                    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                            Icon(Icons.Rounded.History, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(36.dp))
                            Text("سجّل الدخول لمتابعة حجوزاتك", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
                            Text("حجوزات القاعات مرتبطة بحسابك حتى تظهر حالة مراجعة الإيصال وتأكيد الموعد.", color = FuchsiaColors.Muted, fontSize = 12.sp, textAlign = TextAlign.Center)
                            Button(onClick = onSignIn, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("تسجيل الدخول") }
                        }
                    }
                }
            } else if (loading && bookings.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(36.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (error.isNotBlank()) {
                item {
                    CommerceNotice(error, isError = true)
                    Button(onClick = { refreshKey++ }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("إعادة المحاولة") }
                }
            } else if (bookings.isEmpty()) {
                item { CommerceEmptyState("لا توجد حجوزات بعد", "ستظهر هنا طلبات القاعات التي أرسلتها وحالة مراجعتها.", "العودة للقاعات", onBack) }
            } else {
                item { CommerceNotice("الحجز المرسل لا يصبح مؤكدًا تلقائيًا؛ سيظهر التحديث بعد مراجعة القاعة وإيصال الدفع.") }
                items(bookings, key = { it.id }) { booking -> VenueBookingCard(booking, venueNames[booking.venueId]) }
            }
        }
    }
}

@Composable
private fun VenueBookingCard(booking: VenueBooking, venueName: String?) {
    val statusLabel = when (booking.status.lowercase()) {
        "confirmed" -> "مؤكد"
        "completed" -> "مكتمل"
        "cancelled" -> "ملغي"
        "expired" -> "انتهت المهلة"
        "pending" -> "بانتظار تأكيد القاعة"
        "rejected" -> "مرفوض"
        else -> booking.status.ifBlank { "قيد المتابعة" }
    }
    val paymentLabel = when (booking.paymentStatus.lowercase()) {
        "pending_review" -> "إيصال الدفع قيد المراجعة"
        "paid", "verified" -> "تم التحقق من الدفع"
        "failed", "rejected" -> "يحتاج الإيصال إلى مراجعة"
        else -> booking.paymentStatus.ifBlank { "غير معروف" }
    }
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(20.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text(venueName ?: "قاعة رقم ${booking.venueId}", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    Text("طلب رقم #${booking.id}", color = FuchsiaColors.Muted, fontSize = 11.sp)
                }
                Surface(shape = RoundedCornerShape(12.dp), color = if (booking.status == "confirmed" || booking.status == "completed") FuchsiaColors.Success.copy(alpha = .12f) else FuchsiaColors.RoseLight) {
                    Text(statusLabel, Modifier.padding(horizontal = 9.dp, vertical = 6.dp), color = FuchsiaColors.TextAccent, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.CalendarMonth, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(17.dp))
                Text("${booking.reservationAt.take(10)} · ${booking.bookingDays} ${if (booking.bookingDays == 1) "يوم" else "أيام"}", color = FuchsiaColors.Ink, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
            }
            Row(horizontalArrangement = Arrangement.spacedBy(7.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Rounded.PeopleAlt, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(17.dp))
                Text("${booking.partySize} ضيف · ${if (booking.audience == "men") "قسم الرجال" else "قسم النساء"}", color = FuchsiaColors.Muted, fontSize = 12.sp)
            }
            Surface(shape = RoundedCornerShape(14.dp), color = FuchsiaColors.RoseLight.copy(alpha = .65f)) {
                Column(Modifier.fillMaxWidth().padding(11.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(paymentLabel, color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("الإجمالي ${formatYemeniRiyal(booking.totalAmount)} · الدفعة المسجلة ${formatYemeniRiyal(booking.paymentAmount)}", color = FuchsiaColors.Ink, fontSize = 11.sp)
                    Text("طريقة الدفع: ${if (booking.paymentType == "full") "كامل المبلغ" else "عربون 30%"}", color = FuchsiaColors.Muted, fontSize = 11.sp)
                }
            }
            val rejection = booking.history.lastOrNull { it.toStatus == "rejected" && !it.notes.isNullOrBlank() }
            if (rejection != null) {
                Surface(shape = RoundedCornerShape(14.dp), color = FuchsiaColors.Error.copy(alpha = .10f)) {
                    Column(Modifier.fillMaxWidth().padding(11.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text("سبب رفض الحجز", color = FuchsiaColors.Error, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text(rejection.notes.orEmpty(), color = FuchsiaColors.Ink, fontSize = 12.sp)
                    }
                }
            }
            if (booking.history.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text("سجل الحجز", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    booking.history.takeLast(4).asReversed().forEach { event ->
                        val label = when (event.toStatus) {
                            "pending" -> "تم إرسال الطلب"
                            "confirmed" -> "تم تأكيد الحجز من القاعة"
                            "completed" -> "تم تسجيل اكتمال الحجز"
                            "rejected" -> "تم رفض الحجز"
                            else -> event.eventType.ifBlank { "تم تحديث الحجز" }
                        }
                        Text("• $label${event.notes?.takeIf { it.isNotBlank() }?.let { " — $it" }.orEmpty()}", color = FuchsiaColors.Muted, fontSize = 11.sp)
                    }
                }
            }
        }
    }
}
