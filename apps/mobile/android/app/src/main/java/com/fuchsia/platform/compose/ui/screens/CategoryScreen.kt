package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Scaffold
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreCategory
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun CategoryScreen(categoryId: Int, onBack: () -> Unit, onCart: () -> Unit) {
    val context = LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var category by remember(categoryId) { mutableStateOf<StoreCategory?>(null) }
    var products by remember(categoryId) { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var loading by remember(categoryId) { mutableStateOf(true) }
    var error by remember(categoryId) { mutableStateOf("") }
    var refreshKey by remember(categoryId) { mutableIntStateOf(0) }

    LaunchedEffect(categoryId, refreshKey) {
        loading = true
        error = ""
        try {
            val categories = FuchsiaApi.categories()
            category = categories.firstOrNull { it.id == categoryId }
            products = FuchsiaApi.productsByCategory(categoryId)
        } catch (failure: Throwable) {
            error = failure.message ?: "تعذر تحميل المنتجات."
        } finally {
            loading = false
        }
    }

    Scaffold(containerColor = FuchsiaColors.Cream, snackbarHost = { SnackbarHost(snackbar) }) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = contentPadding.calculateTopPadding() + 4.dp, bottom = contentPadding.calculateBottomPadding() + 24.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) {
                        Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink)
                    }
                    Column {
                        Text(category?.name ?: "المجموعة", style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink)
                        Text("اختيارات منتقاة بعناية", style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), color = FuchsiaColors.Muted)
                    }
                    IconButton(onClick = onCart, modifier = Modifier.size(44.dp)) {
                        Icon(Icons.Rounded.ShoppingBag, contentDescription = "سلة المشتريات", tint = FuchsiaColors.Primary)
                    }
                }
            }
            if (loading && products.isEmpty()) {
                item { androidx.compose.foundation.layout.Box(Modifier.fillMaxWidth().padding(vertical = 45.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (products.isNotEmpty()) {
                items(products, key = { it.id }) { product ->
                    CategoryProductRow(product) {
                        val id = sessionId
                        if (id == null) {
                            scope.launch { snackbar.showSnackbar("يرجى تسجيل الدخول أو بدء التصفح دون حساب قبل الإضافة.") }
                        } else {
                            scope.launch {
                                try {
                                    FuchsiaApi.addToCart(id, product.id)
                                    snackbar.showSnackbar("تمت إضافة ${product.name} إلى السلة")
                                } catch (failure: Throwable) {
                                    snackbar.showSnackbar(failure.message ?: "تعذر إضافة المنتج.")
                                }
                            }
                        }
                    }
                }
            } else if (error.isNotBlank()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 25.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        Text(error, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
                        Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(17.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("إعادة المحاولة")
                        }
                    }
                }
            } else {
                item {
                    Text("لا توجد منتجات في هذه المجموعة حاليًا.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 16.dp))
                }
            }
        }
    }
}

@Composable
private fun CategoryProductRow(product: StoreProduct, onAdd: () -> Unit) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(10.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(94.dp).clip(RoundedCornerShape(14.dp)).background(FuchsiaColors.RoseLight),
                contentAlignment = Alignment.Center,
            ) {
                if (!product.imageUrl.isNullOrBlank()) {
                    AsyncImage(model = product.imageUrl, contentDescription = product.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                } else {
                    Icon(Icons.Rounded.CardGiftcard, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(31.dp))
                }
            }
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(product.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (product.description.isNotBlank()) {
                    Text(product.description, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                }
                Text(formatRiyal(product.price), color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold)
                Button(
                    onClick = onAdd,
                    modifier = Modifier.fillMaxWidth().height(40.dp),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(horizontal = 8.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                ) {
                    Icon(Icons.Rounded.CardGiftcard, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(5.dp))
                    Text("إضافة إلى السلة", style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp))
                }
            }
        }
    }
}
