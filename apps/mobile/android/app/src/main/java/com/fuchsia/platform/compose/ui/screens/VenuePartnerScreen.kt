package com.fuchsia.platform.compose.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.Publish
import androidx.compose.material.icons.rounded.Unpublished
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

private val partnerWeekdays = listOf(
    0 to "الأحد", 1 to "الاثنين", 2 to "الثلاثاء", 3 to "الأربعاء", 4 to "الخميس", 5 to "الجمعة", 6 to "السبت",
)

@Composable
fun VenuePartnerScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val token = remember(context) { SessionVault.token(context) }
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var busy by remember { mutableStateOf(false) }
    var ownerStatus by remember { mutableStateOf("none") }
    var ownerBusinessName by remember { mutableStateOf("") }
    var venueRows by remember { mutableStateOf<List<JSONObject>>(emptyList()) }
    var error by remember { mutableStateOf("") }
    var info by remember { mutableStateOf("") }
    var showVenueForm by remember { mutableStateOf(false) }

    var businessName by remember { mutableStateOf("") }
    var contactPhone by remember { mutableStateOf("") }
    var venueName by remember { mutableStateOf("") }
    var city by remember { mutableStateOf("") }
    var address by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var capacity by remember { mutableStateOf("") }
    var dailyPrice by remember { mutableStateOf("") }
    var imageLinks by remember { mutableStateOf("") }
    var audienceScope by remember { mutableStateOf("both") }
    var openDays by remember { mutableStateOf(setOf<Int>()) }

    suspend fun reload() {
        val bearerToken = token ?: throw IllegalStateException("سجّل الدخول بحسابك أولًا")
        val profile = FuchsiaApi.venuePartnerProfile(bearerToken)
        val owner = profile.optJSONObject("owner")
        ownerStatus = owner?.optString("status").orEmpty().ifBlank { "none" }
        ownerBusinessName = owner?.optString("businessName").orEmpty()
        val rows = profile.optJSONArray("venues") ?: JSONArray()
        venueRows = buildList { for (index in 0 until rows.length()) rows.optJSONObject(index)?.let(::add) }
    }

    LaunchedEffect(token) {
        if (token.isNullOrBlank()) {
            error = "سجّل الدخول بحساب موثّق للوصول إلى مساحة الشريك."
            loading = false
        } else {
            runCatching { reload() }.onFailure { error = it.message ?: "تعذر تحميل حساب الشريك." }
            loading = false
        }
    }

    Scaffold(containerColor = FuchsiaColors.Cream) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 8.dp, bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink) }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                        Text("مساحة الشريك", color = FuchsiaColors.Ink, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                        Text("بيانات حقيقية؛ القاعة لا تظهر قبل استكمالها ونشرها.", color = FuchsiaColors.Muted, fontSize = 12.sp)
                    }
                }
            }
            if (loading) item { Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            else if (ownerStatus == "none") {
                item {
                    PartnerPanel(title = "طلب اعتماد مالك قاعة") {
                        Text("قدّم بيانات التواصل. لن تتمكن من نشر قاعة حتى تعتمد الإدارة حساب الشريك.", color = FuchsiaColors.Muted, fontSize = 12.sp)
                        PartnerField(businessName, { businessName = it }, "اسم النشاط أو الجهة")
                        PartnerField(contactPhone, { contactPhone = it }, "رقم التواصل", keyboardType = KeyboardType.Phone)
                        PartnerSubmitButton("إرسال طلب الاعتماد", busy) {
                            if (businessName.isBlank() || contactPhone.isBlank()) error = "أدخل اسم النشاط ورقم التواصل."
                            else scope.launch {
                                busy = true; error = ""; info = ""
                                runCatching { FuchsiaApi.requestVenuePartner(JSONObject().put("businessName", businessName.trim()).put("contactPhone", contactPhone.trim()), token.orEmpty()) }
                                    .onSuccess { ownerStatus = it.optString("status", "pending"); ownerBusinessName = businessName.trim(); info = "تم إرسال الطلب للإدارة." }
                                    .onFailure { error = it.message ?: "تعذر إرسال الطلب." }
                                busy = false
                            }
                        }
                    }
                }
            } else if (ownerStatus == "pending") {
                item {
                    PartnerPanel(title = "طلبك قيد المراجعة") {
                        Text(ownerBusinessName, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                        Text("بعد اعتماد الحساب ستتمكن من إضافة القاعات وتحديد الأيام والقسم والأسعار.", color = FuchsiaColors.Muted)
                        Button(onClick = { scope.launch { runCatching { reload() }.onFailure { error = it.message.orEmpty() } } }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Rose)) { Text("تحديث الحالة", color = FuchsiaColors.TextAccent) }
                    }
                }
            } else if (ownerStatus == "suspended") {
                item { CommerceNotice("حساب الشريك موقوف. تواصل مع الإدارة لمراجعة الحالة.", isError = true) }
            } else {
                item {
                    PartnerPanel(title = ownerBusinessName.ifBlank { "إدارة القاعات" }) {
                        Text("أدخل بيانات القاعة والسعر اليومي والموقع، وحدد الأقسام وأيام الدوام. لن يُنشأ حجز اعتمادًا على بيانات تجريبية.", color = FuchsiaColors.Muted, fontSize = 12.sp)
                        Button(onClick = { showVenueForm = !showVenueForm; error = "" }, modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                            Icon(Icons.Rounded.Add, contentDescription = null); Spacer(Modifier.size(7.dp)); Text(if (showVenueForm) "إغلاق نموذج القاعة" else "إضافة قاعة")
                        }
                    }
                }
                if (showVenueForm) item {
                    PartnerPanel(title = "بيانات القاعة") {
                        PartnerField(venueName, { venueName = it }, "اسم القاعة")
                        PartnerField(city, { city = it }, "المدينة")
                        PartnerField(address, { address = it }, "العنوان التفصيلي", singleLine = false)
                        PartnerField(description, { description = it }, "وصف القاعة", singleLine = false)
                        PartnerField(capacity, { capacity = it.filter(Char::isDigit).take(5) }, "السعة القصوى للضيوف", keyboardType = KeyboardType.Number)
                        PartnerField(dailyPrice, { dailyPrice = it.filter(Char::isDigit).take(12) }, "سعر الحجز لليوم بالريال", keyboardType = KeyboardType.Number)
                        PartnerField(imageLinks, { imageLinks = it }, "رابط الصورة الرئيسية ثم روابط إضافية مفصولة بفاصلة", singleLine = false)
                        Text("ملاحظة: هذا الإصدار يقبل روابط صور مستضافة؛ رفع الصور من الجهاز يتطلب ربط تخزين صور دائم للمشروع.", color = FuchsiaColors.Muted, fontSize = 11.sp)
                        Text("القسم الذي تسمح به القاعة", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("both" to "النساء والرجال", "women" to "النساء فقط", "men" to "الرجال فقط").forEach { (value, label) ->
                                FilterChip(selected = audienceScope == value, onClick = { audienceScope = value }, label = { Text(label, fontSize = 11.sp) })
                            }
                        }
                        Text("أيام الدوام الأسبوعي", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                        partnerWeekdays.chunked(4).forEach { row ->
                            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                row.forEach { (day, label) ->
                                    FilterChip(selected = day in openDays, onClick = { openDays = if (day in openDays) openDays - day else openDays + day }, label = { Text(label, fontSize = 10.sp) })
                                }
                            }
                        }
                        PartnerSubmitButton("حفظ القاعة ونشرها", busy) {
                            val capacityValue = capacity.toIntOrNull() ?: 0
                            val dailyPriceValue = dailyPrice.toDoubleOrNull() ?: 0.0
                            val links = imageLinks.split(',', '\n').map { it.trim() }.filter { it.isNotBlank() }.distinct().take(8)
                            if (venueName.isBlank() || city.isBlank() || address.isBlank() || capacityValue < 1 || dailyPriceValue <= 0 || links.isEmpty() || openDays.isEmpty()) {
                                error = "أكمل الاسم والموقع والسعة والسعر وصورة ورابطًا واحدًا على الأقل، وحدد أيام الدوام."
                            } else scope.launch {
                                busy = true; error = ""; info = ""
                                runCatching {
                                    val createPayload = JSONObject()
                                        .put("nameAr", venueName.trim())
                                        .put("city", city.trim())
                                        .put("address", address.trim())
                                        .put("description", description.trim())
                                        .put("capacity", capacityValue)
                                        .put("dailyPrice", dailyPriceValue)
                                        .put("audienceScope", audienceScope)
                                        .put("primaryImageUrl", links.first())
                                        .put("images", JSONArray(links))
                                    val slots = JSONArray()
                                    openDays.sorted().forEach { day -> slots.put(JSONObject().put("audienceScope", audienceScope).put("weekDay", day).put("isOpen", true)) }
                                    createPayload.put("slots", slots).put("isPublished", true)
                                    FuchsiaApi.createPartnerVenue(createPayload, token.orEmpty())
                                }.onSuccess {
                                    showVenueForm = false
                                    venueName = ""; city = ""; address = ""; description = ""; capacity = ""; dailyPrice = ""; imageLinks = ""; openDays = emptySet()
                                    info = "تم حفظ القاعة ونشرها. ستظهر للعملاء بحسب القسم والجدول المدخلين."
                                    reload()
                                }.onFailure { error = it.message ?: "تعذر حفظ القاعة." }
                                busy = false
                            }
                        }
                    }
                }
                if (venueRows.isNotEmpty()) {
                    item { Text("قاعاتك", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp) }
                    items(venueRows, key = { it.optInt("id") }) { venue ->
                        val venueId = venue.optInt("id")
                        val published = venue.optBoolean("isPublished")
                        PartnerPanel(title = venue.optString("nameAr")) {
                            Text("${venue.optString("city")} · ${venue.optInt("capacity")} ضيف · ${formatYemeniRiyal(venue.optDouble("dailyPrice"))} لليوم", color = FuchsiaColors.Muted, fontSize = 12.sp)
                            Text("النطاق: ${partnerAudienceLabel(venue.optString("audienceScope"))}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                            Button(onClick = {
                                scope.launch {
                                    busy = true; error = ""
                                    runCatching { FuchsiaApi.updatePartnerVenue(venueId, JSONObject().put("isPublished", !published), token.orEmpty()); reload() }
                                        .onSuccess { info = if (published) "تم إخفاء القاعة عن العملاء." else "تم نشر القاعة." }
                                        .onFailure { error = it.message ?: "تعذر تغيير حالة النشر." }
                                    busy = false
                                }
                            }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = if (published) FuchsiaColors.Rose else FuchsiaColors.Primary)) {
                                Icon(if (published) Icons.Rounded.Unpublished else Icons.Rounded.Publish, contentDescription = null)
                                Spacer(Modifier.size(6.dp)); Text(if (published) "إلغاء النشر" else "نشر القاعة", color = if (published) FuchsiaColors.TextAccent else Color.White)
                            }
                        }
                    }
                } else item { CommerceNotice("لا توجد قاعات مضافة بعد. ابدأ بقاعة واحدة مكتملة البيانات.") }
            }
            if (error.isNotBlank()) item { CommerceNotice(error, isError = true) }
            if (info.isNotBlank()) item { CommerceNotice(info) }
        }
    }
}

