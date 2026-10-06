package com.fuchsia.platform.compose.ui.screens

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
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
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.LocalShipping
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.CustomerOrder
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.OrderTracking
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.delay
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

private val orderStatusLabels = mapOf(
    "received" to "تم استلام الطلب",
    "preparing" to "جاري تجهيز الطلب",
    "delivering" to "الطلب في الطريق",
    "delivered" to "تم التسليم",
    "cancelled" to "تم إلغاء الطلب",
)

@Composable
fun OrdersScreen(
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    focusOrderId: Int = 0,
    bottomBar: @Composable () -> Unit = {},
) {
    val context = LocalContext.current
    val userToken = remember(context) { SessionVault.read(context)?.optString("token")?.takeIf(String::isNotBlank) }
    var orders by remember { mutableStateOf<List<CustomerOrder>>(emptyList()) }
    var tracking by remember { mutableStateOf<OrderTracking?>(null) }
    var selectedOrderId by remember { mutableIntStateOf(focusOrderId) }
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var updatedAt by remember { mutableLongStateOf(0L) }
    var refreshKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(userToken, selectedOrderId, refreshKey) {
        if (userToken.isNullOrBlank()) {
            loading = false
            error = "يلزم تسجيل الدخول أو بدء التصفح دون حساب لمتابعة الطلبات."
            return@LaunchedEffect
        }
        while (true) {
            loading = orders.isEmpty()
            refreshing = orders.isNotEmpty()
            try {
                val fetchedOrders = FuchsiaApi.customerOrders(userToken)
                orders = fetchedOrders
                val target = fetchedOrders.firstOrNull { it.id == selectedOrderId }
                    ?: fetchedOrders.firstOrNull()
                if (target == null) {
                    tracking = null
                    error = "لا توجد طلبات مرتبطة بهذه الجلسة حتى الآن."
                } else {
                    if (selectedOrderId != target.id) selectedOrderId = target.id
                    tracking = FuchsiaApi.orderTracking(target.id, userToken)
                    error = ""
                    updatedAt = System.currentTimeMillis()
                }
            } catch (failure: Exception) {
                error = failure.message ?: "تعذر تحديث حالة الطلب. تحقق من الاتصال ثم أعد المحاولة."
            } finally {
                loading = false
                refreshing = false
            }
            delay(15_000)
        }
    }

    Scaffold(containerColor = FuchsiaColors.Cream, bottomBar = bottomBar) { insets ->
        Column(
            modifier = Modifier.fillMaxSize().padding(top = insets.calculateTopPadding()),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Card(
                    onClick = onBack,
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                    border = BorderStroke(1.dp, FuchsiaColors.Line),
                ) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink)
                    }
                }
                Column(Modifier.weight(1f)) {
                    Text("طلباتي", color = FuchsiaColors.Ink, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                    Text("تتبع مباشر لحالة الطلب", color = FuchsiaColors.Muted, fontSize = 12.sp)
                }
                Card(
                    onClick = { refreshKey++ },
                    modifier = Modifier.size(44.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Rose),
                ) {
                    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.Refresh, contentDescription = "تحديث الطلبات", tint = FuchsiaColors.Primary)
                    }
                }
            }

            LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = androidx.compose.foundation.layout.PaddingValues(start = 18.dp, end = 18.dp, bottom = insets.calculateBottomPadding() + 26.dp),
                verticalArrangement = Arrangement.spacedBy(13.dp),
            ) {
                item {
                    Card(
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary),
                    ) {
                        Row(
                            Modifier.fillMaxWidth().padding(16.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Box(Modifier.size(42.dp).background(Color.White.copy(alpha = 0.15f), CircleShape), contentAlignment = Alignment.Center) {
                                Icon(Icons.Rounded.LocalShipping, contentDescription = null, tint = Color.White)
                            }
                            Column(Modifier.weight(1f)) {
                                Text("حالة طلبك بين يديك", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                                Text("تُحدَّث الحالة تلقائيًا كل ١٥ ثانية عند فتح هذه الشاشة.", color = Color.White.copy(alpha = 0.9f), fontSize = 11.sp)
                            }
                            if (refreshing) CircularProgressIndicator(modifier = Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
                        }
                    }
                }
                if (orders.isNotEmpty()) {
                    item {
                        OrderHistorySummary(
                            total = orders.size,
                            delivered = orders.count { it.status == "delivered" },
                            active = orders.count { it.status in setOf("received", "preparing", "delivering") },
                        )
                    }
                }

                if (orders.isNotEmpty()) {
                    item {
                        Text("اختر طلبًا للمتابعة", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    }
                    items(orders, key = { it.id }) { order ->
                        OrderChoiceCard(order, selected = selectedOrderId == order.id) { selectedOrderId = order.id }
                    }
                }

                if (loading && orders.isEmpty()) {
                    item { Box(Modifier.fillMaxWidth().padding(vertical = 36.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
                } else if (tracking != null) {
                    item { TrackingDetails(tracking = tracking!!, updatedAt = updatedAt, onCallDriver = { phone ->
                        runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(phone)}"))) }
                    }) }
                }

                if (error.isNotBlank()) {
                    item {
                        Card(
                            shape = RoundedCornerShape(17.dp),
                            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                            border = BorderStroke(1.dp, if (error.startsWith("لا توجد")) FuchsiaColors.Line else Color(0xFFE2D0CC)),
                        ) {
                            Column(Modifier.fillMaxWidth().padding(17.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                                Text(error, color = FuchsiaColors.Ink, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                                Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary), shape = RoundedCornerShape(13.dp)) {
                                    Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(17.dp))
                                    Spacer(Modifier.width(7.dp))
                                    Text("إعادة المحاولة")
                                }
                                if (userToken.isNullOrBlank() || error.contains("انتهت صلاحية الجلسة")) {
                                    androidx.compose.material3.TextButton(onClick = onSignIn) {
                                        Text("تسجيل الدخول", color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderHistorySummary(total: Int, delivered: Int, active: Int) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxWidth().padding(vertical = 14.dp), horizontalArrangement = Arrangement.SpaceEvenly) {
            HistoryStat("كل الطلبات", total)
            HistoryStat("قيد التنفيذ", active)
            HistoryStat("تم التسليم", delivered)
        }
    }
}

@Composable
private fun HistoryStat(label: String, value: Int) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(value.toString(), color = FuchsiaColors.Primary, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
        Text(label, color = FuchsiaColors.Muted, fontSize = 10.sp)
    }
}

@Composable
private fun OrderChoiceCard(order: CustomerOrder, selected: Boolean, onClick: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) FuchsiaColors.Rose else FuchsiaColors.White),
        border = BorderStroke(1.dp, if (selected) FuchsiaColors.Primary.copy(alpha = 0.6f) else FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            Box(Modifier.size(38.dp).background(Color.White.copy(alpha = 0.78f), RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.AutoMirrored.Rounded.ReceiptLong, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(20.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text("طلب #${order.id}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                Text("${order.itemCount} منتجات · ${formatDate(order.createdAt)}", color = FuchsiaColors.Muted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(formatMoney(order.total), color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                Text(orderStatusLabels[order.status] ?: "قيد المعالجة", color = FuchsiaColors.Muted, fontSize = 10.sp)
            }
        }
    }
}

@Composable
private fun TrackingDetails(tracking: OrderTracking, updatedAt: Long, onCallDriver: (String) -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(21.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Column(Modifier.fillMaxWidth().padding(17.dp), verticalArrangement = Arrangement.spacedBy(13.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Box(Modifier.size(38.dp).background(FuchsiaColors.RoseLight, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                    Icon(Icons.Rounded.LocalShipping, contentDescription = null, tint = FuchsiaColors.Primary)
                }
                Column(Modifier.weight(1f)) {
                    Text("تحديث الطلب #${tracking.orderId}", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    Text("آخر تحديث ${formatTime(updatedAt)}", color = FuchsiaColors.Muted, fontSize = 11.sp)
                }
                Text(orderStatusLabels[tracking.status] ?: tracking.status, color = if (tracking.status == "cancelled") Color(0xFFB4234A) else FuchsiaColors.Primary, fontWeight = FontWeight.Bold, fontSize = 11.sp)
            }
            Row(Modifier.fillMaxWidth().background(FuchsiaColors.Cream, RoundedCornerShape(14.dp)).padding(12.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column {
                    Text("قيمة الطلب", color = FuchsiaColors.Muted, fontSize = 11.sp)
                    Text(formatMoney(tracking.total), color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                Column(horizontalAlignment = Alignment.End) {
                    Text("تاريخ الطلب", color = FuchsiaColors.Muted, fontSize = 11.sp)
                    Text(formatDate(tracking.createdAt), color = FuchsiaColors.Ink, fontWeight = FontWeight.SemiBold, fontSize = 11.sp)
                }
            }
            Text("مراحل الطلب", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            val history = tracking.history
            if (history.isEmpty()) {
                Text("تم تسجيل الطلب، وسيظهر هنا كل تحديث جديد من المتجر.", color = FuchsiaColors.Muted, fontSize = 12.sp)
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(0.dp)) {
                    history.forEachIndexed { index, event ->
                        Row(horizontalArrangement = Arrangement.spacedBy(11.dp), verticalAlignment = Alignment.Top) {
                            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.width(18.dp)) {
                                Box(Modifier.size(17.dp).background(if (index == history.lastIndex) FuchsiaColors.Primary else FuchsiaColors.Rose, CircleShape), contentAlignment = Alignment.Center) {
                                    if (index == history.lastIndex) Icon(Icons.Rounded.CheckCircle, contentDescription = null, tint = Color.White, modifier = Modifier.size(13.dp))
                                }
                                if (index < history.lastIndex) Box(Modifier.width(2.dp).height(37.dp).background(FuchsiaColors.Line))
                            }
                            Column(Modifier.weight(1f).padding(bottom = 12.dp)) {
                                Text(orderStatusLabels[event.status] ?: event.message, color = FuchsiaColors.Ink, fontWeight = if (index == history.lastIndex) FontWeight.Bold else FontWeight.Medium, fontSize = 12.sp)
                                Text(event.message, color = FuchsiaColors.Muted, fontSize = 11.sp)
                                Text(formatDate(event.createdAt), color = Color(0xFF9A8791), fontSize = 10.sp)
                            }
                        }
                    }
                }
            }
            if (!tracking.driverName.isNullOrBlank() || !tracking.driverPhone.isNullOrBlank()) {
                Row(Modifier.fillMaxWidth().background(Color(0xFFF5FBF7), RoundedCornerShape(15.dp)).padding(12.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Box(Modifier.size(36.dp).background(Color.White, CircleShape), contentAlignment = Alignment.Center) {
                        Icon(Icons.Rounded.LocalShipping, contentDescription = null, tint = Color(0xFF20835B), modifier = Modifier.size(19.dp))
                    }
                    Column(Modifier.weight(1f)) {
                        Text(tracking.driverName?.takeIf { it.isNotBlank() } ?: "مندوب التوصيل", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        Text("معلومات التوصيل", color = FuchsiaColors.Muted, fontSize = 10.sp)
                    }
                    if (!tracking.driverPhone.isNullOrBlank()) {
                        Button(onClick = { onCallDriver(tracking.driverPhone) }, colors = ButtonDefaults.buttonColors(containerColor = Color(0xFF20835B)), shape = RoundedCornerShape(12.dp), contentPadding = androidx.compose.foundation.layout.PaddingValues(horizontal = 12.dp, vertical = 8.dp)) {
                            Icon(Icons.Rounded.Phone, contentDescription = null, modifier = Modifier.size(15.dp))
                            Spacer(Modifier.width(5.dp))
                            Text("اتصال", fontSize = 11.sp)
                        }
                    }
                }
            }
        }
    }
}

private fun formatMoney(amount: Double): String = NumberFormat.getNumberInstance(Locale.forLanguageTag("ar-YE")).apply { maximumFractionDigits = 0 }.format(amount) + " ر.ي"

private fun formatDate(value: String): String {
    val patterns = listOf("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", "yyyy-MM-dd'T'HH:mm:ss'Z'", "yyyy-MM-dd HH:mm:ss")
    val parsed = patterns.firstNotNullOfOrNull { pattern ->
        runCatching { SimpleDateFormat(pattern, Locale.US).apply { isLenient = false; timeZone = TimeZone.getTimeZone("UTC") }.parse(value) }.getOrNull()
    } ?: return value
    return SimpleDateFormat("d MMM، h:mm a", Locale.forLanguageTag("ar-YE")).format(parsed)
}

private fun formatTime(value: Long): String = if (value <= 0L) "—" else SimpleDateFormat("h:mm:ss a", Locale.forLanguageTag("ar-YE")).format(Date(value))
