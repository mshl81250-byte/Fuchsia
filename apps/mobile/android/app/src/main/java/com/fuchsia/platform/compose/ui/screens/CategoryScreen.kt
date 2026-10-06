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
import androidx.compose.ui.draw.clip
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
fun CategoryScreen(categoryId: Int, onBack: () -> Unit, onCart: () -> Unit, onProduct: (Int) -> Unit) {
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
                Row(Modifier.fillMaxWidth().height(54.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    IconButton(onClick = onBack, modifier = Modifier.size(46.dp)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink) }
                    Column(Modifier.weight(1f)) {
                        Text(category?.name ?: "المجموعة", style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink)
                        Text("اختيارات منتقاة بعناية", style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), color = FuchsiaColors.Muted)
                    }
                    IconButton(onClick = onCart, modifier = Modifier.size(44.dp)) { Icon(Icons.Rounded.ShoppingBag, contentDescription = "سلة المشتريات", tint = FuchsiaColors.Primary) }
                }
            }
            if (loading && products.isEmpty()) item { Box(Modifier.fillMaxWidth().padding(vertical = 45.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            else if (products.isNotEmpty()) {
                items(products, key = { it.id }) { product ->
                    CategoryProductRow(product, onOpen = { onProduct(product.id) }) {
                        val id = sessionId
                        if (id == null) scope.launch { snackbar.showSnackbar("يرجى بدء التصفح قبل الإضافة.") }
                        else scope.launch { runCatching { FuchsiaApi.addToCart(id, product.id) }.onSuccess { snackbar.showSnackbar("تمت إضافة ${product.name} إلى السلة") }.onFailure { snackbar.showSnackbar(it.message ?: "تعذر إضافة المنتج.") } }
                    }
                }
            } else if (error.isNotBlank()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 25.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        Text(error, color = FuchsiaColors.Muted)
                        Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(17.dp)); Spacer(Modifier.width(6.dp)); Text("إعادة المحاولة") }
                    }
                }
            } else item { Text("لا توجد منتجات في هذه المجموعة حاليًا.", color = FuchsiaColors.Muted, modifier = Modifier.padding(top = 16.dp)) }
        }
    }
}

@Composable
fun CategoriesScreen(onCategory: (Int) -> Unit, onBack: () -> Unit, bottomBar: @Composable () -> Unit) {
    var categories by remember { mutableStateOf<List<StoreCategory>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var refreshKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshKey) {
        loading = true
        error = ""
        runCatching { FuchsiaApi.categories() }.onSuccess { categories = it }.onFailure { error = it.message ?: "تعذر تحميل التصنيفات." }
        loading = false
    }

    Scaffold(containerColor = FuchsiaColors.Cream, bottomBar = bottomBar) { insets ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = insets.calculateTopPadding() + 10.dp, bottom = insets.calculateBottomPadding() + 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            item {
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "رجوع", tint = FuchsiaColors.Ink) }
                    Column(Modifier.weight(1f), horizontalAlignment = Alignment.End) {
                        Text("التصنيفات", color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineMedium)
                        Text("اختاري ما يناسب مناسبتك", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
                    }
                }
            }
            if (loading && categories.isEmpty()) item { Box(Modifier.fillMaxWidth().height(260.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            else if (categories.isNotEmpty()) {
                items(categories.chunked(2)) { row ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        row.forEach { category -> CategoryGridCard(category, Modifier.weight(1f), onClick = { onCategory(category.id) }) }
                        if (row.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 40.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(error.ifBlank { "لا توجد تصنيفات حاليًا." }, color = FuchsiaColors.Muted)
                        Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("إعادة المحاولة") }
                    }
                }
            }
        }
    }
}

@Composable
private fun CategoryGridCard(category: StoreCategory, modifier: Modifier, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = modifier, shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column {
            Box(Modifier.fillMaxWidth().height(126.dp).background(FuchsiaColors.RoseLight)) {
                if (!category.imageUrl.isNullOrBlank()) AsyncImage(category.imageUrl, contentDescription = category.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Rounded.CardGiftcard, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(34.dp))
            }
            Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                Text(category.name, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(17.dp))
            }
        }
    }
}

@Composable
private fun CategoryProductRow(product: StoreProduct, onOpen: () -> Unit, onAdd: () -> Unit) {
    Card(onClick = onOpen, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(18.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Row(Modifier.fillMaxWidth().padding(10.dp), horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(Modifier.size(94.dp).clip(RoundedCornerShape(14.dp)).background(FuchsiaColors.RoseLight), contentAlignment = Alignment.Center) {
                if (!product.imageUrl.isNullOrBlank()) AsyncImage(product.imageUrl, contentDescription = product.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Rounded.CardGiftcard, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(31.dp))
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(product.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                if (product.description.isNotBlank()) Text(product.description, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text(formatRiyal(product.price), color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold)
                Button(onClick = onAdd, modifier = Modifier.fillMaxWidth().height(40.dp), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 8.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Icon(Icons.Rounded.CardGiftcard, contentDescription = null, modifier = Modifier.size(16.dp)); Spacer(Modifier.width(5.dp)); Text("إضافة إلى السلة", style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp)) }
            }
        }
    }
}
