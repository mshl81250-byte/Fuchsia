package com.fuchsia.platform.compose.ui.screens
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.core.tween

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.AddShoppingCart
import androidx.compose.material.icons.rounded.CalendarMonth
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.Cake
import androidx.compose.material.icons.rounded.Call
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Favorite
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.LocalFlorist
import androidx.compose.material.icons.rounded.LocationOn
import androidx.compose.material.icons.rounded.NotificationsNone
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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
import com.fuchsia.designsystem.FuchsiaFormatters
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.util.Locale

@Composable
fun HomeScreen(
    onCategory: (Int) -> Unit,
    onProduct: (Int) -> Unit,
    onCart: () -> Unit,
    onReservation: () -> Unit,
    onVenueBooking: () -> Unit,
    onGiftOrder: () -> Unit,
    onOrders: () -> Unit,
    bottomBar: @Composable () -> Unit = {},
) {
    val context = LocalContext.current
    val sessionId = remember(context) { SessionVault.sessionId(context) }
    val userId = remember(context) { SessionVault.userId(context) }
    val bearerToken = remember(context) { SessionVault.token(context) }
    val sessionUser = remember(context) { SessionVault.read(context)?.optJSONObject("user") }
    val isGuest = sessionUser?.optBoolean("isGuest", false) == true || sessionUser?.optString("email").orEmpty().endsWith("@guest.fuchsia")
    val greetingName = sessionUser?.optString("fullName")?.takeIf { !it.isNullOrBlank() && it != "null" && !isGuest }
    val scope = rememberCoroutineScope()
    val snackbar = remember { SnackbarHostState() }
    var categories by remember { mutableStateOf<List<StoreCategory>>(emptyList()) }
    var products by remember { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf("") }
    var refreshKey by remember { mutableIntStateOf(0) }
    var searchQuery by remember { mutableStateOf("") }
    var searchResults by remember { mutableStateOf<List<StoreProduct>>(emptyList()) }
    var searchLoading by remember { mutableStateOf(false) }
    var favoriteIds by remember { mutableStateOf<Set<Int>>(emptySet()) }

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

    LaunchedEffect(searchQuery) {
        val query = searchQuery.trim()
        if (query.isBlank()) {
            searchResults = emptyList()
            searchLoading = false
            return@LaunchedEffect
        }
        delay(350)
        searchLoading = true
        runCatching { FuchsiaApi.searchProducts(query) }
            .onSuccess { searchResults = it }
            .onFailure { searchResults = emptyList() }
        searchLoading = false
    }

    LaunchedEffect(userId) {
        if (userId == null) {
            favoriteIds = emptySet()
            return@LaunchedEffect
        }
        runCatching { FuchsiaApi.favorites(userId, bearerToken) }.onSuccess { favoriteIds = it.mapTo(mutableSetOf()) { product -> product.id } }
    }

    fun toggleFavorite(productId: Int) {
        val id = userId
        if (id == null) {
            scope.launch { snackbar.showSnackbar("سجّل الدخول لحفظ المنتجات في المفضلة.") }
            return
        }
        scope.launch {
            runCatching { FuchsiaApi.toggleFavorite(id, productId, bearerToken) }
                .onSuccess { isFavorite ->
                    favoriteIds = if (isFavorite) favoriteIds + productId else favoriteIds - productId
                    snackbar.showSnackbar(if (isFavorite) "تم حفظ المنتج في المفضلة" else "تمت إزالة المنتج من المفضلة")
                }
                .onFailure { snackbar.showSnackbar(it.message ?: "تعذر تحديث المفضلة.") }
        }
    }

    Scaffold(
        containerColor = FuchsiaColors.Cream,
        snackbarHost = { FuchsiaNoticeHost(snackbar) },
        bottomBar = bottomBar,
    ) { contentPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(
                start = 18.dp,
                end = 18.dp,
                top = contentPadding.calculateTopPadding() + 8.dp,
                bottom = contentPadding.calculateBottomPadding() + 22.dp,
            ),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                AnimatedVisibility(
                    visible = true,
                    enter = fadeIn(tween(360)) + slideInVertically(tween(420)) { -it / 4 },
                ) {
                    HomeHeader(name = greetingName, isGuest = isGuest, onCart = onCart)
                }
            }
            item {
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    placeholder = { Text("ابحث عن منتج، باقة أو مناسبة...", color = FuchsiaColors.Muted, fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = "بحث", tint = FuchsiaColors.Primary) },
                    shape = RoundedCornerShape(18.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        unfocusedContainerColor = FuchsiaColors.White,
                        focusedTextColor = FuchsiaColors.Ink,
                        unfocusedTextColor = FuchsiaColors.Ink,
                        focusedPlaceholderColor = FuchsiaColors.Muted,
                        unfocusedPlaceholderColor = FuchsiaColors.Muted,
                        focusedLabelColor = FuchsiaColors.TextAccent,
                        unfocusedLabelColor = FuchsiaColors.Muted,
                        focusedContainerColor = FuchsiaColors.White,
                        unfocusedBorderColor = FuchsiaColors.Line,
                        focusedBorderColor = FuchsiaColors.Primary,
                    ),
                )
            }
            if (searchQuery.isNotBlank()) {
                item { SectionHeading("نتائج البحث", if (searchLoading) "جارٍ البحث..." else "${searchResults.size} نتيجة") }
                if (searchLoading) {
                    item { Box(Modifier.fillMaxWidth().height(110.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
                } else if (searchResults.isEmpty()) {
                    item { Text("لم نجد منتجات تطابق بحثك.", color = FuchsiaColors.Muted, modifier = Modifier.padding(vertical = 12.dp)) }
                } else {
                    items(searchResults.chunked(2), key = { row -> row.joinToString("-") }) { rowProducts ->
                        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            rowProducts.forEach { product ->
                                ProductCard(product, Modifier.weight(1f), onOpen = { onProduct(product.id) }, isFavorite = product.id in favoriteIds, onFavorite = { toggleFavorite(product.id) }) {
                                    if (product.fulfillmentType == "rental") onProduct(product.id)
                                    else {
                                        val id = sessionId
                                        if (id == null) scope.launch { snackbar.showSnackbar("يرجى بدء التصفح قبل إضافة المنتجات.") }
                                        else scope.launch {
                                            runCatching { FuchsiaApi.addToCart(id, product.id) }
                                                .onSuccess { snackbar.showSnackbar("تمت إضافة ${product.name} إلى السلة") }
                                                .onFailure { snackbar.showSnackbar(it.message ?: "تعذر إضافة المنتج.") }
                                        }
                                    }
                                }
                            }
                            if (rowProducts.size == 1) Spacer(Modifier.weight(1f))
                        }
                    }
                }
            }
            item { HeroOffer(onClick = onCategory.takeIf { categories.isNotEmpty() }?.let { { it(categories.first().id) } }) }
            item { VenueBookingPromo(onClick = onVenueBooking) }
            item { SectionHeading("تسوق حسب المناسبة", "عرض الكل") }
            if (categories.isNotEmpty()) {
                item {
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp), contentPadding = PaddingValues(end = 2.dp)) {
                        items(categories.take(6), key = { it.id }) { category ->
                            CategoryTile(category = category, onClick = { onCategory(category.id) })
                        }
                    }
                }
            } else if (loading) {
                item { Box(Modifier.fillMaxWidth().height(104.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            }
            item { SectionHeading("خدمات سريعة", "") }
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    QuickService("تواصل معنا", Icons.Rounded.Call, Modifier.weight(1f)) {}
                    QuickService("حجز مناسبة", Icons.Rounded.CalendarMonth, Modifier.weight(1f), onReservation)
                    QuickService("طلب هدية", Icons.Rounded.CardGiftcard, Modifier.weight(1f), onGiftOrder)
                    QuickService("تتبع الطلب", Icons.AutoMirrored.Rounded.ReceiptLong, Modifier.weight(1f), onOrders)
                }
            }
            item { OfferStrip(onClick = onCategory.takeIf { categories.isNotEmpty() }?.let { { it(categories.first().id) } }) }
            item { SectionHeading("المنتجات المميزة", "الأكثر طلبًا") }
            if (loading && products.isEmpty()) {
                item { Box(Modifier.fillMaxWidth().padding(vertical = 18.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = FuchsiaColors.Primary) } }
            } else if (products.isNotEmpty()) {
                items(products.chunked(2)) { rowProducts ->
                    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        rowProducts.forEach { product ->
                            ProductCard(product, Modifier.weight(1f), onOpen = { onProduct(product.id) }, isFavorite = product.id in favoriteIds, onFavorite = { toggleFavorite(product.id) }) {
                                if (product.fulfillmentType == "rental") onProduct(product.id)
                                else {
                                    val id = sessionId
                                    if (id == null) {
                                        scope.launch { snackbar.showSnackbar("يرجى بدء التصفح قبل إضافة المنتجات.") }
                                    } else {
                                        scope.launch {
                                            runCatching { FuchsiaApi.addToCart(id, product.id) }
                                                .onSuccess { snackbar.showSnackbar("تمت إضافة ${product.name} إلى السلة") }
                                                .onFailure { snackbar.showSnackbar(it.message ?: "تعذر إضافة المنتج.") }
                                        }
                                    }
                                }
                            }
                        }
                        if (rowProducts.size == 1) Spacer(Modifier.weight(1f))
                    }
                }
            } else if (error.isNotBlank()) {
                item {
                    Column(Modifier.fillMaxWidth().padding(vertical = 10.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error, color = FuchsiaColors.Muted, textAlign = TextAlign.Center)
                        Button(onClick = { refreshKey++ }, colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                            Icon(Icons.Rounded.Refresh, contentDescription = null, modifier = Modifier.size(17.dp))
                            Spacer(Modifier.width(6.dp))
                            Text("إعادة المحاولة")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun VenueBookingPromo(onClick: () -> Unit) {
        Card(onClick = onClick, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(21.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary), elevation = CardDefaults.cardElevation(defaultElevation = 4.dp)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 17.dp, vertical = 15.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Surface(shape = RoundedCornerShape(16.dp), color = Color.White.copy(alpha = .16f), modifier = Modifier.size(52.dp)) { Box(contentAlignment = Alignment.Center) { Icon(Icons.Rounded.CalendarMonth, contentDescription = null, tint = Color.White, modifier = Modifier.size(29.dp)) } }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                Text("حجز قاعة أعراس", color = Color.White, fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
                Text("ابحث عن صالة مناسبة واختر يومك من التقويم", color = Color.White.copy(alpha = .9f), fontSize = 12.sp)
            }
            Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null, tint = Color.White, modifier = Modifier.size(21.dp))
        }
    }
}

@Composable
private fun HomeHeader(name: String?, isGuest: Boolean, onCart: () -> Unit) {
    val darkTheme = isSystemInDarkTheme()
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = BorderStroke(1.dp, FuchsiaColors.Line),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp),
    ) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(7.dp)) {
            Image(
                painter = painterResource(R.drawable.fuchsia_app_icon),
                contentDescription = "شعار فوشيا بوكينج",
                modifier = Modifier.width(64.dp).height(44.dp),
                contentScale = ContentScale.Fit,
                colorFilter = if (darkTheme) ColorFilter.tint(Color.White) else null,
            )
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(0.dp)) {
                Text("فوشيا بوكينج", color = if (darkTheme) Color.White else FuchsiaColors.Primary, fontWeight = FontWeight.Bold, fontSize = 15.sp, letterSpacing = 0.1.sp)
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(1.dp)) {
                Text(if (isGuest) "أهلًا بك، ضيفنا" else "أهلًا ${name ?: "بك"}", color = FuchsiaColors.Ink, style = MaterialTheme.typography.labelLarge)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Rounded.LocationOn, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(14.dp))
                    Text("صنعاء، اليمن", color = FuchsiaColors.Muted, fontSize = 10.sp)
                }
            }
            HeaderIcon(Icons.Rounded.NotificationsNone, "الإشعارات") {}
            HeaderIcon(Icons.Rounded.ShoppingBag, "السلة", onCart)
        }
    }
    }
}

