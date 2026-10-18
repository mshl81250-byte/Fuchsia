package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.unit.dp
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.EngagementBoxOffer
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun GiftOrderScreen(
    onBack: () -> Unit,
    onCart: () -> Unit,
    onGiftCheckout: () -> Unit,
    onEngagementOffer: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var products by remember { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var offer by remember { mutableStateOf<EngagementBoxOffer?>(null) }
    var offerLoading by remember { mutableStateOf(true) }
    var offerError by remember { mutableStateOf("") }
    var cartCount by remember { mutableIntStateOf(0) }
    var loading by remember { mutableStateOf(true) }
    var busyProductId by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf("") }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(sessionId, reloadKey) {
        loading = true
        error = ""
        offerLoading = true
        runCatching { FuchsiaApi.engagementBoxOffer() }
            .onSuccess { offer = it; offerError = "" }
            .onFailure { offer = null; offerError = it.message ?: "تعذر تحميل العرض من الخادم." }
        offerLoading = false
        try {
            products = FuchsiaApi.featuredProducts().filter { it.fulfillmentType != "rental" }
            if (sessionId != null) cartCount = FuchsiaApi.getCart(sessionId).items.sumOf { it.quantity }
        } catch (failure: Throwable) {
            error = failure.message ?: "تعذر تحميل اختيارات الهدايا."
        } finally {
            loading = false
        }
    }

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
        bottomBar = {
            if (cartCount > 0) {
                Card(
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
                    colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                    elevation = CardDefaults.cardElevation(defaultElevation = 8.dp),
                ) {
                    androidx.compose.foundation.layout.Column(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 13.dp)) {
                        Text("${cartCount} قطعة في السلة · إضافة بيانات الشخص المستلم في الخطوة التالية", color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodyMedium)
                        CommercePrimaryButton("متابعة وإتمام الإهداء", modifier = Modifier.padding(top = 9.dp), onClick = onGiftCheckout)
                    }
                }
            }
        },
    ) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = contentPadding.calculateTopPadding() + 8.dp, bottom = contentPadding.calculateBottomPadding() + 18.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                CommerceHeader(
                    title = "اختيار الهدية",
                    subtitle = "إضافة اسم الشخص المستلم ورسالة الإهداء عند الدفع",
                    onBack = onBack,
                    trailing = {
                        IconButton(onClick = onCart, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Rounded.ShoppingBag, contentDescription = "سلة المشتريات", tint = FuchsiaColors.Primary)
                        }
                    },
                )
            }
            item {
                CommerceNotice("تأكيد الطلب يتم من الخادم. يمكن إضافة اسم الشخص المستلم ورسالة الإهداء وإخفاء السعر عند الإتمام.")
            }
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = androidx.compose.foundation.shape.RoundedCornerShape(21.dp),
                    colors = CardDefaults.cardColors(containerColor = FuchsiaColors.RoseLight),
                    border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Primary.copy(alpha = .35f)),
                ) {
                    androidx.compose.foundation.layout.Column(Modifier.fillMaxWidth().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("عرض صندوق الخطوبة", color = FuchsiaColors.TextAccent, fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold, style = androidx.compose.material3.MaterialTheme.typography.titleMedium)
                        Text(offer?.title ?: "صندوق خطوبة متوسط · 60×40 سم", color = FuchsiaColors.Ink, fontWeight = androidx.compose.ui.text.font.FontWeight.Bold)
                        Text(offer?.description ?: offerError.ifBlank { "نحمّل السعر والمواصفات مباشرة من الخادم." }, color = FuchsiaColors.Muted, style = androidx.compose.material3.MaterialTheme.typography.bodySmall)
                        if (offer != null) Text("${offer!!.dimensions} · ${formatYemeniRiyal(offer!!.price)}", color = FuchsiaColors.TextAccent, fontWeight = androidx.compose.ui.text.font.FontWeight.ExtraBold)
                        else if (offerLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                        CommercePrimaryButton(
                            text = when { offerLoading -> "جارٍ تحميل العرض"; offer == null -> "إعادة تحميل العرض"; else -> "متابعة طلب الصندوق" },
                            enabled = !offerLoading,
                            onClick = if (offer == null) ({ reloadKey++; Unit }) else onEngagementOffer,
                        )
                    }
                }
            }
            if (loading && products.isEmpty()) {
                item {
                    Box(Modifier.fillMaxWidth().padding(vertical = 40.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = FuchsiaColors.Primary)
                    }
                }
            } else if (products.isNotEmpty()) {
                items(products.chunked(2)) { rowProducts ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        rowProducts.forEach { product ->
                            ProductCard(
                                product = product,
                                modifier = Modifier.weight(1f),
                                isAdding = busyProductId == product.id,
                                addEnabled = busyProductId == 0,
                                onAdd = {
                                    if (busyProductId != 0) return@ProductCard
                                    val id = sessionId
                                    if (id == null) {
                                        scope.launch { snackbar.showSnackbar("يرجى تسجيل الدخول أو بدء التصفح دون حساب قبل إضافة الهدية.") }
                                    } else {
                                        scope.launch {
                                            busyProductId = product.id
                                            try {
                                                val updated = FuchsiaApi.addToCart(id, product.id, giftWrapping = true)
                                                cartCount = updated.items.sumOf { it.quantity }
                                                snackbar.showSnackbar("تمت إضافة ${product.name} مع تغليف الهدية")
                                            } catch (failure: Throwable) {
                                                snackbar.showSnackbar(failure.message ?: "تعذر إضافة الهدية.")
                                            } finally {
                                                busyProductId = 0
                                            }
                                        }
                                    }
                                },
                            )
                        }
                        if (rowProducts.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else if (error.isNotBlank()) {
                item {
                    androidx.compose.foundation.layout.Column(verticalArrangement = Arrangement.spacedBy(9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error, color = FuchsiaColors.Muted)
                        Button(onClick = { reloadKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("إعادة المحاولة") }
                    }
                }
            } else {
                item { CommerceEmptyState("لا توجد هدايا متاحة الآن", "ستظهر هنا المنتجات التي يضيفها المتجر.", "العودة", onBack) }
            }
        }
    }
}