@Composable
private fun PartnerPanel(title: String, content: @Composable () -> Unit) {
    Card(shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.fillMaxWidth().padding(15.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(title, color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
            content()
        }
    }
}

@Composable
private fun PartnerField(value: String, onValueChange: (String) -> Unit, label: String, keyboardType: KeyboardType = KeyboardType.Text, singleLine: Boolean = true) {
    OutlinedTextField(value = value, onValueChange = onValueChange, modifier = Modifier.fillMaxWidth(), label = { Text(label) }, singleLine = singleLine, minLines = if (singleLine) 1 else 3, keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(keyboardType = keyboardType), shape = RoundedCornerShape(14.dp))
}

@Composable
private fun PartnerSubmitButton(text: String, busy: Boolean, onClick: () -> Unit) {
    Button(onClick = onClick, enabled = !busy, modifier = Modifier.fillMaxWidth().height(50.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
        if (busy) CircularProgressIndicator(Modifier.size(19.dp), color = Color.White, strokeWidth = 2.dp)
        else { Icon(Icons.Rounded.CheckCircle, contentDescription = null); Spacer(Modifier.size(7.dp)); Text(text, fontWeight = FontWeight.Bold) }
    }
}

private fun partnerAudienceLabel(value: String) = when (value) {
    "women" -> "نساء فقط"
    "men" -> "رجال فقط"
    else -> "النساء والرجال"
}
