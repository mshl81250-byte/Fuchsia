package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.BorderStroke
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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.DeleteOutline
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
import androidx.compose.material3.SnackbarHost
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.CartLine
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.ShoppingCart
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun CartScreen(
    onBack: () -> Unit,
    onCheckout: () -> Unit,
    onShop: () -> Unit,
    bottomBar: @Composable () -> Unit = {},
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var cart by remember { mutableStateOf<ShoppingCart?>(null) }
    var loading by remember { mutableStateOf(true) }
    var busyItem by remember { mutableIntStateOf(0) }
    var error by remember { mutableStateOf("") }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(sessionId, reloadKey) {
        if (sessionId == null) {
            error = "يرجى تسجيل الدخول أو بدء التصفح دون حساب لمتابعة السلة."
            loading = false
            return@LaunchedEffect
        }
        loading = true
        error = ""
        try {
            cart = FuchsiaApi.getCart(sessionId)
        } catch (failure: Throwable) {
            error = failure.message ?: "تعذر تحميل السلة."
        } finally {
            loading = false
        }
    }

    fun changeQuantity(item: CartLine, quantity: Int) {
        val id = sessionId ?: return
        scope.launch {
            busyItem = item.id
            try {
                cart = FuchsiaApi.updateCartQuantity(item.id, quantity, id)
            } catch (failure: Throwable) {
                snackbar.showSnackbar(failure.message ?: "تعذر تحديث المنتج.")
            } finally {
                busyItem = 0
            }
        }
    }

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
        bottomBar = {
            val current = cart
            if (!loading && !current?.items.isNullOrEmpty()) {
                Surface(
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding(),
                    color = FuchsiaColors.White,
                    shadowElevation = 14.dp,
                ) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        CommerceMoneyRow("الإجمالي شامل التوصيل", current.total, bold = true, accent = true)
                        CommercePrimaryButton(
                            text = "متابعة إلى إتمام الطلب",
                            onClick = onCheckout,
                            enabled = current.items.isNotEmpty(),
                            modifier = Modifier.fillMaxWidth().height(56.dp),
                        )
                    }
                }
            }
        },
    ) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 18.dp,
                end = 18.dp,
                top = contentPadding.calculateTopPadding() + 8.dp,
                bottom = contentPadding.calculateBottomPadding() + 16.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                CommerceHeader(
                    title = "سلة المشتريات",
                    subtitle = if (cart == null) "مراجعة الاختيارات قبل الإتمام" else "${cart?.items?.sumOf { it.quantity } ?: 0} منتجات مختارة",
                    onBack = onBack,
                )
            }
            if (error.isNotBlank()) {
                item {
                    CommerceNotice(error, isError = true)
                    Spacer(Modifier.height(5.dp))
                    Button(onClick = { reloadKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                        Text("إعادة المحاولة")
                    }
                }
            } else if (loading && cart == null) {
                item {
                    Box(Modifier.fillMaxWidth().padding(vertical = 44.dp), contentAlignment = Alignment.Center) {
                        CircularProgressIndicator(color = FuchsiaColors.Primary)
                    }
                }
            } else if (cart?.items.isNullOrEmpty()) {
                item {
                    CommerceEmptyState(
                        title = "السلة بانتظار هدية",
                        detail = "اختيار يناسب المناسبة، ثم متابعة الطلب بخطوات واضحة وآمنة.",
                        action = "تصفح المتجر",
                        onAction = onShop,
                    )
                }
            } else {
                items(cart?.items.orEmpty(), key = { it.id }) { line ->
                    CartItemCard(
                        item = line,
                        busy = busyItem == line.id,
                        onDecrease = {
                            if (line.quantity > 1) changeQuantity(line, line.quantity - 1) else {
                                scope.launch {
                                    busyItem = line.id
                                    runCatching { FuchsiaApi.removeCartItem(line.id) }
                                        .onSuccess { cart = it }
                                        .onFailure { snackbar.showSnackbar(it.message ?: "تعذر حذف المنتج.") }
                                    busyItem = 0
                                }
                            }
                        },
                        onIncrease = { changeQuantity(line, line.quantity + 1) },
                        onRemove = {
                            if (sessionId == null) return@CartItemCard
                            scope.launch {
                                busyItem = line.id
                                try {
                                    cart = FuchsiaApi.removeCartItem(line.id)
                                } catch (failure: Throwable) {
                                    snackbar.showSnackbar(failure.message ?: "تعذر حذف المنتج.")
                                } finally {
                                    busyItem = 0
                                }
                            }
                        },
                    )
                }
                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
                        border = BorderStroke(1.dp, FuchsiaColors.Line),
                    ) {
                        Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            CommerceSectionTitle("ملخص الطلب", "قبل التأكيد")
                            CommerceMoneyRow("المجموع الفرعي", cart?.subtotal ?: 0.0)
                            CommerceMoneyRow("التوصيل", cart?.deliveryFee ?: 0.0)
                            if ((cart?.discount ?: 0.0) > 0) CommerceMoneyRow("الخصم", -(cart?.discount ?: 0.0), accent = true)
                            androidx.compose.material3.HorizontalDivider(color = FuchsiaColors.Line, modifier = Modifier.padding(vertical = 3.dp))
                            CommerceMoneyRow("الإجمالي", cart?.total ?: 0.0, bold = true, accent = true)
                        }
                    }
                }
                item {
                    CommerceNotice("تحسب الأسعار ورسوم التوصيل من السلة المحفوظة على الخادم.")
                }
            }
        }
    }
}

@Composable
private fun CartItemCard(
    item: CartLine,
    busy: Boolean,
    onDecrease: () -> Unit,
    onIncrease: () -> Unit,
    onRemove: () -> Unit,
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(19.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(11.dp),
            horizontalArrangement = Arrangement.spacedBy(11.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier.size(82.dp).clip(RoundedCornerShape(15.dp)).background(FuchsiaColors.RoseLight),
                contentAlignment = Alignment.Center,
            ) {
                if (!item.imageUrl.isNullOrBlank()) {
                    AsyncImage(item.imageUrl, contentDescription = item.productName, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(29.dp))
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(item.productName, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium.copy(fontSize = 14.sp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(formatYemeniRiyal(item.price), color = FuchsiaColors.Primary, style = MaterialTheme.typography.labelLarge)
                if (item.giftWrapping) Text("تغليف هدية", color = FuchsiaColors.Gold, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 11.sp))
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(1.dp)) {
                    QuantityButton(Icons.Rounded.Remove, "تقليل الكمية", enabled = !busy, onClick = onDecrease)
                    Text(item.quantity.toString(), modifier = Modifier.width(27.dp), color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
                    QuantityButton(Icons.Rounded.Add, "زيادة الكمية", enabled = !busy, onClick = onIncrease)
                    Spacer(Modifier.width(4.dp))
                    IconButton(onClick = onRemove, enabled = !busy, modifier = Modifier.size(37.dp)) {
                        Icon(Icons.Rounded.DeleteOutline, contentDescription = "حذف المنتج", tint = FuchsiaColors.Muted, modifier = Modifier.size(20.dp))
                    }
                    if (busy) CircularProgressIndicator(modifier = Modifier.size(15.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                }
            }
            Text(formatYemeniRiyal(item.price * item.quantity), color = FuchsiaColors.Ink, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun QuantityButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        modifier = Modifier.size(32.dp),
        onClick = onClick,
        enabled = enabled,
        shape = CircleShape,
        color = FuchsiaColors.RoseLight,
        contentColor = FuchsiaColors.Primary,
        border = BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, modifier = Modifier.size(16.dp))
        }
    }
}
