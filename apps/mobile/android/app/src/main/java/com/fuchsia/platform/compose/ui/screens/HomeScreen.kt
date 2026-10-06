package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.Image
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
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.LocalFlorist
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.fuchsia.platform.compose.R
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.data.StoreCategory
import com.fuchsia.platform.compose.data.StoreProduct
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import java.text.NumberFormat
import java.util.Locale

@Composable
fun HomeScreen(onCategory: (Int) -> Unit) {
    val context = LocalContext.current
    val greetingName = remember {
        SessionVault.read(context)?.optJSONObject("user")?.optString("fullName")
            ?.takeIf { !it.isNullOrBlank() && it != "null" }
    }
    var categories by remember { mutableStateOf<List<StoreCategory>>(emptyList()) }
    var products by remember { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var refreshKey by remember { mutableIntStateOf(0) }

    LaunchedEffect(refreshKey) {
        loading = true
        error = ""
        coroutineScope {
            val categoriesTask = async { runCatching { FuchsiaApi.categories() } }
            val productsTask = async { runCatching { FuchsiaApi.featuredProducts() } }
            val categoriesResult = categoriesTask.await()
            val productsResult = productsTask.await()
            categoriesResult.onSuccess { categories = it }
            productsResult.onSuccess { products = it }
            if (categoriesResult.isFailure && productsResult.isFailure) {
                error = categoriesResult.exceptionOrNull()?.message ?: "تعذر تحميل المتجر."
            }
        }
        loading = false
    }

    Scaffold(containerColor = FuchsiaColors.Cream) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(start = 18.dp, end = 18.dp, top = contentPadding.calculateTopPadding() + 8.dp, bottom = contentPadding.calculateBottomPadding() + 22.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(
                            text = if (greetingName == null) "أهلًا بكِ في فوشيا" else "أهلًا، $greetingName",
                            style = MaterialTheme.typography.titleLarge,
                            color = FuchsiaColors.Ink,
                        )
                        Text("اختيارات أنيقة للحظاتكِ الجميلة", style = MaterialTheme.typography.bodyMedium, color = FuchsiaColors.Muted)
                    }
                    Card(
                        modifier = Modifier.size(46.dp),
                        shape = RoundedCornerShape(15.dp),
                        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Rose),
                    ) {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            Icon(Icons.Rounded.ShoppingBag, contentDescription = "المتجر", tint = FuchsiaColors.Primary)
                        }
                    }
                }
            }
            item {
                Box(modifier = Modifier.fillMaxWidth().height(154.dp).clip(RoundedCornerShape(23.dp))) {
                    Image(
                        painter = painterResource(R.drawable.welcome_hero),
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    Box(
                        modifier = Modifier.fillMaxSize().background(
                            Brush.horizontalGradient(listOf(Color(0xAA2D1020), Color.Transparent)),
                        ),
                    )
                    Column(
                        modifier = Modifier.align(Alignment.CenterEnd).padding(horizontal = 17.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text("لحظتكِ تستحق", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 20.sp)
                        Text("هدية تُختار بعناية وتصل بمحبة", color = Color.White.copy(alpha = 0.94f), fontSize = 12.sp)
                    }
                }
            }
            item {
                SectionHeading("تصفّحي حسب المناسبة", "كل ما يلائم ذوقكِ")
            }
            if (categories.isNotEmpty()) {
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        items(categories, key = { it.id }) { category ->
                            CategoryChip(category = category, onClick = { onCategory(category.id) })
                        }
                    }
                }
            }
            item {
                SectionHeading("مختارة لكِ", "الأكثر تميزًا")
            }
            if (loading && products.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(vertical = 18.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (products.isNotEmpty()) {
                items(products.chunked(2)) { rowProducts ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        rowProducts.forEach { product ->
                            ProductCard(product, Modifier.weight(1f))
                        }
                        if (rowProducts.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else if (error.isNotBlank()) {
                item {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.fillMaxWidth().padding(vertical = 10.dp)) {
                        Text(error, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
                        Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(17.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("إعادة المحاولة")
                        }
                    }
                }
            } else {
                item { Text("لا توجد منتجات مميزة حاليًا.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium) }
            }
        }
    }
}

@Composable
private fun SectionHeading(title: String, detail: String) {
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink)
        Text(detail, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp), color = FuchsiaColors.Primary)
    }
}

@Composable
private fun CategoryChip(category: StoreCategory, onClick: () -> Unit) {
    Card(
        onClick = onClick,
        modifier = Modifier.width(132.dp).height(73.dp),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 10.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(Modifier.size(36.dp).background(FuchsiaColors.RoseLight, RoundedCornerShape(12.dp)), contentAlignment = Alignment.Center) {
                Icon(Icons.Rounded.Category, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(19.dp))
            }
            Text(category.name, color = FuchsiaColors.Ink, style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp), maxLines = 2, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
internal fun ProductCard(product: StoreProduct, modifier: Modifier = Modifier) {
    Card(
        modifier = modifier,
        shape = RoundedCornerShape(19.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
        Column {
            Box(modifier = Modifier.fillMaxWidth().height(133.dp).background(FuchsiaColors.RoseLight)) {
                if (!product.imageUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = product.imageUrl,
                        contentDescription = product.name,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Icon(
                        Icons.Rounded.CardGiftcard,
                        contentDescription = null,
                        tint = FuchsiaColors.Primary.copy(alpha = 0.72f),
                        modifier = Modifier.align(Alignment.Center).size(36.dp),
                    )
                }
            }
            Column(modifier = Modifier.fillMaxWidth().padding(horizontal = 11.dp, vertical = 10.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(product.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium.copy(fontSize = 13.sp), maxLines = 2, overflow = TextOverflow.Ellipsis, minLines = 2)
                Text(formatRiyal(product.price), color = FuchsiaColors.Primary, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

internal fun formatRiyal(value: Double): String =
    NumberFormat.getNumberInstance(Locale.forLanguageTag("ar-YE")).format(value) + " ر.ي"