@Composable
private fun HeaderIcon(icon: androidx.compose.ui.graphics.vector.ImageVector, description: String, onClick: () -> Unit) {
    IconButton(onClick = onClick, modifier = Modifier.size(42.dp)) {
        Box(Modifier.size(36.dp).background(FuchsiaColors.White, CircleShape), contentAlignment = Alignment.Center) {
            Icon(icon, contentDescription = description, tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp))
        }
    }
}

@Composable
private fun HeroOffer(onClick: (() -> Unit)?) {
    Box(Modifier.fillMaxWidth().height(188.dp).clip(RoundedCornerShape(24.dp))) {
        Image(painterResource(R.drawable.welcome_hero), contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        Box(Modifier.fillMaxSize().background(Brush.horizontalGradient(listOf(Color(0xE8001520), Color(0x551B1020), Color.Transparent))))
        Column(Modifier.align(Alignment.CenterEnd).padding(horizontal = 20.dp), horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(5.dp)) {
            Text("عروض خاصة", color = Color.White, style = MaterialTheme.typography.labelLarge, modifier = Modifier.background(FuchsiaColors.Primary, RoundedCornerShape(10.dp)).padding(horizontal = 10.dp, vertical = 5.dp))
            Text("باقات الورد الفاخرة", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
            Text("لجميع مناسباتك السعيدة", color = Color.White.copy(alpha = .9f), fontSize = 12.sp)
            Button(onClick = { onClick?.invoke() }, enabled = onClick != null, shape = RoundedCornerShape(18.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary), contentPadding = PaddingValues(horizontal = 16.dp, vertical = 2.dp)) {
                Text("تسوق الآن", fontWeight = FontWeight.Bold)
                Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = null, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun OfferStrip(onClick: (() -> Unit)?) {
    Card(onClick = { onClick?.invoke() }, enabled = onClick != null, modifier = Modifier.fillMaxWidth().height(92.dp), shape = RoundedCornerShape(20.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.Primary)) {
        Box(Modifier.fillMaxSize()) {
            Image(painterResource(R.drawable.welcome_hero), contentDescription = null, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alpha = .28f)
            Row(Modifier.fillMaxSize().padding(horizontal = 17.dp), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Column(verticalArrangement = Arrangement.spacedBy(3.dp)) {
                    Text("خصم يصل إلى 20%", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 16.sp)
                    Text("على جميع باقات الورد", color = Color.White.copy(alpha = .9f), fontSize = 11.sp)
                }
                Button(onClick = { onClick?.invoke() }, enabled = onClick != null, colors = ButtonDefaults.buttonColors(containerColor = Color.White, contentColor = FuchsiaColors.Primary), shape = RoundedCornerShape(17.dp), contentPadding = PaddingValues(horizontal = 13.dp, vertical = 1.dp)) {
                    Text("تسوق الآن", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
private fun SectionHeading(title: String, detail: String) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.Bottom) {
        Text(title, style = MaterialTheme.typography.titleLarge, color = FuchsiaColors.Ink)
        if (detail.isNotBlank()) Text(detail, color = FuchsiaColors.TextAccent, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 12.sp))
    }
}

@Composable
private fun CategoryTile(category: StoreCategory, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.width(112.dp), shape = RoundedCornerShape(17.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Box(Modifier.fillMaxWidth().height(72.dp).background(FuchsiaColors.RoseLight)) {
                if (!category.imageUrl.isNullOrBlank()) AsyncImage(category.imageUrl, contentDescription = category.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Rounded.LocalFlorist, contentDescription = null, tint = FuchsiaColors.IconAccent, modifier = Modifier.align(Alignment.Center).size(28.dp))
            }
            Text(category.name, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, fontSize = 12.sp, modifier = Modifier.padding(vertical = 9.dp), maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
private fun QuickService(title: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = modifier.height(88.dp), shape = RoundedCornerShape(16.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line)) {
        Column(Modifier.fillMaxSize().padding(7.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterVertically)) {
            Box(Modifier.size(37.dp).background(FuchsiaColors.RoseLight, CircleShape), contentAlignment = Alignment.Center) { Icon(icon, contentDescription = title, tint = FuchsiaColors.IconAccent, modifier = Modifier.size(20.dp)) }
            Text(title, color = FuchsiaColors.Ink, fontSize = 10.sp, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
    }
}

@Composable
internal fun ProductCard(product: StoreProduct, modifier: Modifier = Modifier, onOpen: () -> Unit = {}, isFavorite: Boolean = false, onFavorite: () -> Unit = {}, onAdd: () -> Unit) {
    Card(modifier = modifier, shape = RoundedCornerShape(19.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = BorderStroke(1.dp, FuchsiaColors.Line), elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)) {
        Column {
            Box(Modifier.fillMaxWidth().height(132.dp).background(FuchsiaColors.RoseLight).clickable(onClick = onOpen)) {
                if (!product.imageUrl.isNullOrBlank()) AsyncImage(product.imageUrl, contentDescription = product.name, modifier = Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Icon(Icons.Rounded.CardGiftcard, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.align(Alignment.Center).size(35.dp))
                if (product.fulfillmentType == "rental") RentalTypeBadge(product.name, Modifier.align(Alignment.TopStart).padding(6.dp), compact = true, rentalCategory = product.rentalCategory)
                IconButton(onClick = onFavorite, modifier = Modifier.align(Alignment.TopEnd).padding(3.dp).size(35.dp)) {
                    Icon(if (isFavorite) Icons.Rounded.Favorite else Icons.Rounded.FavoriteBorder, contentDescription = if (isFavorite) "إزالة من المفضلة" else "إضافة للمفضلة", tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp))
                }
            }
            Column(Modifier.fillMaxWidth().padding(horizontal = 10.dp, vertical = 9.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                Text(product.name.ifBlank { "هدية فوشيا" }, color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium.copy(fontSize = 13.sp), maxLines = 2, minLines = 2, overflow = TextOverflow.Ellipsis)
                if (product.fulfillmentType == "rental") RentalAudienceBadge(product.eventAudience, compact = true)
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                    if (product.rating > 0) Text("★ ${String.format(Locale.US, "%.1f", product.rating)}", color = FuchsiaColors.Ink, fontSize = 10.sp)
                    else Text("جديد", color = FuchsiaColors.Muted, fontSize = 10.sp)
                    if (product.reviewCount > 0) Text("(${product.reviewCount})", color = FuchsiaColors.Muted, fontSize = 9.sp)
                }
                Text(if (product.fulfillmentType == "rental") "${formatRiyal(product.rentalDailyPrice ?: product.price)} لليوم" else formatRiyal(product.price), color = FuchsiaColors.TextAccent, fontWeight = FontWeight.ExtraBold, fontSize = 14.sp)
                Button(onClick = if (product.fulfillmentType == "rental") onOpen else onAdd, modifier = Modifier.fillMaxWidth().height(37.dp), shape = RoundedCornerShape(12.dp), contentPadding = PaddingValues(horizontal = 5.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                    Icon(if (product.fulfillmentType == "rental") Icons.Rounded.EventAvailable else Icons.Rounded.AddShoppingCart, contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(3.dp))
                    Text(if (product.fulfillmentType == "rental") "احجز الإيجار" else "إضافة للسلة", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

internal fun formatRiyal(value: Double): String = FuchsiaFormatters.yemeniRiyal(value)
