package com.fuchsia.platform.compose.ui.screens

import android.app.DatePickerDialog
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.Remove
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.ApiException
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.RentalBookingDraft
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch
import java.util.Calendar
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.UUID

@Composable
fun ProductDetailsScreen(productId: Int, onBack: () -> Unit, onCart: () -> Unit, onRentalCheckout: (RentalBookingDraft) -> Unit = {}) {
    val context = LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val scope = rememberCoroutineScope()
    val notice = remember { SnackbarHostState() }
    var product by remember(productId) { mutableStateOf<StoreProduct?>(null) }
    var loading by remember(productId) { mutableStateOf(true) }
    var error by remember(productId) { mutableStateOf("") }
    var quantity by remember(productId) { mutableIntStateOf(1) }
    var rentalDays by remember(productId) { mutableIntStateOf(1) }
    var rentalStartDate by remember(productId) { mutableStateOf<String?>(null) }
    var rentalFulfillment by remember(productId) { mutableStateOf("pickup") }
    var rentalTimeSlot by remember(productId) { mutableStateOf("morning") }
    var availableQuantity by remember(productId) { mutableIntStateOf(-1) }
    var rentalCanBook by remember(productId) { mutableStateOf(false) }
    var availabilityPreviewOnly by remember(productId) { mutableStateOf(false) }
    var rentalEndDate by remember(productId) { mutableStateOf<String?>(null) }
    var availabilityLoading by remember(productId) { mutableStateOf(false) }
    var availabilityError by remember(productId) { mutableStateOf("") }
    var checkedAvailabilityKey by remember(productId) { mutableStateOf<String?>(null) }

    LaunchedEffect(productId) {
        loading = true
        error = ""
        runCatching { FuchsiaApi.product(productId) }
            .onSuccess {
                product = it
                rentalDays = it.rentalMinDays
            }
            .onFailure { error = it.message ?: "تعذر تحميل تفاصيل المنتج." }
        loading = false
    }

    val current = product
    LaunchedEffect(current?.id, current?.fulfillmentType, rentalStartDate, rentalDays, quantity) {
        val selectedProduct = current
        val selectedDate = rentalStartDate
        if (selectedProduct?.fulfillmentType != "rental" || selectedDate == null) {
            availableQuantity = -1
            rentalCanBook = false
            availabilityPreviewOnly = false
            rentalEndDate = null
            availabilityLoading = false
            availabilityError = ""
            checkedAvailabilityKey = null
            return@LaunchedEffect
        }
        availabilityLoading = true
        availableQuantity = -1
        rentalCanBook = false
        rentalEndDate = null
        availabilityError = ""
        runCatching { FuchsiaApi.rentalAvailability(selectedProduct.id, selectedDate, rentalDays, quantity, selectedProduct.stockQuantity ?: 1) }
            .onSuccess {
                availableQuantity = it.availableQuantity
                rentalCanBook = it.canBook
                rentalEndDate = it.endDate
                availabilityPreviewOnly = it.previewOnly
                checkedAvailabilityKey = "$selectedDate|$rentalDays|$quantity"
            }
            .onFailure {
                checkedAvailabilityKey = null
                availabilityError = rentalAvailabilityError(it)
            }
        availabilityLoading = false
    }
    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(notice) },
        bottomBar = {
            if (current != null) {
                Surface(
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding().zIndex(5f),
                    color = FuchsiaColors.White,
                    shadowElevation = 18.dp,
                ) {
                    Row(
                        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Button(
                            onClick = {
                                if (current.fulfillmentType == "rental") {
                                    val date = rentalStartDate
                                    if (date == null || availableQuantity < quantity) return@Button
                                    onRentalCheckout(
                                        RentalBookingDraft(
                                            product = current,
                                            startDate = date,
                                            days = rentalDays,
                                            quantity = quantity,
                                            fulfillment = rentalFulfillment,
                                            timeSlot = rentalTimeSlot,
                                            idempotencyKey = UUID.randomUUID().toString(),
                                            previewOnly = availabilityPreviewOnly,
                                        ),
                                    )
                                } else {
                                    val id = sessionId
                                    if (id == null) scope.launch { notice.showSnackbar("يرجى بدء التصفح قبل إضافة المنتجات.") }
                                    else scope.launch {
                                        runCatching { FuchsiaApi.addToCart(sessionId = id, productId = current.id, quantity = quantity) }
                                            .onSuccess { notice.showSnackbar("تمت إضافة المنتج إلى السلة بنجاح") }
                                            .onFailure { notice.showSnackbar(it.message ?: "تعذر إضافة المنتج.") }
                                    }
                                }
                            },
                            enabled = current.inStock && if (current.fulfillmentType == "rental") {
                                rentalStartDate != null && !availabilityLoading && rentalCanBook
                                    && checkedAvailabilityKey == "$rentalStartDate|$rentalDays|$quantity"
                            } else true,
                            modifier = Modifier.weight(1f).height(58.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                        ) {
                            Icon(if (current.fulfillmentType == "rental") Icons.Rounded.EventAvailable else Icons.Rounded.AddShoppingCart, contentDescription = null, modifier = Modifier.size(19.dp))
                            Spacer(Modifier.width(7.dp))
                            Text(if (current.fulfillmentType == "rental") "متابعة الحجز المباشر" else "إضافة للسلة", fontWeight = FontWeight.Bold)
                        }
                        QuantityStepper(
                            quantity = quantity,
                            maxQuantity = if (current.fulfillmentType == "rental") (current.stockQuantity ?: 1).coerceAtLeast(1) else (current.stockQuantity ?: 99).coerceIn(1, 99),
                            onDecrease = { if (quantity > 1) quantity-- },
                            onIncrease = { if (quantity < (current.stockQuantity ?: 99).coerceIn(1, 99)) quantity++ },
                        )
                    }
                }
            }
        },
    ) { insets ->
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) }
            current == null -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text(error.ifBlank { "المنتج غير متاح حاليًا." }, color = FuchsiaColors.Muted, textAlign = TextAlign.Center)
                Spacer(Modifier.height(16.dp))
                Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null); Spacer(Modifier.width(6.dp)); Text("العودة للمتجر") }
            }
            else -> LazyColumn(
                modifier = Modifier.fillMaxSize(),
                contentPadding = PaddingValues(bottom = insets.calculateBottomPadding() + 20.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                item {
                    Box(Modifier.fillMaxWidth().height(320.dp).clip(RoundedCornerShape(bottomStart = 28.dp, bottomEnd = 28.dp))) {
                        ProductGallery(current)
                        Row(
                            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            CircleAction(Icons.AutoMirrored.Rounded.ArrowBack, "رجوع", onBack)
                            if (current.fulfillmentType != "rental") CircleAction(Icons.Rounded.ShoppingBag, "السلة", onCart)
                        }
                    }
                }
                item {
                    Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(current.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, fontSize = 23.sp, lineHeight = 29.sp, fontWeight = FontWeight.ExtraBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        if (current.fulfillmentType == "rental") {
                            RentalTypeBadge(current.name, rentalCategory = current.rentalCategory)
                            RentalAudienceBadge(current.eventAudience)
                        }
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Text("★", color = FuchsiaColors.Ink, fontSize = 18.sp)
                            Text(if (current.rating > 0) String.format("%.1f", current.rating) else "جديد", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                            Text("(${current.reviewCount} تقييم)", color = FuchsiaColors.Muted, fontSize = 12.sp)
                        }
                        Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                            Text(formatRiyal(current.rentalDailyPrice ?: current.price), color = FuchsiaColors.TextAccent, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                            if (current.fulfillmentType == "rental") Text("لليوم", color = FuchsiaColors.Muted, fontSize = 12.sp)
                            current.originalPrice?.let { Text(formatRiyal(it), color = FuchsiaColors.Muted, fontSize = 12.sp, textDecoration = TextDecoration.LineThrough) }
                        }
                        if (current.fulfillmentType == "rental") {
                            RentalSelection(
                                dailyPrice = current.rentalDailyPrice ?: current.price,
                                deposit = current.rentalDeposit,
                                quantity = quantity,
                                previewOnly = availabilityPreviewOnly,
                                endDate = rentalEndDate,
                                minDays = current.rentalMinDays,
                                maxDays = current.rentalMaxDays,
                                days = rentalDays,
                                startDate = rentalStartDate,
                                onDaysChange = { rentalDays = it },
                                fulfillment = rentalFulfillment,
                                timeSlot = rentalTimeSlot,
                                onFulfillmentChange = { rentalFulfillment = it },
                                onTimeSlotChange = { rentalTimeSlot = it },
                                onDateClick = {
                                    val today = Calendar.getInstance()
                                    DatePickerDialog(
                                        context,
                                        { _, year, month, day -> rentalStartDate = String.format(Locale.US, "%04d-%02d-%02d", year, month + 1, day) },
                                        today.get(Calendar.YEAR), today.get(Calendar.MONTH), today.get(Calendar.DAY_OF_MONTH),
                                    ).apply { datePicker.minDate = today.timeInMillis }.show()
                                },
                            )
                            when {
                                availabilityLoading || (rentalStartDate != null && checkedAvailabilityKey != "$rentalStartDate|$rentalDays|$quantity" && availabilityError.isBlank()) -> Text("نتحقق من التوفر الفعلي للكمية في هذه المدة…", color = FuchsiaColors.Muted, fontSize = 12.sp)
                                availabilityError.isNotBlank() -> Text(availabilityError, color = FuchsiaColors.Error, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                rentalStartDate != null && checkedAvailabilityKey == "$rentalStartDate|$rentalDays|$quantity" && availableQuantity >= quantity -> Text(if (availabilityPreviewOnly) "متاح للمعاينة: $availableQuantity قطعة — ليس مخزونًا فعليًا" else "متاح للحجز: $availableQuantity من ${current.stockQuantity ?: 1}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                rentalStartDate != null && checkedAvailabilityKey == "$rentalStartDate|$rentalDays|$quantity" -> Text("الكمية المطلوبة غير متاحة في هذه المدة. المتاح: $availableQuantity", color = FuchsiaColors.Error, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                            if (current.rentalCategory == "table") {
                                val tableSpecs = buildList {
                                    current.tableHeightCm?.let { add("الارتفاع: ${String.format(Locale.US, "%.0f", it)} سم") }
                                    current.stockQuantity?.let { add("العدد المتاح: $it") }
                                }.joinToString(" · ")
                                if (tableSpecs.isNotBlank()) Text(tableSpecs, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                                if (current.availableColors.isNotEmpty()) Text("الألوان المتوفرة: ${current.availableColors.joinToString("، ")}", color = FuchsiaColors.Muted, fontSize = 13.sp)
                            } else if (current.rentalCategory == "kosh" && current.stockQuantity != null) {
                                Text("عدد الكوش المتاح: ${current.stockQuantity}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                            }
                        }
                        if (!current.inStock) Text("غير متوفر حاليًا", color = FuchsiaColors.Error, fontWeight = FontWeight.Bold)
                    }
                }
                item { ProductInfoCard(current) }
                if (current.tags.isNotEmpty()) {
                    item {
                        LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            itemsIndexed(current.tags) { _, tag -> TagChip(tag) }
                        }
                    }
                }
            }
        }
    }
}

private fun rentalAvailabilityError(failure: Throwable): String =
    if ((failure as? ApiException)?.statusCode == 404) {
        "خدمة التحقق من توفر الإيجار غير متاحة حاليًا. لم يُضف المنتج إلى السلة؛ يرجى المحاولة لاحقًا."
    } else {
        failure.message ?: "تعذر التحقق من توفر الكمية لهذه المدة."
    }

@Composable
private fun RentalSelection(
    dailyPrice: Double,
    deposit: Double,
    quantity: Int,
    previewOnly: Boolean,
    endDate: String?,
    minDays: Int,
    maxDays: Int,
    days: Int,
    startDate: String?,
    onDaysChange: (Int) -> Unit,
    onDateClick: () -> Unit,
    fulfillment: String,
    timeSlot: String,
    onFulfillmentChange: (String) -> Unit,
    onTimeSlotChange: (String) -> Unit,
) {
    Card(
        Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.RoseLight),
    ) {
        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
            Text("تفاصيل الإيجار", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold)
            Text("اختر تاريخ البداية والمدة وطريقة الاستلام أو التوصيل.", color = FuchsiaColors.Muted, fontSize = 12.sp)
            if (previewOnly) CommerceNotice("التوفر المعروض للمعاينة فقط؛ لا يمثل مخزونًا مؤكدًا ولا يثبت حجزًا.", isError = false)
            Button(
                onClick = onDateClick,
                modifier = Modifier.fillMaxWidth(),
                colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.White, contentColor = FuchsiaColors.Ink),
            ) {
                Text(startDate?.let { "تاريخ البداية: ${formatArabicRentalDate(it)}" } ?: "اختر تاريخ بداية الإيجار")
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text("مدة الإيجار: $days ${if (days == 1) "يوم" else "أيام"}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                QuantityStepper(
                    quantity = days,
                    onDecrease = { if (days > minDays) onDaysChange(days - 1) },
                    onIncrease = { if (days < maxDays) onDaysChange(days + 1) },
                )
            }
            Text("يسمح بالإيجار من $minDays إلى $maxDays أيام.", color = FuchsiaColors.Muted, fontSize = 11.sp)
            if (!endDate.isNullOrBlank()) Text("آخر يوم في مدة الإيجار: ${formatArabicRentalDate(endDate)}", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold, fontSize = 12.sp)
            Card(shape = RoundedCornerShape(14.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line)) {
                Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text("ملخص التكلفة", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                    Text("${formatRiyal(dailyPrice)} لليوم × $days أيام × $quantity قطع = ${formatRiyal(dailyPrice * days * quantity)}", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 13.sp)
                    if (deposit > 0) Text("التأمين المسترد: ${formatRiyal(deposit * quantity)}", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                }
            }
            Text("طريقة الحصول على الكوشة أو الطاولات", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Button(onClick = { onFulfillmentChange("pickup") }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (fulfillment == "pickup") FuchsiaColors.Primary else FuchsiaColors.White)) { Text("سأستلمها بنفسي", color = if (fulfillment == "pickup") Color.White else FuchsiaColors.Ink, fontSize = 11.sp) }
                Button(onClick = { onFulfillmentChange("delivery") }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (fulfillment == "delivery") FuchsiaColors.Primary else FuchsiaColors.White)) { Text("أحتاج توصيل", color = if (fulfillment == "delivery") Color.White else FuchsiaColors.Ink, fontSize = 11.sp) }
            }
            Text("متى تحتاجها؟", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 13.sp)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                Button(onClick = { onTimeSlotChange("morning") }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (timeSlot == "morning") FuchsiaColors.Primary else FuchsiaColors.White)) { Text("صباحًا", color = if (timeSlot == "morning") Color.White else FuchsiaColors.Ink, fontSize = 11.sp) }
                Button(onClick = { onTimeSlotChange("evening") }, modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = if (timeSlot == "evening") FuchsiaColors.Primary else FuchsiaColors.White)) { Text("مساءً", color = if (timeSlot == "evening") Color.White else FuchsiaColors.Ink, fontSize = 11.sp) }
            }
            Text(if (fulfillment == "delivery") "سيتم تحديد عنوان التوصيل والرسوم في الخطوة التالية." else "عند الاستلام: تدفع العربون للحجز، والمتبقي والضمان عند استلام القطعة.", color = FuchsiaColors.TextAccent, fontSize = 11.sp)
        }
    }
}

