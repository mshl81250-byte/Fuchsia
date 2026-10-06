package com.fuchsia.platform.compose.ui.screens

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.CancellationSignal
import android.os.Handler
import android.os.Looper
import android.location.Location
import android.location.LocationManager
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.CheckCircle
import androidx.compose.material.icons.rounded.CloudUpload
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Switch
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.PaymentWallet
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.ShoppingCart
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.util.function.Consumer
import kotlin.math.ceil

@Composable
fun CheckoutScreen(
    initialGift: Boolean,
    onBack: () -> Unit,
    onOrderPlaced: (Int) -> Unit,
) {
    val context = LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val user = remember(context) { SessionVault.read(context)?.optJSONObject("user") }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }

    var cart by remember { mutableStateOf<ShoppingCart?>(null) }
    var wallets by remember { mutableStateOf<List<PaymentWallet>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var submitting by remember { mutableStateOf(false) }
    var uploading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var fullName by remember { mutableStateOf(user?.optString("fullName").orEmpty()) }
    var phone by remember { mutableStateOf(user?.optString("phone").orEmpty()) }
    var address by remember { mutableStateOf(user?.optString("address").orEmpty()) }
    var latitude by remember { mutableStateOf<Double?>(null) }
    var longitude by remember { mutableStateOf<Double?>(null) }
    var locating by remember { mutableStateOf(false) }
    var locationError by remember { mutableStateOf("") }
    var paymentType by remember { mutableStateOf("cash_on_delivery") }
    var selectedWalletId by remember { mutableStateOf<Int?>(null) }
    var transactionReference by remember { mutableStateOf("") }
    var receiptUrl by remember { mutableStateOf("") }
    var isGift by remember(initialGift) { mutableStateOf(initialGift) }
    var recipientName by remember { mutableStateOf("") }
    var giftMessage by remember { mutableStateOf("") }
    var hidePrice by remember { mutableStateOf(true) }

    LaunchedEffect(sessionId) {
        if (sessionId == null) {
            error = "انتهت الجلسة. يرجى تسجيل الدخول أو بدء التصفح دون حساب من جديد."
            loading = false
            return@LaunchedEffect
        }
        loading = true
        error = ""
        try {
            cart = FuchsiaApi.getCart(sessionId)
            wallets = runCatching { FuchsiaApi.paymentWallets() }.getOrDefault(emptyList())
            if (cart?.items.isNullOrEmpty()) error = "السلة فارغة. يرجى إضافة منتج قبل إتمام الطلب."
        } catch (failure: Throwable) {
            error = failure.message ?: "تعذر تحميل بيانات الطلب."
        } finally {
            loading = false
        }
    }

    fun applyCoordinates(latitudeValue: Double, longitudeValue: Double) {
        latitude = latitudeValue
        longitude = longitudeValue
        locating = false
        locationError = if (isSanaaLocation(latitudeValue, longitudeValue)) "" else "الموقع خارج نطاق التوصيل الحالي في صنعاء."
    }

    fun applyLocation(location: Location?) {
        locating = false
        if (location == null) {
            locationError = "تعذر تحديد الموقع الحالي. يرجى التحقق من خدمات الموقع، أو تحديد نقطة يدويًا على الخريطة."
            return
        }
        applyCoordinates(location.latitude, location.longitude)
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions(),
    ) { grants ->
        if (grants[Manifest.permission.ACCESS_FINE_LOCATION] == true || grants[Manifest.permission.ACCESS_COARSE_LOCATION] == true) {
            locating = true
            requestCurrentLocation(context, ::applyLocation)
        } else {
            locating = false
            locationError = "يلزم السماح بالوصول للموقع لاستخدام GPS. ويمكن اختيار النقطة يدويًا على الخريطة."
        }
    }

    fun locate() {
        val fine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        locating = true
        if (fine || coarse) requestCurrentLocation(context, ::applyLocation)
        else permissionLauncher.launch(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION))
    }

    var receiptUri by remember { mutableStateOf<Uri?>(null) }
    val receiptPicker = rememberLauncherForActivityResult(ActivityResultContracts.GetContent()) { uri ->
        receiptUri = uri
        if (uri != null) {
            scope.launch {
                uploading = true
                try {
                    receiptUrl = FuchsiaApi.uploadReceipt(context, uri).optString("url")
                    snackbar.showSnackbar("تم رفع الإيصال إلى الخادم")
                } catch (failure: Throwable) {
                    receiptUrl = ""
                    snackbar.showSnackbar(failure.message ?: "تعذر رفع الإيصال.")
                } finally {
                    uploading = false
                }
            }
        }
    }

    fun submitOrder() {
        val currentSession = sessionId
        val currentCart = cart
        if (currentSession == null || currentCart == null || currentCart.items.isEmpty()) {
            snackbarShown(scope, snackbar, "السلة فارغة أو الجلسة غير متاحة.")
            return
        }
        if (fullName.isBlank() || phone.isBlank() || address.isBlank()) {
            snackbarShown(scope, snackbar, "يرجى إدخال الاسم ورقم الهاتف وعنوان التوصيل.")
            return
        }
        if (latitude == null || longitude == null) {
            snackbarShown(scope, snackbar, "يرجى تحديد موقع التوصيل الحالي أولًا.")
            return
        }
        if (!isSanaaLocation(latitude!!, longitude!!)) {
            snackbarShown(scope, snackbar, "التوصيل متاح حاليًا داخل نطاق صنعاء فقط.")
            return
        }
        if (isGift && (recipientName.isBlank() || giftMessage.isBlank())) {
            snackbarShown(scope, snackbar, "يرجى إضافة اسم الشخص المستلم ورسالة الهدية.")
            return
        }
        if (paymentType != "cash_on_delivery" && (selectedWalletId == null || transactionReference.isBlank() || receiptUrl.isBlank())) {
            snackbarShown(scope, snackbar, "يرجى اختيار المحفظة وإدخال رقم العملية وإرفاق الإيصال.")
            return
        }

        val amount = when (paymentType) {
            "full" -> currentCart.total
            "partial" -> ceil(currentCart.total / 2.0)
            else -> 0.0
        }
        val walletId = selectedWalletId
        val payload = JSONObject()
            .put("sessionId", currentSession)
            .put("userId", SessionVault.userId(context) ?: JSONObject.NULL)
            .put("customerName", fullName.trim())
            .put("customerPhone", phone.trim())
            .put("deliveryAddress", address.trim())
            .put("deliveryLatitude", latitude)
            .put("deliveryLongitude", longitude)
            .put("paymentType", paymentType)
            .put("paymentMethod", if (paymentType == "cash_on_delivery") "cash_on_delivery" else "wallet_$walletId")
            .put("paymentWalletId", walletId ?: JSONObject.NULL)
            .put("paymentAmount", amount)
            .put("transactionReference", transactionReference.trim().takeIf { it.isNotBlank() } ?: JSONObject.NULL)
            .put("paymentReceiptUrl", receiptUrl.takeIf { it.isNotBlank() } ?: JSONObject.NULL)
            .put("isGift", isGift)
            .put("giftRecipientName", if (isGift) recipientName.trim() else JSONObject.NULL)
            .put("giftMessage", if (isGift) giftMessage.trim() else JSONObject.NULL)
            .put("giftCardStyle", if (isGift) "fuchsia-classic" else JSONObject.NULL)
            .put("hidePrice", isGift && hidePrice)

        scope.launch {
            submitting = true
            error = ""
            try {
                val order = FuchsiaApi.createOrder(payload)
                val orderId = order.optInt("id")
                if (orderId <= 0) throw IllegalStateException("لم يرجع الخادم رقم الطلب")
                onOrderPlaced(orderId)
            } catch (failure: Throwable) {
                error = failure.message ?: "تعذر إرسال الطلب."
                snackbar.showSnackbar(error)
            } finally {
                submitting = false
            }
        }
    }

    val outsideSanaa = latitude != null && longitude != null && !isSanaaLocation(latitude!!, longitude!!)

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            val total = cart?.total
            if (total != null && !cart?.items.isNullOrEmpty()) {
                androidx.compose.material3.Surface(color = FuchsiaColors.White, shadowElevation = 12.dp) {
                    Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 11.dp), verticalArrangement = Arrangement.spacedBy(7.dp)) {
                        CommerceMoneyRow("المطلوب", total, bold = true, accent = true)
                        CommercePrimaryButton(
                            text = "تأكيد الطلب · ${formatYemeniRiyal(total)}",
                            busy = submitting,
                            enabled = !loading && !uploading && !outsideSanaa,
                            onClick = ::submitOrder,
                        )
                    }
                }
            }
        },
    ) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = contentPadding.calculateTopPadding() + 7.dp, bottom = contentPadding.calculateBottomPadding() + 16.dp),
            verticalArrangement = Arrangement.spacedBy(11.dp),
        ) {
            item {
                CommerceHeader(
                    title = if (isGift) "إتمام الإهداء" else "إتمام الطلب",
                    subtitle = "خطوة آمنة لتأكيد الطلب مع فوشيا",
                    onBack = onBack,
                )
            }
            if (loading) {
                item { Box(Modifier.fillMaxWidth().padding(vertical = 30.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (cart != null && !cart?.items.isNullOrEmpty()) {
                item {
                    CommerceSectionTitle("بيانات المستلم", "تُستخدم للتواصل والتوصيل")
                    CommerceField(fullName, { fullName = it }, "الاسم الكامل")
                    CommerceField(phone, { phone = it }, "رقم الهاتف", keyboardType = KeyboardType.Phone)
                    CommerceField(address, { address = it }, "عنوان التوصيل بالتفصيل", minLines = 2, maxLines = 3, placeholder = "الحي، الشارع، أقرب معلم")
                }
                item {
                    CommerceSectionTitle("موقع التوصيل", "داخل صنعاء")
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                        border = BorderStroke(1.dp, if (outsideSanaa) FuchsiaColors.Error else FuchsiaColors.Line),
                    ) {
                        Column(Modifier.fillMaxWidth().padding(13.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary)
                                Column(Modifier.weight(1f)) {
                                    Text(
                                        if (latitude != null && longitude != null) "تم تحديد النقطة" else "لم يُحدد الموقع بعد",
                                        color = FuchsiaColors.Ink,
                                        fontWeight = FontWeight.Bold,
                                    )
                                    Text(
                                        if (latitude != null && longitude != null) "${"%.5f".format(latitude)}، ${"%.5f".format(longitude)}" else "نحتاج الموقع لاختيار نقطة التوصيل الصحيحة",
                                        color = FuchsiaColors.Muted,
                                        style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp),
                                    )
                                }
                            }
                            MapLocationPicker(
                                selectedLatitude = latitude,
                                selectedLongitude = longitude,
                                onConfirmLocation = ::applyCoordinates,
                            )
                            Button(
                                onClick = ::locate,
                                modifier = Modifier.fillMaxWidth().height(46.dp),
                                shape = RoundedCornerShape(13.dp),
                                enabled = !locating,
                                colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Rose),
                            ) {
                                if (locating) CircularProgressIndicator(modifier = Modifier.size(17.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                                else Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(18.dp))
                                Spacer(Modifier.width(6.dp))
                                Text(if (latitude == null) "تحديد موقعي الحالي عبر GPS" else "تحديث الموقع عبر GPS", color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold)
                            }
                            if (locationError.isNotBlank()) CommerceNotice(locationError, isError = true)
                            if (latitude != null && longitude != null && !outsideSanaa) CommerceNotice("الموقع ضمن نطاق التوصيل. يرجى مراجعة العنوان المكتوب أيضًا.")
                        }
                    }
                }
                item {
                    Card(
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                        border = BorderStroke(1.dp, FuchsiaColors.Line),
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth().padding(horizontal = 13.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(Icons.Rounded.CardGiftcard, contentDescription = null, tint = FuchsiaColors.Primary)
                            Column(Modifier.weight(1f)) {
                                Text("تقديم الطلب كهدية", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                                Text("اسم الشخص المستلم ورسالة خاصة وإخفاء السعر", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 11.sp))
                            }
                            Switch(checked = isGift, onCheckedChange = { isGift = it })
                        }
                    }
                }
                if (isGift) {
                    item {
                        CommerceField(recipientName, { recipientName = it }, "اسم المُهدى إليها")
                        CommerceField(giftMessage, { giftMessage = it }, "رسالة الهدية", minLines = 2, maxLines = 4, placeholder = "رسالة تهنئة أو أمنية جميلة")
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Switch(checked = hidePrice, onCheckedChange = { hidePrice = it })
                            Text("إخفاء السعر عن الشخص المستلم", color = FuchsiaColors.Ink, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
                        }
                    }
                }
                item {
                    CommerceSectionTitle("طريقة الدفع", "اختيار الطريقة المناسبة")
                    Row(horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                        PaymentChoice("عند التوصيل", paymentType == "cash_on_delivery", Modifier.weight(1f)) { paymentType = "cash_on_delivery" }
                        PaymentChoice("نصف المبلغ", paymentType == "partial", Modifier.weight(1f)) { paymentType = "partial" }
                        PaymentChoice("كامل المبلغ", paymentType == "full", Modifier.weight(1f)) { paymentType = "full" }
                    }
                }
                if (paymentType != "cash_on_delivery") {
                    item {
                        CommerceSectionTitle("المحفظة", "حسابات فعالة من الخادم")
                        if (wallets.isEmpty()) {
                            CommerceNotice("لا توجد محافظ دفع مفعّلة حاليًا. يرجى اختيار الدفع عند التوصيل.", isError = true)
                        } else {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                wallets.forEach { wallet ->
                                    WalletChoice(wallet, selectedWalletId == wallet.id) { selectedWalletId = wallet.id }
                                }
                            }
                        }
                    }
                    item {
                        CommerceField(transactionReference, { transactionReference = it }, "رقم عملية التحويل")
                        Card(
                            onClick = { receiptPicker.launch("image/*") },
                            enabled = !uploading,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                            border = BorderStroke(1.dp, if (receiptUrl.isNotBlank()) FuchsiaColors.Success else FuchsiaColors.Line),
                        ) {
                            Row(Modifier.padding(14.dp), horizontalArrangement = Arrangement.spacedBy(9.dp), verticalAlignment = Alignment.CenterVertically) {
                                if (uploading) CircularProgressIndicator(Modifier.size(19.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                                else Icon(if (receiptUrl.isNotBlank()) Icons.Rounded.CheckCircle else Icons.Rounded.CloudUpload, contentDescription = null, tint = if (receiptUrl.isNotBlank()) FuchsiaColors.Success else FuchsiaColors.Primary)
                                Text(
                                    when {
                                        uploading -> "جارٍ رفع الإيصال..."
                                        receiptUrl.isNotBlank() -> "تم رفع الإيصال بنجاح · تغيير الصورة"
                                        else -> "اختيار صورة إيصال التحويل ورفعها إلى الخادم"
                                    },
                                    color = FuchsiaColors.Ink,
                                    style = androidx.compose.material3.MaterialTheme.typography.bodyMedium,
                                )
                            }
                        }
                    }
                }
                item {
                    CommerceSectionTitle("ملخص المبلغ", "${cart?.items?.sumOf { it.quantity } ?: 0} قطع")
                    Card(shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
                        Column(Modifier.fillMaxWidth().padding(14.dp)) {
                            CommerceMoneyRow("قيمة المنتجات", cart?.subtotal ?: 0.0)
                            CommerceMoneyRow("التوصيل", cart?.deliveryFee ?: 0.0)
                            CommerceMoneyRow("الإجمالي", cart?.total ?: 0.0, bold = true, accent = true)
                            if (paymentType == "partial") CommerceMoneyRow("المطلوب الآن (عربون)", ceil((cart?.total ?: 0.0) / 2.0), bold = true)
                        }
                    }
                }
                if (error.isNotBlank()) item { CommerceNotice(error, isError = true) }
                item { CommerceNotice("لن يُنشأ الطلب إلا بعد استلام رد الخادم. يرجى التحقق من العنوان وموقع التوصيل قبل التأكيد.") }
            } else {
                item { CommerceEmptyState("لا توجد منتجات للإتمام", error.ifBlank { "يرجى إضافة هدية إلى السلة أولًا." }, "العودة", onBack) }
            }
        }
    }
}

