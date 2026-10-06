package com.fuchsia.platform.compose.ui.screens

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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.Remove
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

@Composable
fun ProductDetailsScreen(
    productId: Int,
    onBack: () -> Unit,
    onCart: () -> Unit,
) {
    val context = LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var product by remember(productId) { mutableStateOf<StoreProduct?>(null) }
    var loading by remember(productId) { mutableStateOf(true) }
    var error by remember(productId) { mutableStateOf("") }
    var quantity by remember(productId) { mutableIntStateOf(1) }

    LaunchedEffect(productId) {
        loading = true
        error = ""
        runCatching { FuchsiaApi.product(productId) }
            .onSuccess { product = it }
            .onFailure { error = it.message ?: "تعذر تحميل تفاصيل المنتج." }
        loading = false
    }

    val current = product
    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
        bottomBar = {
            if (current != null) {
                Surface(color = FuchsiaColors.White, shadowElevation = 12.dp) {
                    Row(Modifier.fillMaxWidth().padding(horizontal = 18.dp, vertical = 11.dp), horizontalArrangement = Arrangement.spacedBy(10.dp), verticalAlignment = Alignment.CenterVertically) {
                        QuantityStepper(quantity = quantity, onDecrease = { if (quantity > 1) quantity-- }, onIncrease = { quantity++ })
                        Button(
                            onClick = {
                                val id = sessionId
                                if (id == null) scope.launch { snackbar.showSnackbar("يرجى بدء التصفح قبل إضافة المنتجات.") }
                                else scope.launch {
                                    runCatching { FuchsiaApi.addToCart(id, current.id, quantity) }
                                        .onSuccess { snackbar.showSnackbar("تمت إضافة المنتج إلى السلة") }
                                        .onFailure { snackbar.showSnackbar(it.message ?: "تعذر إضافة المنتج.") }
                                }
                            },
                            modifier = Modifier.weight(1f).height(50.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                        ) {
                            Icon(Icons.Rounded.AddShoppingCart, contentDescription = null, modifier = Modifier.size(19.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("إضافة للسلة", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        },
    ) { insets ->
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) }
            current == null -> Column(Modifier.fillMaxSize().padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Text(error.ifBlank { "المنتج غير متاح حاليًا." }, color = FuchsiaColors.Muted, textAlign = TextAlign.Center)
                Spacer(Modifier.height(12.dp))
                Button(onClick = onBack, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null); Text("العودة للمتجر") }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = insets.calculateBottomPadding() + 20.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    item {
                        Box(Modifier.fillMaxWidth().height(365.dp).background(FuchsiaColors.RoseLight)) {
                            ProductGallery(current)
                            Row(Modifier.fillMaxWidth().padding(horizontal = 14.dp, vertical = 10.dp), horizontalArrangement = Arrangement.SpaceBetween) {
                                CircleAction(Icons.AutoMirrored.Rounded.ArrowBack, "رجوع", onBack)
                                CircleAction(Icons.Rounded.ShoppingBag, "السلة", onCart)
                            }
                        }
                    }
                    item {
                        Column(Modifier.fillMaxWidth().padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                            Text(current.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.ExtraBold)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                Text("★", color = FuchsiaColors.Gold, fontSize = 20.sp)
                                Text(if (current.rating > 0) String.format("%.1f", current.rating) else "جديد", color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
                                Text("(${current.reviewCount} تقييم)", color = FuchsiaColors.Muted, fontSize = 12.sp)
                            }
                            Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                                Text(formatRiyal(current.price), color = FuchsiaColors.Primary, fontSize = 23.sp, fontWeight = FontWeight.ExtraBold)
                                current.originalPrice?.let { Text(formatRiyal(it), color = FuchsiaColors.Muted, fontSize = 13.sp) }
                            }
                        }
                    }
                    item {
                        ProductInfoCard(current)
                    }
                    if (current.tags.isNotEmpty()) {
                        item {
                            LazyRow(contentPadding = PaddingValues(horizontal = 20.dp), horizontalArrangement = Arrangement.spacedBy(7.dp)) {
                                itemsIndexed(current.tags) { _, tag -> TagChip(tag) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ProductGallery(product: StoreProduct) {
    val images = product.images.ifEmpty { listOfNotNull(product.imageUrl) }
    Box(Modifier.fillMaxSize()) {
        if (images.isEmpty()) {
            Icon(Icons.Rounded.ShoppingBag, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(64.dp))
        } else {
            LazyRow(Modifier.fillMaxSize()) {
                itemsIndexed(images) { _, image -> AsyncImage(image, contentDescription = product.name, modifier = Modifier.fillParentMaxWidth().fillMaxSize(), contentScale = ContentScale.Crop) }
            }
            if (images.size > 1) {
                Row(Modifier.align(Alignment.BottomCenter).padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                    repeat(images.size.coerceAtMost(6)) { Box(Modifier.size(7.dp).background(Color.White.copy(alpha = if (it == 0) 1f else .55f), CircleShape)) }
                }
            }
        }
    }
}

@Composable
private fun ProductInfoCard(product: StoreProduct) {
    Card(Modifier.fillMaxWidth().padding(horizontal = 20.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White)) {
        Column(Modifier.padding(17.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Text("عن المنتج", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleLarge)
            Text(product.description.ifBlank { "باقة فاخرة مختارة بعناية لتناسب مناسباتك الجميلة وتصل إليك بتغليف أنيق." }, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                DetailFeature("تغليف فاخر", "هدية جاهزة")
                DetailFeature("جودة مضمونة", "اختيار بعناية")
                DetailFeature("توصيل سريع", product.deliveryDays?.let { "$it أيام" } ?: "حسب المنطقة")
            }
            if (!product.inStock) Text("غير متوفر حاليًا", color = FuchsiaColors.Error, fontWeight = FontWeight.Bold)
        }
    }
}

@Composable
private fun DetailFeature(title: String, detail: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(3.dp)) {
        Text(title, color = FuchsiaColors.Primary, fontSize = 11.sp, fontWeight = FontWeight.Bold)
        Text(detail, color = FuchsiaColors.Muted, fontSize = 10.sp)
    }
}

@Composable
private fun TagChip(tag: String) {
    Surface(shape = RoundedCornerShape(20.dp), color = FuchsiaColors.Rose, contentColor = FuchsiaColors.Primary) { Text(tag, modifier = Modifier.padding(horizontal = 12.dp, vertical = 7.dp), fontSize = 11.sp) }
}

@Composable
private fun CircleAction(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(42.dp).background(FuchsiaColors.White.copy(alpha = .92f), CircleShape)) { Icon(icon, contentDescription = description, tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp)) }
}

@Composable
private fun QuantityStepper(quantity: Int, onDecrease: () -> Unit, onIncrease: () -> Unit) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
        Surface(onClick = onDecrease, shape = CircleShape, color = FuchsiaColors.RoseLight, modifier = Modifier.size(34.dp)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Remove, contentDescription = "تقليل", tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp)) } }
        Text(quantity.toString(), color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold)
        Surface(onClick = onIncrease, shape = CircleShape, color = FuchsiaColors.RoseLight, modifier = Modifier.size(34.dp)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.Add, contentDescription = "زيادة", tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp)) } }
    }
}