private fun formatArabicRentalDate(value: String): String {
    val parser = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply { isLenient = false }
    val date = runCatching { parser.parse(value) }.getOrNull() ?: return value
    return SimpleDateFormat("d MMMM yyyy", Locale.forLanguageTag("ar-YE")).format(date)
}

@Composable
private fun ProductGallery(product: StoreProduct) {
    val images = product.images.ifEmpty { listOfNotNull(product.imageUrl) }
    Box(Modifier.fillMaxSize().background(FuchsiaColors.RoseLight)) {
        if (images.isEmpty()) {
            Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(64.dp))
        } else {
            LazyRow(Modifier.fillMaxSize()) {
                itemsIndexed(images) { _, image -> AsyncImage(image, contentDescription = product.name, modifier = Modifier.fillParentMaxWidth().fillMaxSize(), contentScale = ContentScale.Crop) }
            }
            Box(Modifier.fillMaxSize().background(Color.Black.copy(alpha = .08f)))
            if (images.size > 1) {
                Row(Modifier.align(Alignment.BottomCenter).padding(bottom = 18.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    repeat(images.size.coerceAtMost(6)) { Box(Modifier.size(if (it == 0) 18.dp else 6.dp, 6.dp).background(Color.White.copy(alpha = if (it == 0) 1f else .6f), CircleShape)) }
                }
            }
        }
    }
}