@Composable
private fun PaymentChoice(label: String, selected: Boolean, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = modifier.height(62.dp),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) FuchsiaColors.Rose else FuchsiaColors.White),
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) FuchsiaColors.Primary else FuchsiaColors.Line),
    ) {
        Box(Modifier.fillMaxSize().padding(horizontal = 4.dp), contentAlignment = Alignment.Center) {
            Text(label, color = if (selected) FuchsiaColors.Primary else FuchsiaColors.Ink, fontWeight = FontWeight.Bold, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 11.sp))
        }
    }
}

@Composable
private fun WalletChoice(wallet: PaymentWallet, selected: Boolean, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(15.dp),
        colors = CardDefaults.cardColors(containerColor = if (selected) FuchsiaColors.RoseLight else FuchsiaColors.White),
        border = BorderStroke(if (selected) 1.5.dp else 1.dp, if (selected) FuchsiaColors.Primary else FuchsiaColors.Line),
    ) {
        Column(Modifier.fillMaxWidth().padding(12.dp), verticalArrangement = Arrangement.spacedBy(3.dp)) {
            Text(wallet.name, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
            Text(wallet.accountNumber, color = FuchsiaColors.Primary, fontWeight = FontWeight.SemiBold)
            if (wallet.instructions.isNotBlank()) Text(wallet.instructions, color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp))
        }
    }
}

