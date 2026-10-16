package com.fuchsia.partner

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Business
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.Event
import androidx.compose.material.icons.rounded.Image
import androidx.compose.material.icons.rounded.Inventory2
import androidx.compose.material.icons.rounded.OpenInNew
import androidx.compose.material.icons.rounded.Phone
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.TableBar
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

private const val MAX_PRODUCT_IMAGES = 8

@Composable
internal fun RentalPartnerHub(
    token: String?,
    stores: List<PartnerStore>,
    preview: Boolean,
    onMessage: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    var selectedStoreId by remember(stores) { mutableIntStateOf(stores.firstOrNull()?.id ?: 0) }
    val selectedStore = stores.firstOrNull { it.id == selectedStoreId } ?: stores.firstOrNull()
    var activeTab by remember { mutableIntStateOf(0) }
    var products by remember(preview, selectedStoreId) { mutableStateOf(emptyList<PartnerRentalProduct>()) }
    var bookings by remember(preview, selectedStoreId) { mutableStateOf(emptyList<PartnerRentalBooking>()) }
    var maintenance by remember(preview, selectedStoreId) { mutableStateOf(emptyList<PartnerMaintenanceBlock>()) }
    var categories by remember { mutableStateOf(emptyList<PartnerCategory>()) }
    var loading by remember { mutableStateOf(false) }
    var productsError by remember { mutableStateOf("") }
    var bookingsError by remember { mutableStateOf("") }
    var maintenanceError by remember { mutableStateOf("") }
    var lastUpdatedAt by remember { mutableStateOf<Long?>(null) }
    var refreshKey by remember { mutableIntStateOf(0) }
    var editorVisible by remember { mutableStateOf(false) }
    var editingProduct by remember { mutableStateOf<PartnerRentalProduct?>(null) }
    var selectedBooking by remember { mutableStateOf<PartnerRentalBooking?>(null) }
    var workingOrderId by remember { mutableIntStateOf(0) }
    var storeMenu by remember { mutableStateOf(false) }

    LaunchedEffect(token, selectedStoreId, preview, refreshKey) {
        if (preview) {
            products = demoRentalProducts()
            bookings = demoRentalBookings()
            categories = demoRentalCategories()
            loading = false
            productsError = ""
            bookingsError = ""
            maintenanceError = ""
        } else {
            val auth = token
            val storeId = selectedStore?.id
            if (auth == null || storeId == null) {
                products = emptyList()
                bookings = emptyList()
                loading = false
                return@LaunchedEffect
            }
            loading = true
            productsError = ""
            bookingsError = ""
            maintenanceError = ""
            lastUpdatedAt = null
            var loadedAny = false
            runCatching { PartnerRentalApi.products(auth, storeId) }
                .onSuccess { products = it; loadedAny = true }
                .onFailure { productsError = it.message ?: "تعذر تحميل كتالوج الإيجار" }
            runCatching { PartnerRentalApi.bookings(auth, storeId) }
                .onSuccess { bookings = it; loadedAny = true }
                .onFailure { bookingsError = it.message ?: "تعذر تحميل حجوزات الإيجار" }
            runCatching { PartnerRentalApi.maintenance(auth, storeId, SimpleDateFormat("yyyy-MM", Locale.US).format(Calendar.getInstance().time)) }
                .onSuccess { maintenance = it; loadedAny = true }
                .onFailure { maintenanceError = it.message ?: "تعذر تحميل فترات الصيانة" }
            runCatching { PartnerRentalApi.categories() }.onSuccess { categories = it; loadedAny = true }.onFailure { categories = emptyList() }
            if (loadedAny) lastUpdatedAt = System.currentTimeMillis()
            loading = false
        }
    }

    Column(modifier.fillMaxWidth()) {
        if (stores.size > 1 && selectedStore != null) {
            Box {
                OutlinedButton(onClick = { storeMenu = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(14.dp)) {
                    Icon(Icons.Rounded.Business, null, Modifier.size(18.dp))
                    Text(selectedStore.name, modifier = Modifier.weight(1f).padding(horizontal = 8.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    Text("تغيير")
                }
                DropdownMenu(expanded = storeMenu, onDismissRequest = { storeMenu = false }) {
                    stores.forEach { store ->
                        DropdownMenuItem(text = { Text(store.name) }, onClick = { selectedStoreId = store.id; storeMenu = false })
                    }
                }
            }
        } else if (selectedStore != null) {
            Text(selectedStore.name, fontWeight = FontWeight.Bold, fontSize = 16.sp, modifier = Modifier.padding(vertical = 4.dp))
        }

        if (preview) {
            RentalNotice("بيانات معاينة فقط؛ لا تُرفع صور ولا تُحفظ منتجات أو قرارات حجز حقيقية.")
        } else {
            Text("إدارة كتالوج التأجير والطلبات. قبول الطلب يعني تأكيد التوفر فقط، ولا يعتمد الدفعة المالية.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, modifier = Modifier.padding(bottom = 8.dp))
            lastUpdatedAt?.let { timestamp ->
                Text(
                    "آخر تحديث ناجح: ${SimpleDateFormat("HH:mm", Locale.US).format(Date(timestamp))}",
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    fontSize = 10.sp,
                    modifier = Modifier.padding(bottom = 6.dp),
                )
            }
        }

        Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()).padding(bottom = 8.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            FilterChip(selected = activeTab == 0, onClick = { activeTab = 0 }, label = { Text("الكوش والطاولات") }, leadingIcon = { Icon(Icons.Rounded.Inventory2, null, Modifier.size(18.dp)) })
            FilterChip(selected = activeTab == 1, onClick = { activeTab = 1 }, label = { Text("طلبات الإيجار ${bookings.count { it.status == "rental_pending_confirmation" }}") }, leadingIcon = { Icon(Icons.Rounded.Event, null, Modifier.size(18.dp)) })
            FilterChip(selected = activeTab == 2, onClick = { activeTab = 2 }, label = { Text("الصيانة ${maintenance.size}") }, leadingIcon = { Icon(Icons.Rounded.Event, null, Modifier.size(18.dp)) })
            IconButton(onClick = { refreshKey++ }, enabled = !loading) {
                if (loading) CircularProgressIndicator(Modifier.size(18.dp), strokeWidth = 2.dp)
                else Icon(Icons.Rounded.Refresh, contentDescription = "تحديث")
            }
        }

        val activeError = when (activeTab) { 0 -> productsError; 1 -> bookingsError; else -> maintenanceError }
        if (activeError.isNotBlank()) {
            RentalNotice(activeError, isError = true)
            OutlinedButton(onClick = { refreshKey++ }, modifier = Modifier.fillMaxWidth()) { Icon(Icons.Rounded.Refresh, null); Text("إعادة المحاولة", modifier = Modifier.padding(start = 6.dp)) }
        } else if (loading && products.isEmpty() && bookings.isEmpty()) {
            Box(Modifier.fillMaxWidth().padding(vertical = 28.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator() }
        } else if (activeTab == 0) {
            RentalProductsList(
                products = products,
                loading = loading,
                modifier = Modifier.weight(1f),
                onAdd = { editingProduct = null; editorVisible = true },
                onEdit = { editingProduct = it; editorVisible = true },
                onTogglePublish = { product ->
                    if (preview) onMessage("المعاينة لا تحفظ تغييرات حقيقية")
                    else scope.launch {
                        val auth = token ?: return@launch
                        workingOrderId = product.id
                        runCatching { PartnerRentalApi.updateProduct(auth, product.id, JSONObject().put("isPublished", !product.isPublished)) }
                            .onSuccess { refreshKey++ }
                            .onFailure { onMessage(it.message ?: "تعذر تحديث حالة النشر") }
                        workingOrderId = 0
                    }
                },
                busyProductId = workingOrderId,
            )
        } else if (activeTab == 1) {
            RentalBookingsList(bookings, modifier = Modifier.weight(1f), onOpen = { selectedBooking = it })
        } else {
            RentalMaintenanceManager(
                products = products, blocks = maintenance, modifier = Modifier.weight(1f),
                onAdd = { productId, startDate, endDate, quantity, reason ->
                    if (preview) onMessage("المعاينة لا تحفظ فترات الصيانة")
                    else scope.launch {
                        val auth = token ?: return@launch
                        val storeId = selectedStore?.id ?: return@launch
                        runCatching { PartnerRentalApi.addMaintenance(auth, storeId, productId, startDate, endDate, quantity, reason) }
                            .onSuccess { onMessage("تم تسجيل فترة الصيانة وإعادة حساب التوفر"); refreshKey++ }
                            .onFailure { onMessage(it.message ?: "تعذر تسجيل الصيانة") }
                    }
                },
                onDelete = { blockId ->
                    if (preview) onMessage("المعاينة لا تحذف فترات الصيانة")
                    else scope.launch {
                        val auth = token ?: return@launch
                        runCatching { PartnerRentalApi.deleteMaintenance(auth, blockId) }
                            .onSuccess { onMessage("تم حذف فترة الصيانة"); refreshKey++ }
                            .onFailure { onMessage(it.message ?: "تعذر حذف الصيانة") }
                    }
                },
            )
        }
    }

    if (editorVisible && selectedStore != null) {
        RentalProductEditor(
            token = token,
            storeId = selectedStore.id,
            categories = categories,
            existing = editingProduct,
            preview = preview,
            onDismiss = { editorVisible = false },
            onMessage = onMessage,
            onSaved = { refreshKey++ },
        )
    }

    selectedBooking?.let { booking ->
        RentalBookingDialog(
            booking = booking,
            preview = preview,
            busy = workingOrderId == booking.id,
            onDismiss = { selectedBooking = null },
            onDecision = { decision, reason ->
                if (preview) onMessage("المعاينة لا ترسل قرارًا حقيقيًا")
                else scope.launch {
                    val auth = token ?: return@launch
                    val storeId = selectedStore?.id ?: return@launch
                    workingOrderId = booking.id
                    runCatching { PartnerRentalApi.decideBooking(auth, storeId, booking.id, decision, reason) }
                        .onSuccess {
                            selectedBooking = null
                            onMessage(when (decision) {
                                "confirmed" -> "تم تأكيد التوفر وإشعار العميل"
                                "preparing" -> "تم تسجيل بدء تجهيز الإيجار وإشعار العميل"
                                "out" -> "تم تسجيل تسليم الإيجار وإشعار العميل"
                                "returned" -> "تم تسجيل استرجاع الإيجار وإشعار العميل"
                                else -> "تم رفض الطلب وإشعار العميل بالسبب"
                            })
                            refreshKey++
                        }
                        .onFailure { onMessage(it.message ?: "تعذر تحديث الحجز") }
                    workingOrderId = 0
                }
            },
            onChangeRequestDecision = { requestId, decision, note ->
                if (preview) onMessage("المعاينة لا ترسل قرارًا حقيقيًا")
                else scope.launch {
                    val auth = token ?: return@launch
                    val storeId = selectedStore?.id ?: return@launch
                    workingOrderId = booking.id
                    runCatching { PartnerRentalApi.decideChangeRequest(auth, storeId, booking.id, requestId, decision, note) }
                        .onSuccess {
                            onMessage(if (decision == "approve") "تمت الموافقة على طلب العميل وتحديث الحجز" else "تم رفض طلب العميل وإشعاره بالسبب")
                            refreshKey++
                        }
                        .onFailure { onMessage(it.message ?: "تعذر حفظ قرار طلب التغيير") }
                    workingOrderId = 0
                }
            },
        )
    }
}

@Composable
private fun RentalProductsList(
    products: List<PartnerRentalProduct>,
    loading: Boolean,
    modifier: Modifier = Modifier,
    onAdd: () -> Unit,
    onEdit: (PartnerRentalProduct) -> Unit,
    onTogglePublish: (PartnerRentalProduct) -> Unit,
    busyProductId: Int,
) {
    Column(modifier.fillMaxWidth()) {
        Button(onClick = onAdd, modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp), shape = RoundedCornerShape(14.dp)) {
            Icon(Icons.Rounded.Add, null); Text("إضافة كوش أو طاولات", modifier = Modifier.padding(start = 7.dp), fontWeight = FontWeight.Bold)
        }
        if (products.isEmpty() && !loading) {
            EmptyRentalState("لا توجد منتجات إيجار بعد", "أضف الكوش أو الطاولات مع الصور والسعر والكمية لتظهر للعملاء.", Icons.Rounded.Inventory2)
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f).fillMaxWidth(),
                contentPadding = PaddingValues(bottom = 28.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(products, key = { it.id }) { product ->
                    RentalProductCard(product, busyProductId == product.id, onClick = { onEdit(product) }, onTogglePublish = { onTogglePublish(product) })
                }
            }
        }
    }
}

@Composable
private fun RentalProductCard(product: PartnerRentalProduct, busy: Boolean, onClick: () -> Unit, onTogglePublish: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth().clickable(onClick = onClick),
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Row(Modifier.fillMaxWidth().padding(12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.Top) {
            val image = product.images.firstOrNull().takeUnless { it.isNullOrBlank() } ?: product.imageUrl
            Box(Modifier.size(88.dp).clip(RoundedCornerShape(14.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                if (image.isNotBlank()) AsyncImage(image, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(if (product.rentalCategory == "table") Icons.Rounded.TableBar else Icons.Rounded.Event, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(34.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(product.name.ifBlank { "منتج إيجار" }, modifier = Modifier.weight(1f), fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Text(if (product.isPublished) "منشور" else "مسودة", color = if (product.isPublished) Color(0xFF21815D) else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
                Text("${if (product.rentalCategory == "table") "طاولات مناسبات" else "كوش أعراس"} · ${rentAudienceLabel(product.audience)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                Text("${rentMoney(product.dailyPrice)} ر.ي / يوم", color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.ExtraBold)
                val specification = buildList {
                    add("الكمية ${product.stockQuantity}")
                    if (product.bufferDays > 0) add("مهلة تجهيز ${product.bufferDays} يوم")
                    if (product.tableHeightCm != null) add("الارتفاع ${rentNumber(product.tableHeightCm)} سم")
                    if (product.tableWidthCm != null && product.tableLengthCm != null) add("المقاس ${rentNumber(product.tableWidthCm)} × ${rentNumber(product.tableLengthCm)} سم")
                    if (product.tableDiameterCm != null) add("القطر ${rentNumber(product.tableDiameterCm)} سم")
                    if (product.tableSeats != null) add("${product.tableSeats} مقعد")
                    if (product.colors.isNotEmpty()) add(product.colors.take(3).joinToString("، "))
                }.joinToString(" · ")
                Text(specification, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 10.sp, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Row(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(onClick = onClick, contentPadding = PaddingValues(horizontal = 5.dp, vertical = 0.dp)) { Text("تعديل") }
                    TextButton(onClick = onTogglePublish, enabled = !busy, contentPadding = PaddingValues(horizontal = 5.dp, vertical = 0.dp)) {
                        if (busy) CircularProgressIndicator(Modifier.size(14.dp), strokeWidth = 2.dp)
                        else Text(if (product.isPublished) "إيقاف النشر" else "نشر")
                    }
                }
            }
        }
    }
}

@Composable
private fun RentalProductEditor(
    token: String?,
    storeId: Int,
    categories: List<PartnerCategory>,
    existing: PartnerRentalProduct?,
    preview: Boolean,
    onDismiss: () -> Unit,
    onMessage: (String) -> Unit,
    onSaved: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var name by remember(existing?.id) { mutableStateOf(existing?.name.orEmpty()) }
    var description by remember(existing?.id) { mutableStateOf(existing?.description.orEmpty()) }
    var rentalCategory by remember(existing?.id) { mutableStateOf(existing?.rentalCategory?.takeIf { it == "table" } ?: "kosh") }
    var audience by remember(existing?.id) { mutableStateOf(existing?.audience?.takeIf { it in setOf("women", "men", "both") } ?: "both") }
    var categoryId by remember(existing?.id, categories) { mutableIntStateOf(existing?.categoryId ?: categories.firstOrNull()?.id ?: 0) }
    var price by remember(existing?.id) { mutableStateOf(existing?.dailyPrice?.let(::rentNumber).orEmpty()) }
    var deposit by remember(existing?.id) { mutableStateOf(existing?.deposit?.let(::rentNumber)?.takeIf { it != "0" }.orEmpty()) }
    var quantity by remember(existing?.id) { mutableStateOf(existing?.stockQuantity?.takeIf { it > 0 }?.toString() ?: "1") }
    var height by remember(existing?.id) { mutableStateOf(existing?.tableHeightCm?.let(::rentNumber).orEmpty()) }
    var width by remember(existing?.id) { mutableStateOf(existing?.tableWidthCm?.let(::rentNumber).orEmpty()) }
    var length by remember(existing?.id) { mutableStateOf(existing?.tableLengthCm?.let(::rentNumber).orEmpty()) }
    var diameter by remember(existing?.id) { mutableStateOf(existing?.tableDiameterCm?.let(::rentNumber).orEmpty()) }
    var seats by remember(existing?.id) { mutableStateOf(existing?.tableSeats?.takeIf { it > 0 }?.toString().orEmpty()) }
    var setupNotes by remember(existing?.id) { mutableStateOf(existing?.setupNotes.orEmpty()) }
    var minDays by remember(existing?.id) { mutableStateOf(existing?.minDays?.coerceAtLeast(1)?.toString() ?: "1") }
    var maxDays by remember(existing?.id) { mutableStateOf(existing?.maxDays?.coerceAtLeast(1)?.toString() ?: "3") }
    var bufferDays by remember(existing?.id) { mutableStateOf(existing?.bufferDays?.coerceAtLeast(0)?.toString() ?: "0") }
    var colorsText by remember(existing?.id) { mutableStateOf(existing?.colors?.joinToString("، ").orEmpty()) }
    var imageUrls by remember(existing?.id) { mutableStateOf((existing?.images.orEmpty() + listOfNotNull(existing?.imageUrl?.takeIf(String::isNotBlank))).distinct().take(MAX_PRODUCT_IMAGES)) }
    var busy by remember { mutableStateOf(false) }
    var formError by remember { mutableStateOf("") }
    var uploadStatus by remember { mutableStateOf("") }
    var categoryMenu by remember { mutableStateOf(false) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.GetMultipleContents()) { uris ->
        if (uris.isNotEmpty()) {
            if (preview) onMessage("رفع الصور غير متاح في وضع المعاينة")
            else scope.launch {
                val auth = token ?: return@launch
                busy = true
                val remaining = (MAX_PRODUCT_IMAGES - imageUrls.size).coerceAtLeast(0)
                if (remaining == 0) {
                    onMessage("الحد الأعلى $MAX_PRODUCT_IMAGES صور للمنتج")
                } else {
                    val selected = uris.take(remaining)
                    selected.forEachIndexed { index, uri ->
                        uploadStatus = "رفع الصورة ${index + 1} من ${selected.size}…"
                        runCatching { PartnerRentalApi.uploadImage(context, uri, auth, storeId) }
                            .onSuccess { url -> imageUrls = (imageUrls + url).distinct().take(MAX_PRODUCT_IMAGES) }
                            .onFailure { onMessage(it.message ?: "تعذر رفع الصورة") }
                    }
                }
                uploadStatus = ""
                busy = false
            }
        }
    }

    Dialog(onDismissRequest = { if (!busy) onDismiss() }) {
        Surface(shape = RoundedCornerShape(22.dp), color = MaterialTheme.colorScheme.surface, modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth().height(640.dp).padding(18.dp)) {
                Text(if (existing == null) "إضافة منتج إيجار" else "تعديل منتج الإيجار", fontWeight = FontWeight.ExtraBold, fontSize = 19.sp)
                Text("أدخل تفاصيل العرض كما ستظهر للعميل.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp, modifier = Modifier.padding(top = 3.dp, bottom = 10.dp))
                Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    OutlinedTextField(name, { name = it }, Modifier.fillMaxWidth(), label = { Text("اسم المنتج") }, singleLine = true)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = rentalCategory == "kosh", onClick = { rentalCategory = "kosh" }, label = { Text("كوش أعراس") })
                        FilterChip(selected = rentalCategory == "table", onClick = { rentalCategory = "table" }, label = { Text("طاولات مناسبات") })
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        FilterChip(selected = audience == "women", onClick = { audience = "women" }, label = { Text("نسائي") })
                        FilterChip(selected = audience == "men", onClick = { audience = "men" }, label = { Text("رجالي") })
                        FilterChip(selected = audience == "both", onClick = { audience = "both" }, label = { Text("كلاهما") })
                    }
                    Box {
                        OutlinedButton(onClick = { categoryMenu = true }, enabled = existing == null, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                            Text(categories.firstOrNull { it.id == categoryId }?.name ?: "اختر تصنيف العرض", modifier = Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Start)
                            Text("⌄")
                        }
                        DropdownMenu(expanded = categoryMenu && existing == null, onDismissRequest = { categoryMenu = false }) {
                            categories.forEach { category -> DropdownMenuItem(text = { Text(category.name) }, onClick = { categoryId = category.id; categoryMenu = false }) }
                        }
                    }
                    if (categories.isEmpty()) RentalNotice("لا توجد تصنيفات على الخادم. أضف تصنيف الكوش أو الطاولات من لوحة الإدارة أولًا.", isError = true)
                    OutlinedTextField(description, { description = it }, Modifier.fillMaxWidth(), label = { Text("وصف مختصر") }, minLines = 2, maxLines = 4)
                    OutlinedTextField(price, { price = it }, Modifier.fillMaxWidth(), label = { Text("سعر الإيجار لليوم (ر.ي)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    OutlinedTextField(deposit, { deposit = it }, Modifier.fillMaxWidth(), label = { Text("مبلغ التأمين (اختياري)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                    OutlinedTextField(quantity, { quantity = it }, Modifier.fillMaxWidth(), label = { Text(if (rentalCategory == "table") "عدد الطاولات المتاحة" else "عدد الكوش المتاحة") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    if (rentalCategory == "table") {
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(width, { width = it }, Modifier.weight(1f), label = { Text("العرض (سم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                            OutlinedTextField(length, { length = it }, Modifier.weight(1f), label = { Text("الطول (سم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(height, { height = it }, Modifier.weight(1f), label = { Text("الارتفاع (سم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                            OutlinedTextField(diameter, { diameter = it }, Modifier.weight(1f), label = { Text("القطر إن كانت دائرية (سم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal))
                        }
                        OutlinedTextField(seats, { seats = it }, Modifier.fillMaxWidth(), label = { Text("عدد المقاعد/الأشخاص") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                        OutlinedTextField(colorsText, { colorsText = it }, Modifier.fillMaxWidth(), label = { Text("الألوان المتوفرة، افصل بينها بفاصلة") }, singleLine = true)
                        OutlinedTextField(setupNotes, { setupNotes = it }, Modifier.fillMaxWidth(), label = { Text("ملاحظات التجهيز والتركيب") }, minLines = 2, maxLines = 4)
                    } else {
                        OutlinedTextField(colorsText, { colorsText = it }, Modifier.fillMaxWidth(), label = { Text("الألوان/التنسيقات المتوفرة") }, singleLine = true)
                        OutlinedTextField(setupNotes, { setupNotes = it }, Modifier.fillMaxWidth(), label = { Text("ملاحظات التجهيز والتركيب") }, minLines = 2, maxLines = 4)
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(minDays, { minDays = it }, Modifier.weight(1f), label = { Text("أقل مدة (يوم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                        OutlinedTextField(maxDays, { maxDays = it }, Modifier.weight(1f), label = { Text("أقصى مدة (يوم)") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    }
                    OutlinedTextField(bufferDays, { bufferDays = it }, Modifier.fillMaxWidth(), label = { Text("مهلة التجهيز بعد الحجز (أيام، 0–14)") }, supportingText = { Text("تمنع حجز المنتج خلال فترة التنظيف/التجهيز التالية.") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                    Text("صور المنتج · ${imageUrls.size}/$MAX_PRODUCT_IMAGES", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                    Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        imageUrls.forEachIndexed { index, url ->
                            Box(Modifier.size(76.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant)) {
                                AsyncImage(url, "صورة المنتج", Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                                TextButton(onClick = { imageUrls = imageUrls.filterIndexed { i, _ -> i != index } }, modifier = Modifier.align(Alignment.BottomEnd).background(Color.Black.copy(alpha = .55f)), contentPadding = PaddingValues(horizontal = 4.dp, vertical = 0.dp)) { Text("×", color = Color.White) }
                            }
                        }
                        OutlinedButton(onClick = { picker.launch("image/*") }, enabled = !busy && imageUrls.size < MAX_PRODUCT_IMAGES, modifier = Modifier.size(76.dp), contentPadding = PaddingValues(2.dp), shape = RoundedCornerShape(12.dp)) {
                            Icon(Icons.Rounded.CloudUpload, null); Text("صور", fontSize = 10.sp)
                        }
                    }
                    if (uploadStatus.isNotBlank()) Text(uploadStatus, color = MaterialTheme.colorScheme.primary, fontSize = 12.sp)
                    if (formError.isNotBlank()) RentalNotice(formError, isError = true)
                }
                Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    TextButton(onClick = onDismiss, enabled = !busy) { Text("إلغاء") }
                    Button(onClick = {
                        val dailyPrice = rentParseNumber(price)
                        val depositAmount = rentParseNumber(deposit).coerceAtLeast(0.0)
                        val stock = rentParseInt(quantity)
                        val min = rentParseInt(minDays)
                        val max = rentParseInt(maxDays)
                        val buffer = rentParseInt(bufferDays)
                        val tableHeight = rentParseNumber(height)
                        val tableWidth = rentParseNumber(width)
                        val tableLength = rentParseNumber(length)
                        val tableDiameter = rentParseNumber(diameter)
                        val tableSeats = rentParseInt(seats)
                        val colors = colorsText.split(',', '،', ';').map(String::trim).filter(String::isNotBlank).distinct().take(20)
                        formError = when {
                            name.isBlank() -> "اكتب اسم المنتج"
                            categoryId <= 0 -> "اختر تصنيف العرض من القائمة"
                            dailyPrice <= 0 -> "أدخل سعر إيجار يومي صحيح"
                            stock < 1 -> "أدخل كمية متاحة واحدة على الأقل"
                            min < 1 || max < min -> "تحقق من أقل وأقصى مدة للإيجار"
                            buffer !in 0..14 -> "مهلة التجهيز يجب أن تكون بين 0 و14 يومًا"
                            rentalCategory == "table" && tableHeight <= 0 -> "أدخل ارتفاع الطاولة بالسنتيمتر"
                            rentalCategory == "table" && tableSeats < 1 -> "أدخل عدد المقاعد أو الأشخاص"
                            rentalCategory == "table" && tableWidth <= 0 && tableDiameter <= 0 -> "أدخل عرض الطاولة وطولها أو قطرها"
                            rentalCategory == "table" && tableDiameter <= 0 && tableLength <= 0 -> "أدخل طول الطاولة أو قطرها"
                            rentalCategory == "table" && colors.isEmpty() -> "أدخل لونًا واحدًا على الأقل للطاولات"
                            imageUrls.isEmpty() -> "أضف صورة واحدة على الأقل قبل الحفظ"
                            else -> ""
                        }
                        if (formError.isNotBlank()) return@Button
                        if (preview) { onMessage("المعاينة لا تحفظ المنتجات"); return@Button }
                        val auth = token ?: run { formError = "انتهت الجلسة، سجّل الدخول مجددًا"; return@Button }
                        busy = true
                        scope.launch {
                            val images = JSONArray().apply { imageUrls.forEach(::put) }
                            val payload = JSONObject()
                                .put("storeId", storeId)
                                .put("categoryId", categoryId)
                                .put("nameAr", name.trim())
                                .put("description", description.trim())
                                .put("price", dailyPrice)
                                .put("imageUrl", imageUrls.firstOrNull().orEmpty())
                                .put("images", images.toString())
                                .put("fulfillmentType", "rental")
                                .put("rentalCategory", rentalCategory)
                                .put("eventAudience", audience)
                                .put("rentalDailyPrice", dailyPrice)
                                .put("rentalDeposit", depositAmount)
                                .put("rentalMinDays", min)
                                .put("rentalMaxDays", max)
                                .put("rentalBufferDays", buffer)
                                .put("tableHeightCm", if (rentalCategory == "table") tableHeight else JSONObject.NULL)
                                .put("tableWidthCm", if (rentalCategory == "table" && tableWidth > 0) tableWidth else JSONObject.NULL)
                                .put("tableLengthCm", if (rentalCategory == "table" && tableLength > 0) tableLength else JSONObject.NULL)
                                .put("tableDiameterCm", if (rentalCategory == "table" && tableDiameter > 0) tableDiameter else JSONObject.NULL)
                                .put("tableSeats", if (rentalCategory == "table") tableSeats else JSONObject.NULL)
                                .put("setupNotes", setupNotes.trim())
                                .put("availableColors", JSONArray(colors).toString())
                                .put("stockQuantity", stock)
                                .put("inStock", stock > 0)
                                .put("isPublished", true)
                                .put("tags", "[]")
                                .put("occasionTags", "[]")
                            try {
                                if (existing == null) {
                                    PartnerRentalApi.createProduct(auth, payload)
                                } else {
                                    PartnerRentalApi.updateProduct(auth, existing.id, payload)
                                }
                                onSaved()
                                onMessage("تم حفظ المنتج ونشره للعملاء مباشرة")
                                onDismiss()
                            } catch (failure: Exception) {
                                formError = failure.message ?: "تعذر حفظ المنتج"
                            } finally { busy = false }
                        }
                    }, enabled = !busy, shape = RoundedCornerShape(12.dp)) {
                        if (busy) CircularProgressIndicator(Modifier.size(17.dp), strokeWidth = 2.dp)
                        else Text(if (existing == null) "حفظ المنتج" else "حفظ التغييرات")
                    }
                }
            }
        }
    }
}

@Composable
private fun RentalBookingsList(bookings: List<PartnerRentalBooking>, modifier: Modifier = Modifier, onOpen: (PartnerRentalBooking) -> Unit) {
    if (bookings.isEmpty()) {
        EmptyRentalState("لا توجد طلبات إيجار", "ستظهر هنا حجوزات الكوش والطاولات الواردة من العملاء.", Icons.Rounded.Event)
        return
    }
    LazyColumn(modifier.fillMaxSize(), contentPadding = PaddingValues(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        items(bookings, key = { it.id }) { booking ->
            val item = booking.items.firstOrNull()
            Card(
                Modifier.fillMaxWidth().clickable { onOpen(booking) },
                shape = RoundedCornerShape(18.dp),
                border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
            ) {
                Row(Modifier.fillMaxWidth().padding(13.dp), horizontalArrangement = Arrangement.spacedBy(11.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(58.dp).clip(RoundedCornerShape(12.dp)).background(MaterialTheme.colorScheme.surfaceVariant), contentAlignment = Alignment.Center) {
                        if (!item?.imageUrl.isNullOrBlank()) AsyncImage(item?.imageUrl, null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                        else Icon(Icons.Rounded.Event, null, tint = MaterialTheme.colorScheme.primary)
                    }
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        Text("طلب #${booking.id} · ${item?.name ?: "حجز إيجار"}", fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                        Text("${item?.startDate?.let(::rentDate).orEmpty()} · ${item?.days ?: 1} يوم · عدد ${item?.quantity ?: 1}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Text(booking.customerName.ifBlank { "عميل" }, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        Text(rentBookingStatus(booking.status), color = if (booking.status == "rental_pending_confirmation") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }
                    Text("${rentMoney(booking.total)} ر.ي", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun RentalBookingDialog(
    booking: PartnerRentalBooking,
    preview: Boolean,
    busy: Boolean,
    onDismiss: () -> Unit,
    onDecision: (String, String) -> Unit,
    onChangeRequestDecision: (Int, String, String) -> Unit,
) {
    val context = LocalContext.current
    val uriHandler = LocalUriHandler.current
    val item = booking.items.firstOrNull()
    var rejectMode by remember(booking.id) { mutableStateOf(false) }
    var reason by remember(booking.id) { mutableStateOf("") }
    var changeRequestReason by remember(booking.id) { mutableStateOf("") }
    val pendingChangeRequest = booking.changeRequests.firstOrNull()
    val nextDecision = when (booking.status) {
        "rental_pending_confirmation" -> "confirmed"
        "rental_confirmed" -> "preparing"
        "rental_preparing" -> "out"
        "rental_out" -> "returned"
        else -> null
    }
    val nextDecisionLabel = when (nextDecision) {
        "confirmed" -> "تأكيد التوفر"
        "preparing" -> "بدء التجهيز"
        "out" -> "تأكيد التسليم للعميل"
        "returned" -> "تأكيد استرجاع الإيجار"
        else -> ""
    }
    AlertDialog(
        onDismissRequest = { if (!busy) onDismiss() },
        title = { Text("تفاصيل طلب الإيجار #${booking.id}", fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.fillMaxWidth().verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                if (!item?.imageUrl.isNullOrBlank()) AsyncImage(item?.imageUrl, null, Modifier.fillMaxWidth().height(150.dp).clip(RoundedCornerShape(14.dp)), contentScale = ContentScale.Crop)
                Text(item?.name ?: "عنصر إيجار", fontWeight = FontWeight.Bold)
                Text("التاريخ: ${item?.startDate?.let(::rentDate).orEmpty()} إلى ${item?.endDate?.let(::rentDate).orEmpty()}")
                Text("المدة: ${item?.days ?: 1} يوم · الكمية: ${item?.quantity ?: 1}")
                Text("التسليم: ${rentFulfillment(item?.fulfillment.orEmpty())} · ${rentTimeSlot(item?.timeSlot.orEmpty())}")
                Text("العميل: ${booking.customerName}")
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("الهاتف: ${booking.customerPhone}", modifier = Modifier.weight(1f))
                    IconButton(onClick = { runCatching { context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:${Uri.encode(booking.customerPhone)}"))) } }) { Icon(Icons.Rounded.Phone, "اتصال بالعميل") }
                }
                Text("قيمة الطلب: ${rentMoney(booking.total)} ر.ي")
                Text("الدفعة: ${rentMoney(booking.paymentAmount)} ر.ي · ${rentPaymentStatus(booking.paymentStatus)}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
                if (!booking.transactionReference.isNullOrBlank()) Text("رقم العملية: ${booking.transactionReference}")
                if (booking.notes?.isNotBlank() == true) Text("ملاحظات العميل: ${booking.notes}")
                pendingChangeRequest?.let { changeRequest ->
                    HorizontalDivider()
                    Text(if (changeRequest.type == "cancel") "طلب العميل: إلغاء الإيجار" else "طلب العميل: تغيير موعد الإيجار", fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                    if (changeRequest.type == "reschedule") Text("التاريخ المطلوب: ${changeRequest.requestedStartDate.orEmpty()}")
                    if (!changeRequest.reason.isNullOrBlank()) Text("السبب: ${changeRequest.reason}")
                    Text("يبقى الموعد الأصلي كما هو حتى قبول الطلب. لا يوجد تعديل أو استرداد مالي تلقائي.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                    OutlinedTextField(changeRequestReason, { changeRequestReason = it.take(500) }, Modifier.fillMaxWidth(), label = { Text("ملاحظة للعميل عند القرار") }, minLines = 2, maxLines = 3)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Button(onClick = { onChangeRequestDecision(changeRequest.id, "approve", changeRequestReason.trim()) }, enabled = !busy, modifier = Modifier.weight(1f)) { Text("قبول الطلب") }
                        Button(onClick = { if (changeRequestReason.isNotBlank()) onChangeRequestDecision(changeRequest.id, "reject", changeRequestReason.trim()) }, enabled = !busy && changeRequestReason.isNotBlank(), modifier = Modifier.weight(1f), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("رفض الطلب") }
                    }
                }
                booking.paymentReceiptUrl?.let { url -> TextButton(onClick = { runCatching { uriHandler.openUri(url) } }) { Icon(Icons.Rounded.OpenInNew, null); Text("فتح إيصال الدفع", modifier = Modifier.padding(start = 5.dp)) } }
                RentalNotice("قرارك يؤكد توفر المنتج فقط. مراجعة الإيصال واعتماد الدفعة مسؤولية الإدارة.")
                Text("الحالة: ${rentBookingStatus(booking.status)}", fontWeight = FontWeight.Bold)
                if (rejectMode) {
                    OutlinedTextField(reason, { reason = it }, Modifier.fillMaxWidth(), label = { Text("سبب الرفض (مطلوب)") }, minLines = 2, maxLines = 4)
                    Button(onClick = { if (reason.isNotBlank()) onDecision("rejected", reason.trim()) }, enabled = !busy && reason.isNotBlank(), modifier = Modifier.fillMaxWidth(), colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)) { Text("تأكيد الرفض") }
                }
            }
        },
        confirmButton = {
            if (nextDecision != null && !rejectMode) {
                Button(onClick = { onDecision(nextDecision, "") }, enabled = !busy, colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)) {
                    if (busy) CircularProgressIndicator(Modifier.size(16.dp), strokeWidth = 2.dp) else Text(nextDecisionLabel)
                }
            }
        },
        dismissButton = {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                if (booking.status == "rental_pending_confirmation" && !rejectMode) TextButton(onClick = { rejectMode = true }, enabled = !busy) { Text("رفض الطلب", color = MaterialTheme.colorScheme.error) }
                TextButton(onClick = onDismiss, enabled = !busy) { Text("إغلاق") }
            }
        },
    )
}

@Composable
private fun RentalMaintenanceManager(
    products: List<PartnerRentalProduct>,
    blocks: List<PartnerMaintenanceBlock>,
    modifier: Modifier = Modifier,
    onAdd: (Int, String, String, Int, String) -> Unit,
    onDelete: (Int) -> Unit,
) {
    var showDialog by remember { mutableStateOf(false) }
    var productId by remember(products) { mutableIntStateOf(products.firstOrNull()?.id ?: 0) }
    var productMenu by remember { mutableStateOf(false) }
    var startDate by remember { mutableStateOf("") }
    var endDate by remember { mutableStateOf("") }
    var quantity by remember { mutableStateOf("1") }
    var reason by remember { mutableStateOf("") }
    var error by remember { mutableStateOf("") }
    Column(modifier.fillMaxWidth()) {
        RentalNotice("سجّل أيام الصيانة أو الإغلاق على المنتج والكمية المطلوبة. تُحتسب الصيانة ومهلة التجهيز والحجوزات معًا قبل قبول أي موعد.")
        Button(onClick = { error = ""; showDialog = true }, enabled = products.isNotEmpty(), modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp), shape = RoundedCornerShape(13.dp)) {
            Icon(Icons.Rounded.Add, null); Text("إضافة فترة صيانة", modifier = Modifier.padding(start = 6.dp))
        }
        if (products.isEmpty()) EmptyRentalState("لا توجد منتجات إيجار", "أضف منتج كوش أو طاولات أولًا لتسجيل صيانته.", Icons.Rounded.Inventory2)
        else if (blocks.isEmpty()) EmptyRentalState("لا توجد فترات صيانة قادمة", "ستظهر هنا فترات صيانة المنتجات المسجلة للشهر الحالي.", Icons.Rounded.Event)
        else LazyColumn(Modifier.weight(1f).fillMaxWidth(), contentPadding = PaddingValues(bottom = 28.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(blocks, key = { it.id }) { block ->
                Card(shape = RoundedCornerShape(15.dp), border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant), colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                    Row(Modifier.fillMaxWidth().padding(13.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            Text(block.productName, fontWeight = FontWeight.Bold)
                            Text("${rentDate(block.startDate)} – ${rentDate(block.endDate)} · كمية محجوبة ${block.quantity}", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                            if (!block.reason.isNullOrBlank()) Text(block.reason, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
                        }
                        TextButton(onClick = { onDelete(block.id) }) { Text("حذف", color = MaterialTheme.colorScheme.error) }
                    }
                }
            }
        }
    }
    if (showDialog) AlertDialog(
        onDismissRequest = { showDialog = false },
        title = { Text("تسجيل صيانة المنتج", fontWeight = FontWeight.Bold) },
        text = {
            Column(Modifier.verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Box {
                    OutlinedButton(onClick = { productMenu = true }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(12.dp)) {
                        Text(products.firstOrNull { it.id == productId }?.name ?: "اختر المنتج", modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
                    }
                    DropdownMenu(expanded = productMenu, onDismissRequest = { productMenu = false }) {
                        products.forEach { product -> DropdownMenuItem(text = { Text(product.name) }, onClick = { productId = product.id; productMenu = false }) }
                    }
                }
                OutlinedTextField(startDate, { startDate = it.take(10) }, Modifier.fillMaxWidth(), label = { Text("من تاريخ (YYYY-MM-DD)") }, singleLine = true)
                OutlinedTextField(endDate, { endDate = it.take(10) }, Modifier.fillMaxWidth(), label = { Text("إلى تاريخ (YYYY-MM-DD)") }, singleLine = true)
                OutlinedTextField(quantity, { quantity = it.filter(Char::isDigit).take(5) }, Modifier.fillMaxWidth(), label = { Text("الكمية المطلوب إغلاقها") }, singleLine = true, keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
                OutlinedTextField(reason, { reason = it.take(500) }, Modifier.fillMaxWidth(), label = { Text("سبب الصيانة (اختياري)") }, minLines = 2, maxLines = 3)
                if (error.isNotBlank()) RentalNotice(error, isError = true)
            }
        },
        confirmButton = {
            TextButton(onClick = {
                val count = quantity.toIntOrNull() ?: 0
                error = when {
                    productId <= 0 -> "اختر منتجًا"
                    !startDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) || !endDate.matches(Regex("\\d{4}-\\d{2}-\\d{2}")) || endDate < startDate -> "تحقق من تاريخ البداية والنهاية بصيغة YYYY-MM-DD"
                    count <= 0 -> "أدخل كمية صحيحة"
                    else -> ""
                }
                if (error.isBlank()) { onAdd(productId, startDate, endDate, count, reason); showDialog = false }
            }) { Text("تسجيل") }
        },
        dismissButton = { TextButton(onClick = { showDialog = false }) { Text("إلغاء") } },
    )
}

@Composable
private fun RentalNotice(message: String, isError: Boolean = false) {
    Card(
        modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp),
        shape = RoundedCornerShape(13.dp),
        colors = CardDefaults.cardColors(containerColor = if (isError) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.surfaceVariant),
    ) {
        Text(message, Modifier.padding(12.dp), color = if (isError) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp)
    }
}

@Composable
private fun EmptyRentalState(title: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(36.dp))
        Text(title, fontWeight = FontWeight.Bold)
        Text(subtitle, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 12.sp)
    }
}

private fun rentBookingStatus(status: String): String = when (status) {
    "rental_pending_confirmation" -> "بانتظار تأكيد التوفر"
    "rental_confirmed" -> "تم تأكيد التوفر"
    "rental_rejected" -> "مرفوض"
    "rental_preparing" -> "قيد التجهيز"
    "rental_out" -> "العنصر مع العميل"
    "rental_return_pending" -> "بانتظار الاسترجاع"
    "rental_returned" -> "تم الاسترجاع"
    "cancelled", "rental_cancelled" -> "ملغى"
    else -> status
}

private fun rentAudienceLabel(value: String) = when (value) { "women" -> "للنساء"; "men" -> "للرجال"; else -> "للجنسين" }
private fun rentFulfillment(value: String) = when (value) { "pickup" -> "استلام من المتجر"; "delivery" -> "توصيل"; else -> "حسب الاتفاق" }
private fun rentTimeSlot(value: String) = when (value) { "morning" -> "صباحًا"; "evening" -> "مساءً"; "all_day" -> "طوال اليوم"; else -> "" }
private fun rentPaymentStatus(value: String) = when (value) { "verified", "approved" -> "تمت المراجعة"; "rejected" -> "مرفوضة"; "pending_review" -> "بانتظار مراجعة الإدارة"; "unpaid" -> "غير مدفوعة"; else -> value }
private fun rentMoney(value: Double) = String.format(Locale("ar", "YE"), "%,.0f", value)
private fun rentNumber(value: Double) = if (value == value.toLong().toDouble()) value.toLong().toString() else String.format(Locale.US, "%.1f", value)
private fun rentParseNumber(input: String): Double {
    val normalized = buildString {
        input.trim().forEach { character -> append(when (character) {
            in '٠'..'٩' -> '0' + (character - '٠')
            in '۰'..'۹' -> '0' + (character - '۰')
            '٫', ',' -> '.'
            else -> character
        }) }
    }.filter { it.isDigit() || it == '.' || it == '-' }
    return normalized.toDoubleOrNull() ?: 0.0
}
private fun rentParseInt(input: String): Int = rentParseNumber(input).takeIf { it > 0 && it % 1.0 == 0.0 }?.toInt() ?: 0
private fun rentDate(value: String): String = runCatching {
    val date = SimpleDateFormat("yyyy-MM-dd", Locale.US).parse(value.substringBefore('T')) ?: return@runCatching value
    SimpleDateFormat("d MMM yyyy", Locale("ar", "YE")).format(date)
}.getOrDefault(value)

private fun demoRentalCategories() = listOf(PartnerCategory(1, "كوش الأعراس"), PartnerCategory(2, "طاولات المناسبات"))
private fun demoRentalProducts() = listOf(
    PartnerRentalProduct(-901, -901, "كوش ملكية بالورود الطبيعية", "تنسيق ملكي للزفاف", 1, "kosh", "women", 150000.0, 30000.0, 1, 3, null, listOf("أبيض", "ذهبي"), 1, true, true, "", emptyList()),
    PartnerRentalProduct(-902, -901, "طاولات مناسبات دائرية", "طاولات مع مفارش وألوان متعددة", 2, "table", "both", 12000.0, 2000.0, 1, 5, 75.0, listOf("أبيض", "ذهبي", "وردي"), 24, true, true, "", emptyList()),
)
private fun demoRentalBookings() = listOf(
    PartnerRentalBooking(-9901, "rental_pending_confirmation", "سارة محمد", "77XXXXXXX", 186000.0, 50000.0, "pending_review", null, "DEMO-REF-081", "حفل زفاف نسائي", listOf(PartnerRentalItem("كوش ملكية بالورود الطبيعية", 1, 150000.0, demoDate(12), 1, demoDate(12), "delivery", "evening", ""))),
    PartnerRentalBooking(-9902, "rental_confirmed", "عبدالله علي", "73XXXXXXX", 148000.0, 20000.0, "verified", null, "DEMO-REF-064", null, listOf(PartnerRentalItem("طاولات مناسبات دائرية", 8, 12000.0, demoDate(19), 1, demoDate(19), "pickup", "morning", ""))),
)
private fun demoDate(days: Int): String = java.text.SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, days) }.time)