@Composable
private fun ProductInfoCard(product: StoreProduct) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 20.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("عن المنتج", color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            Text(product.description.ifBlank { "باقة فاخرة مختارة بعناية لتناسب مناسباتك الجميلة وتصل إليك بتغليف أنيق." }, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium, maxLines = 3, overflow = TextOverflow.Ellipsis)
            Text("المميزات", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Column(verticalArrangement = Arrangement.spacedBy(7.dp)) {
                CompactFeature("تغليف فاخر", "هدية جاهزة")
                CompactFeature("جودة مضمونة", "اختيار بعناية")
                CompactFeature("توصيل سريع", product.deliveryDays?.let { "$it أيام" } ?: "حسب المنطقة")
            }
        }
    }
}

@Composable
private fun CompactFeature(title: String, detail: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(Icons.Rounded.Check, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(18.dp))
        Text(title, color = FuchsiaColors.Ink, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text("· $detail", color = FuchsiaColors.Muted, fontSize = 11.sp)
    }
}

@Composable
private fun TagChip(tag: String) {
    Surface(shape = RoundedCornerShape(12.dp), color = FuchsiaColors.White, contentColor = FuchsiaColors.Primary, border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line)) {
        Text(tag, modifier = Modifier.padding(horizontal = 11.dp, vertical = 6.dp), fontSize = 11.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun CircleAction(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(44.dp).background(FuchsiaColors.White.copy(alpha = .94f), CircleShape)) { Icon(icon, contentDescription = description, tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp)) }
}

@Composable
private fun QuantityStepper(quantity: Int, maxQuantity: Int = Int.MAX_VALUE, onDecrease: () -> Unit, onIncrease: () -> Unit) {
    Surface(shape = RoundedCornerShape(16.dp), color = FuchsiaColors.RoseLight) {
        Row(Modifier.padding(horizontal = 4.dp, vertical = 4.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            IconButton(onClick = onDecrease, modifier = Modifier.size(48.dp)) { Icon(Icons.Rounded.Remove, contentDescription = "تقليل الكمية", tint = FuchsiaColors.Primary, modifier = Modifier.size(22.dp)) }
            Text(quantity.toString(), color = FuchsiaColors.Ink, fontWeight = FontWeight.ExtraBold, modifier = Modifier.width(30.dp), textAlign = TextAlign.Center)
            IconButton(onClick = onIncrease, enabled = quantity < maxQuantity, modifier = Modifier.size(48.dp)) { Icon(Icons.Rounded.Add, contentDescription = "زيادة الكمية", tint = FuchsiaColors.Primary, modifier = Modifier.size(22.dp)) }
        }
    }
}