private fun isSanaaLocation(latitude: Double, longitude: Double): Boolean =
    latitude in 15.1..15.7 && longitude in 43.8..44.6

private fun requestCurrentLocation(context: Context, onResult: (Location?) -> Unit) {
    try {
        val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
        val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .filter { provider -> runCatching { manager.isProviderEnabled(provider) }.getOrDefault(false) }
        if (providers.isEmpty()) {
            onResult(null)
            return
        }
        fun lastKnown(): Location? = providers.mapNotNull { provider ->
            runCatching { manager.getLastKnownLocation(provider) }.getOrNull()
        }.maxByOrNull(Location::getTime)

        val provider = providers.first()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            val handler = Handler(Looper.getMainLooper())
            val cancellation = CancellationSignal()
            var completed = false
            fun finish(location: Location?) {
                if (completed) return
                completed = true
                handler.removeCallbacksAndMessages(null)
                if (location == null) runCatching { cancellation.cancel() }
                onResult(location ?: lastKnown())
            }
            handler.postDelayed({ finish(lastKnown()) }, 20_000L)
            manager.getCurrentLocation(
                provider,
                cancellation,
                ContextCompat.getMainExecutor(context),
                Consumer<Location> { location -> finish(location) },
            )
        } else {
            val handler = Handler(Looper.getMainLooper())
            var completed = false
            lateinit var listener: android.location.LocationListener
            fun finish(location: Location?) {
                if (completed) return
                completed = true
                handler.removeCallbacksAndMessages(null)
                runCatching { manager.removeUpdates(listener) }
                onResult(location)
            }
            listener = object : android.location.LocationListener {
                override fun onLocationChanged(location: Location) = finish(location)
                override fun onProviderDisabled(provider: String) = Unit
                override fun onProviderEnabled(provider: String) = Unit
                @Deprecated("Deprecated by Android")
                override fun onStatusChanged(provider: String?, status: Int, extras: android.os.Bundle?) = Unit
            }
            handler.postDelayed({ finish(lastKnown()) }, 20_000L)
            manager.requestLocationUpdates(provider, 0L, 0f, listener, Looper.getMainLooper())
        }
    } catch (_: SecurityException) {
        onResult(null)
    } catch (_: Throwable) {
        onResult(null)
    }
}

private fun snackbarShown(scope: kotlinx.coroutines.CoroutineScope, snackbar: SnackbarHostState, message: String) {
    scope.launch { snackbar.showSnackbar(message) }
}
