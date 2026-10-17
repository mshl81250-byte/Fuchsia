package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun WishlistScreen(
    onBack: () -> Unit,
    onSignIn: () -> Unit,
    onProduct: (Int) -> Unit,
    onCart: () -> Unit,
    bottomBar: @Composable () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val sessionSnapshot = SessionVault.read(context)
    val userId = sessionSnapshot?.optJSONObject("user")?.optInt("id")?.takeIf { it > 0 }
    val sessionId = sessionSnapshot?.optJSONObject("user")?.opt("id")?.toString()?.takeIf { it.isNotBlank() && it != "null" }
    val bearerToken = sessionSnapshot?.optString("token")?.takeIf { it.isNotBlank() }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var products by remember { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var loading by remember { mutableStateOf(userId != null) }
    var error by remember { mutableStateOf("") }
    var reloadKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(userId, reloadKey) {
        if (userId == null) {
            loading = false
            return@LaunchedEffect
        }
        loading = true
        error = ""
        runCatching { FuchsiaApi.favorites(userId, bearerToken) }
            .onSuccess { products = it }
            .onFailure { error = it.message ?: "تعذر تحميل المفضلة." }
        loading = false
    }

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
        bottomBar = bottomBar,
    ) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 12.dp, bottom = insets.calculateBottomPadding() + 24.dp),
            verticalArrangement = Arrangement.spacedBy(13.dp),
        ) {
            item {
                CommerceHeader(
                    title = "المفضلة",
                    subtitle = if (products.isEmpty()) "احفظ المنتجات التي أعجبتك" else "${products.size} منتجات محفوظة",
                    onBack = onBack,
                    trailing = {
                        IconButton(onClick = onCart, modifier = Modifier.size(44.dp)) {
                            Icon(Icons.Rounded.ShoppingBag, contentDescription = "سلة المشتريات", tint = FuchsiaColors.Primary)
                        }
                    },
                )
            }
            if (userId == null) {
                item {
                    CommerceEmptyState("احفظ اختياراتك", "سجّل الدخول لتجميع الباقات والمنتجات التي تريد العودة إليها لاحقًا.", "تسجيل الدخول", onSignIn)
                }
            } else if (loading) {
                item { Box(Modifier.fillMaxWidth().height(180.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (error.isNotBlank()) {
                item {
                    CommerceNotice(error, isError = true)
                    Button(onClick = { reloadKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                        Icon(Icons.Rounded.Refresh, contentDescription = null)
                        Spacer(Modifier.padding(horizontal = 3.dp))
                        Text("إعادة المحاولة")
                    }
                }
            } else if (products.isEmpty()) {
                item {
                    CommerceEmptyState("لا توجد منتجات محفوظة", "اضغط على رمز القلب في أي بطاقة منتج ليظهر هنا.", "تصفح المتجر", onCart)
                }
            } else {
                items(products.chunked(2), key = { row -> row.joinToString("-") }) { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { product ->
                            ProductCard(
                                product = product,
                                modifier = Modifier.weight(1f),
                                isFavorite = true,
                                onOpen = { onProduct(product.id) },
                                onFavorite = {
                                    val id = requireNotNull(userId)
                                    scope.launch {
                                        runCatching { FuchsiaApi.toggleFavorite(id, product.id, bearerToken) }
                                            .onSuccess {
                                                products = products.filterNot { it.id == product.id }
                                                snackbar.showSnackbar("تمت إزالة ${product.name} من المفضلة")
                                            }
                                            .onFailure { snackbar.showSnackbar(it.message ?: "تعذر تحديث المفضلة.") }
                                    }
                                },
                            ) {
                                if (product.fulfillmentType == "rental") onProduct(product.id)
                                else {
                                    val session = sessionId
                                    if (session == null) scope.launch { snackbar.showSnackbar("يرجى بدء التصفح قبل إضافة المنتجات.") }
                                    else scope.launch {
                                        runCatching { FuchsiaApi.addToCart(session, product.id) }
                                            .onSuccess { snackbar.showSnackbar("تمت إضافة ${product.name} إلى السلة") }
                                            .onFailure { snackbar.showSnackbar(it.message ?: "تعذر إضافة المنتج.") }
                                    }
                                }
                            }
                        }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            }
        }
    }
}
