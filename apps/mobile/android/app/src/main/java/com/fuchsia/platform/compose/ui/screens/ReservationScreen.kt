package com.fuchsia.platform.compose.ui.screens

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import androidx.compose.foundation.BorderStroke
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.PeopleAlt
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.ApiException
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreSummary
import com.fuchsia.platform.compose.data.TableReservation
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ReservationScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val bearerToken = remember(context) { SessionVault.token(context) }
    val user = remember(context) { SessionVault.read(context)?.optJSONObject("user") }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var stores by remember { mutableStateOf<List<StoreSummary>>(emptyList()) }
    var selectedStoreId by remember { mutableIntStateOf(0) }
    var selectedDateTime by remember {
        mutableStateOf(Calendar.getInstance().apply {
            add(Calendar.DAY_OF_MONTH, 1)
            set(Calendar.HOUR_OF_DAY, 19)
            set(Calendar.MINUTE, 0)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        })
    }
    var partySize by remember { mutableIntStateOf(2) }
    var customerName by remember { mutableStateOf(user?.optString("fullName").orEmpty()) }
    var customerPhone by remember { mutableStateOf(user?.optString("phone").orEmpty()) }
    var occasion by remember { mutableStateOf("") }
    var notes by remember { mutableStateOf("") }
    var previousReservations by remember { mutableStateOf<List<TableReservation>>(emptyList()) }
    var submitted by remember { mutableStateOf<TableReservation?>(null) }
    var loading by remember { mutableStateOf(true) }
    var submitting by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var expandedStores by remember { mutableStateOf(false) }

    LaunchedEffect(bearerToken) {
        if (bearerToken == null) {
            error = "يرجى تسجيل الدخول أو بدء التصفح دون حساب لتسجيل طلب الحجز."
            loading = false
            return@LaunchedEffect
        }
        loading = true
        try {
            stores = FuchsiaApi.stores()
            if (selectedStoreId == 0) selectedStoreId = stores.firstOrNull { it.isOpen }?.id ?: stores.firstOrNull()?.id ?: 0
            previousReservations = runCatching { FuchsiaApi.reservations(bearerToken) }.getOrDefault(emptyList())
        } catch (failure: Throwable) {
            error = failure.message ?: "تعذر تحميل الفروع."
        } finally {
            loading = false
        }
    }

    val selectedStore = stores.firstOrNull { it.id == selectedStoreId }

    fun chooseDate() {
        val current = selectedDateTime
        DatePickerDialog(
            context,
            { _, year, month, day ->
                selectedDateTime = (selectedDateTime.clone() as Calendar).apply {
                    set(Calendar.YEAR, year)
                    set(Calendar.MONTH, month)
                    set(Calendar.DAY_OF_MONTH, day)
                }
            },
            current.get(Calendar.YEAR),
            current.get(Calendar.MONTH),
            current.get(Calendar.DAY_OF_MONTH),
        ).apply {
            datePicker.minDate = System.currentTimeMillis() + 30 * 60 * 1000L
            show()
        }
    }

    fun chooseTime() {
        TimePickerDialog(
            context,
            { _, hour, minute ->
                selectedDateTime = (selectedDateTime.clone() as Calendar).apply {
                    set(Calendar.HOUR_OF_DAY, hour)
                    set(Calendar.MINUTE, minute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
            },
            selectedDateTime.get(Calendar.HOUR_OF_DAY),
            selectedDateTime.get(Calendar.MINUTE),
            true,
        ).show()
    }

    fun submitReservation() {
        val currentToken = bearerToken
        val store = selectedStore
        if (currentToken == null) {
            snackbarShow(scope, snackbar, "يرجى تسجيل الدخول أو بدء التصفح دون حساب لإرسال الحجز.")
            return
        }
        if (store == null) {
            snackbarShow(scope, snackbar, "لا يوجد فرع متاح للحجز حاليًا.")
            return
        }
        if (customerName.isBlank() || customerPhone.isBlank()) {
            snackbarShow(scope, snackbar, "يرجى إدخال الاسم ورقم الهاتف.")
            return
        }
        if (selectedDateTime.timeInMillis < System.currentTimeMillis() + 30 * 60 * 1000L) {
            snackbarShow(scope, snackbar, "يجب أن يكون الموعد بعد 30 دقيقة على الأقل.")
            return
        }
        val isoDate = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(selectedDateTime.time)
        val payload = JSONObject()
            .put("storeId", store.id)
            .put("reservationAt", isoDate)
            .put("partySize", partySize)
            .put("customerName", customerName.trim())
            .put("customerPhone", customerPhone.trim())
            .put("occasion", occasion.trim().takeIf { it.isNotBlank() } ?: JSONObject.NULL)
            .put("notes", notes.trim().takeIf { it.isNotBlank() } ?: JSONObject.NULL)

        scope.launch {
            submitting = true
            error = ""
            try {
                val created = FuchsiaApi.createReservation(payload, currentToken)
                submitted = created
                previousReservations = listOf(created) + previousReservations
                snackbar.showSnackbar("وصل طلب الحجز إلى الخادم، وبانتظار تأكيد الفرع.")
            } catch (failure: Throwable) {
                error = if (failure is ApiException && failure.statusCode == 404) {
                    "خدمة الحجز غير مفعّلة على الخادم بعد. يلزم نشر تحديث API وإضافة جدول الحجوزات أولًا."
                } else {
                    failure.message ?: "تعذر إرسال طلب الحجز."
                }
                snackbar.showSnackbar(error)
            } finally {
                submitting = false
            }
        }
    }

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
    ) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = contentPadding.calculateTopPadding() + 7.dp, bottom = contentPadding.calculateBottomPadding() + 18.dp),
            verticalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            item {
                CommerceHeader("حجز طاولة", "طلب موعد للمناسبة في فوشيا", onBack)
            }
            item {
                Card(
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary),
                ) {
                    Row(Modifier.fillMaxWidth().padding(16.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Icon(Icons.Rounded.Restaurant, contentDescription = null, tint = FuchsiaColors.White, modifier = Modifier.size(29.dp))
                        Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text("تنسيق أنيق للمناسبات", color = FuchsiaColors.White, fontWeight = FontWeight.ExtraBold)
                            Text("إرسال طلب الحجز، ثم يتواصل الفرع لتأكيد التوفر.", color = FuchsiaColors.White.copy(alpha = 0.9f), style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp))
                        }
                    }
                }
            }
            if (loading) {
                item { Box(Modifier.fillMaxWidth().padding(35.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else {
                item {
                    CommerceSectionTitle("الفرع", "اختيار الموقع المناسب")
                    Box {
                        Card(
                            onClick = { expandedStores = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(15.dp),
                            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                            border = BorderStroke(1.dp, FuchsiaColors.Line),
                        ) {
                            Row(Modifier.fillMaxWidth().padding(14.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                                    Text(selectedStore?.name ?: "اختيار الفرع", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                                    Text(selectedStore?.location?.ifBlank { "" } ?: "", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp))
                                }
                                Icon(Icons.Rounded.Restaurant, contentDescription = null, tint = FuchsiaColors.Primary)
                            }
                        }
                        DropdownMenu(expanded = expandedStores, onDismissRequest = { expandedStores = false }) {
                            stores.forEach { store ->
                                DropdownMenuItem(
                                    text = { Text(store.name + if (store.location.isBlank()) "" else " · ${store.location}") },
                                    onClick = { selectedStoreId = store.id; expandedStores = false },
                                )
                            }
                        }
                    }
                }
                item {
                    CommerceSectionTitle("موعد الحجز", "بتوقيت الفرع")
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        DateTimeChoice(
                            icon = Icons.Rounded.EventAvailable,
                            label = formatDate(selectedDateTime.time),
                            modifier = Modifier.weight(1.35f),
                            onClick = ::chooseDate,
                        )
                        DateTimeChoice(
                            icon = Icons.Rounded.EventAvailable,
                            label = SimpleDateFormat("HH:mm", Locale.forLanguageTag("ar-YE")).format(selectedDateTime.time),
                            modifier = Modifier.weight(0.8f),
                            onClick = ::chooseTime,
                        )
                    }
                }
                item {
                    CommerceSectionTitle("عدد الضيوف", "من 1 إلى 20")
                    Card(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 7.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Rounded.PeopleAlt, contentDescription = null, tint = FuchsiaColors.Primary)
                                Text("عدد الحضور", color = FuchsiaColors.Ink, fontWeight = FontWeight.SemiBold)
                            }
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                RoundCountButton("−", enabled = partySize > 1) { partySize-- }
                                Text(partySize.toString(), color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
                                RoundCountButton("+", enabled = partySize < 20) { partySize++ }
                            }
                        }
                    }
                }
                item {
                    CommerceSectionTitle("بيانات التواصل")
                    CommerceField(customerName, { customerName = it }, "اسم صاحب الحجز")
                    CommerceField(customerPhone, { customerPhone = it }, "رقم الهاتف", keyboardType = KeyboardType.Phone)
                    CommerceField(occasion, { occasion = it }, "المناسبة", placeholder = "عيد ميلاد، خطوبة، لقاء عائلي")
                    CommerceField(notes, { notes = it }, "ملاحظات للفرع", minLines = 2, maxLines = 4, placeholder = "تفضيلات الجلسة أو أي طلب خاص")
                }
                item {
                    CommerceNotice("الطلب لا يُعدّ حجزًا مؤكدًا حتى يراجعه الفرع ويتواصل مع صاحب الطلب. ستظهر الحالة «بانتظار التأكيد» بعد الإرسال.")
                }
                if (error.isNotBlank()) item { CommerceNotice(error, isError = true) }
                submitted?.let { reservation ->
                    item {
                        Card(
                            shape = androidx.compose.foundation.shape.RoundedCornerShape(19.dp),
                            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.RoseLight),
                            border = BorderStroke(1.dp, FuchsiaColors.Line),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("تم إرسال طلب الحجز #${reservation.id}", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold)
                                Text("الحالة: بانتظار تأكيد الفرع · ${formatDate(selectedDateTime.time)} · $partySize ضيوف", color = FuchsiaColors.Ink)
                            }
                        }
                    }
                }
                item {
                    CommercePrimaryButton(
                        text = if (submitted == null) "إرسال طلب الحجز" else "إرسال طلب حجز آخر",
                        busy = submitting,
                        enabled = stores.isNotEmpty(),
                        onClick = { submitted = null; submitReservation() },
                    )
                }
                if (previousReservations.isNotEmpty()) {
                    item { CommerceSectionTitle("طلبات الحجز السابقة", "${previousReservations.size}") }
                    item {
                        val last = previousReservations.first()
                        Card(shape = androidx.compose.foundation.shape.RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                            Column(Modifier.fillMaxWidth().padding(13.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                                Text("حجز #${last.id} · ${stores.firstOrNull { it.id == last.storeId }?.name ?: "فرع فوشيا"}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                                Text("${last.partySize} ضيوف · ${formatIsoDate(last.reservationAt)}", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
                                Text(reservationStatus(last.status), color = FuchsiaColors.TextAccent, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DateTimeChoice(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    modifier: Modifier,
    onClick: () -> Unit,
) {
    Card(
        onClick = onClick,
        modifier = modifier.height(58.dp),
        shape = androidx.compose.foundation.shape.RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(18.dp))
            Text(label, color = FuchsiaColors.Ink, fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun RoundCountButton(label: String, enabled: Boolean, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.size(34.dp),
        contentPadding = PaddingValues(0.dp),
        shape = androidx.compose.foundation.shape.CircleShape,
        colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Rose, contentColor = FuchsiaColors.Primary),
    ) { Text(label, fontWeight = FontWeight.ExtraBold) }
}

private fun formatDate(date: Date): String =
    SimpleDateFormat("EEEE، d MMMM", Locale.forLanguageTag("ar-YE")).format(date)

private fun formatIsoDate(value: String): String = runCatching {
    val instant = java.time.Instant.parse(value)
    formatDate(Date.from(instant))
}.getOrDefault(value)

private fun reservationStatus(status: String): String = when (status) {
    "pending" -> "بانتظار تأكيد الفرع"
    "confirmed" -> "تم التأكيد"
    "cancelled" -> "ملغي"
    else -> status
}

private fun snackbarShow(scope: kotlinx.coroutines.CoroutineScope, snackbar: SnackbarHostState, message: String) {
    scope.launch { snackbar.showSnackbar(message) }
}
