package com.fuchsia.platform.compose.ui.screens

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CardGiftcard
import androidx.compose.material.icons.rounded.EventAvailable
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.LocalFlorist
import androidx.compose.material.icons.rounded.Place
import androidx.compose.material.icons.rounded.Restaurant
import androidx.compose.material.icons.rounded.ShoppingBag
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.R
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun WelcomeScreen(
    onExplore: () -> Unit,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onCategory: (Int) -> Unit,
    onReservation: () -> Unit,
    onGiftOrder: () -> Unit,
) {
    var page by rememberSaveable { mutableIntStateOf(0) }
    BackHandler(enabled = page > 0) { page -= 1 }

    AnimatedContent(
        targetState = page,
        label = "welcome-page-transition",
        transitionSpec = {
            val entering = if (targetState > initialState) {
                slideInHorizontally(tween(360)) { it / 3 } + fadeIn(tween(240))
            } else {
                slideInHorizontally(tween(320)) { -it / 3 } + fadeIn(tween(220))
            }
            val exiting = if (targetState > initialState) {
                slideOutHorizontally(tween(300)) { -it / 3 } + fadeOut(tween(180))
            } else {
                slideOutHorizontally(tween(280)) { it / 3 } + fadeOut(tween(160))
            }
            entering togetherWith exiting
        },
        modifier = Modifier.fillMaxSize(),
    ) { currentPage ->
        when (currentPage) {
            0 -> FirstWelcomePage(onNext = { page = 1 }, onSkip = onExplore)
            1 -> SecondWelcomePage(
                onBack = { page = 0 },
                onNext = onExplore,
                onLogin = onLogin,
                onRegister = onRegister,
                onCategory = onCategory,
                onReservation = onReservation,
                onGiftOrder = onGiftOrder,
            )
            else -> SecondWelcomePage(
                onBack = { page = 0 },
                onNext = onExplore,
                onLogin = onLogin,
                onRegister = onRegister,
                onCategory = onCategory,
                onReservation = onReservation,
                onGiftOrder = onGiftOrder,
            )
        }
    }
}

@Composable
private fun FirstWelcomePage(onNext: () -> Unit, onSkip: () -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize().background(FuchsiaColors.Cream)) {
        val compact = maxHeight < 700.dp
        val heroHeight = if (compact) 166.dp else (maxHeight * 0.255f).coerceIn(188.dp, 224.dp)
        val base = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 20.dp, vertical = 9.dp)
        val pageModifier = if (compact) base.verticalScroll(rememberScrollState()) else base

        Column(pageModifier) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                BrandHeader()
                HeroCard(height = heroHeight)
                Column(verticalArrangement = Arrangement.spacedBy(5.dp)) {
                    Text(
                        "كل مناسبة تستحق\nلمسة مميزة",
                        style = MaterialTheme.typography.headlineMedium,
                        color = FuchsiaColors.Ink,
                        textAlign = TextAlign.Start,
                    )
                    Text(
                        "استكشف أجمل الهدايا وتنسيقات الورود للمناسبات المختلفة.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = FuchsiaColors.Muted,
                        textAlign = TextAlign.Start,
                    )
                }
            }

            if (compact) Spacer(Modifier.height(19.dp)) else Spacer(Modifier.weight(1f))

            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                WelcomePageIndicator(page = 0)
                Button(
                    onClick = onNext,
                    modifier = Modifier.fillMaxWidth().height(58.dp),
                    shape = RoundedCornerShape(19.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
                ) {
                    Text("التالي", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                    Spacer(Modifier.width(9.dp))
                    Icon(Icons.Rounded.FavoriteBorder, contentDescription = null, modifier = Modifier.size(20.dp))
                }
                TextButton(onClick = onSkip, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("تخطي", color = FuchsiaColors.Muted) }
                Text("تظهر هذه الجولة مرة واحدة عند التثبيت الأول فقط.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall, textAlign = TextAlign.Center, modifier = Modifier.fillMaxWidth())
            }
        }
    }
}

@Composable
private fun SecondWelcomePage(
    onBack: () -> Unit,
    onNext: () -> Unit,
    onLogin: () -> Unit,
    onRegister: () -> Unit,
    onCategory: (Int) -> Unit,
    onReservation: () -> Unit,
    onGiftOrder: () -> Unit,
) {
    BoxWithConstraints(Modifier.fillMaxSize().background(FuchsiaColors.Cream)) {
        val compact = maxHeight < 730.dp
        val base = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 20.dp, vertical = 9.dp)
        val pageModifier = if (compact) base.verticalScroll(rememberScrollState()) else base

        Column(pageModifier) {
            BrandHeader()
            Column(verticalArrangement = Arrangement.spacedBy(5.dp), modifier = Modifier.padding(top = 8.dp)) {
                Text("تنسيق متكامل لمناسباتك", color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineMedium)
                Text("باقات ورد وهدايا وتجهيزات تناسب جميع الاحتفالات.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
            }
            Column(Modifier.padding(top = 13.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    CategoryAction("هدايا فاخرة", Icons.Rounded.CardGiftcard, onGiftOrder, Modifier.weight(1f))
                    CategoryAction("حجز طاولة", Icons.Rounded.Restaurant, onReservation, Modifier.weight(1f))
                }
                Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                    CategoryAction("ورود وزهور", Icons.Rounded.LocalFlorist, { onCategory(6) }, Modifier.weight(1f))
                    CategoryAction("تنسيق مناسبات", Icons.Rounded.EventAvailable, { onCategory(2) }, Modifier.weight(1f))
                }
            }
            Column(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                WelcomeFeature(Icons.Rounded.Place, "عناوين وموقع توصيل محفوظ", "اختر نقطة التسليم على الخريطة واحفظ عناوينك المفضلة.")
                WelcomeFeature(Icons.Rounded.ShoppingBag, "طلباتي وتتبّعها", "ارجع إلى سجل الطلبات لمتابعة آخر تحديث من المتجر.")
            }

            if (compact) Spacer(Modifier.height(18.dp)) else Spacer(Modifier.weight(1f))

            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                WelcomePageIndicator(page = 1)
                Button(
                    onClick = onNext,
                    modifier = Modifier.fillMaxWidth().height(54.dp),
                    shape = RoundedCornerShape(18.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 3.dp, pressedElevation = 1.dp),
                ) {
                    Icon(Icons.Rounded.ShoppingBag, contentDescription = null, modifier = Modifier.size(20.dp))
                    Spacer(Modifier.width(9.dp))
                    Text("ابدأ الآن", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                }
                TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) {
                    Text("العودة إلى الصفحة الأولى", color = FuchsiaColors.Muted)
                }
            }
        }
    }
}

@Composable
private fun ThirdWelcomePage(onBack: () -> Unit, onExplore: () -> Unit, onLogin: () -> Unit, onRegister: () -> Unit) {
    BoxWithConstraints(Modifier.fillMaxSize().background(FuchsiaColors.Cream)) {
        val compact = maxHeight < 700.dp
        val base = Modifier.fillMaxSize().windowInsetsPadding(WindowInsets.safeDrawing).padding(horizontal = 20.dp, vertical = 9.dp)
        val pageModifier = if (compact) base.verticalScroll(rememberScrollState()) else base
        Column(pageModifier) {
            BrandHeader()
            Spacer(if (compact) Modifier.height(22.dp) else Modifier.weight(1f))
            Card(shape = RoundedCornerShape(24.dp), colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White), border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line)) {
                Column(Modifier.fillMaxWidth().padding(20.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("كيف تريد البدء؟", color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.Bold)
                    Text("اختر الطريقة الأنسب لك واستمتع بتجربة فوشيا.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
                    Button(onClick = onLogin, modifier = Modifier.fillMaxWidth().padding(top = 8.dp).height(52.dp), shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                        Text("تسجيل الدخول", fontWeight = FontWeight.Bold)
                    }
                    Button(onClick = onRegister, modifier = Modifier.fillMaxWidth().height(52.dp), shape = RoundedCornerShape(16.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) {
                        Text("إنشاء حساب جديد", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold)
                    }
                    TextButton(onClick = onExplore) { Text("تصفح دون حساب", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold) }
                }
            }
            Spacer(Modifier.height(12.dp))
            TextButton(onClick = onBack, modifier = Modifier.align(Alignment.CenterHorizontally)) { Text("العودة للشاشات الترحيبية", color = FuchsiaColors.Muted) }
        }
    }
}

@Composable
private fun WelcomePageIndicator(page: Int) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
        repeat(2) { index ->
            Box(
                Modifier.padding(horizontal = 3.dp).size(width = if (index == page) 22.dp else 7.dp, height = 7.dp)
                    .background(if (index == page) FuchsiaColors.Primary else FuchsiaColors.Line, CircleShape),
            )
        }
        Spacer(Modifier.width(7.dp))
        Text("${page + 1} من ٢", color = FuchsiaColors.Muted, style = MaterialTheme.typography.labelSmall)
    }
}

@Composable
private fun WelcomeFeature(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, subtitle: String) {
    Card(
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
    ) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(11.dp)) {
            Surface(Modifier.size(38.dp), shape = RoundedCornerShape(12.dp), color = FuchsiaColors.RoseLight) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(20.dp)) }
            }
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
                Text(title, color = FuchsiaColors.Ink, fontWeight = FontWeight.Bold, style = MaterialTheme.typography.bodyMedium)
                Text(subtitle, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodySmall)
            }
        }
    }
}

@Composable
private fun BrandHeader() {
    Row(
        modifier = Modifier.fillMaxWidth().height(66.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Image(
                painter = painterResource(R.drawable.fuchsia_app_icon),
                contentDescription = "شعار فوشيا بوكينج",
                modifier = Modifier.width(68.dp).height(48.dp),
                contentScale = ContentScale.Fit,
                colorFilter = if (MaterialTheme.colorScheme.onSurface.luminance() > 0.8f) ColorFilter.tint(Color.White) else null,
            )
            Column(horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(0.dp)) {
                Text("فوشيا بوكينج", color = FuchsiaColors.Primary, fontWeight = FontWeight.Bold, fontSize = 16.sp, letterSpacing = 0.1.sp)
            }
        }
        Surface(shape = RoundedCornerShape(50), color = FuchsiaColors.White, tonalElevation = 0.dp, shadowElevation = 1.dp) {
            Row(Modifier.padding(horizontal = 11.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
                Icon(Icons.Rounded.Place, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp))
                Text("صنعاء · اليمن", style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp), color = FuchsiaColors.Ink)
            }
        }
    }
}

@Composable
private fun HeroCard(height: Dp) {
    Box(Modifier.fillMaxWidth().height(height).clip(RoundedCornerShape(25.dp))) {
        Image(
            painter = painterResource(R.drawable.welcome_hero),
            contentDescription = "هدية فاخرة مع باقة ورد",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(0.0f to Color.Transparent, 0.48f to Color(0x140D0710), 1.0f to Color(0xB80D0710)),
            ),
        )
        Surface(Modifier.align(Alignment.TopEnd).padding(13.dp), shape = RoundedCornerShape(50), color = FuchsiaColors.White.copy(alpha = 0.94f)) {
            Row(Modifier.padding(horizontal = 11.dp, vertical = 8.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Icon(Icons.Rounded.FavoriteBorder, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp))
                Text("تفاصيل تصنع الذكرى", style = MaterialTheme.typography.labelLarge.copy(fontSize = 11.sp), color = FuchsiaColors.Ink)
            }
        }
        Column(Modifier.align(Alignment.BottomEnd).padding(15.dp), horizontalAlignment = Alignment.End, verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Text("اختيارات بعناية لكل مناسبة", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            Text("هدايا · زهور · مناسبات", color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
        }
    }
}

@Composable
private fun CategoryAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.height(62.dp).clickable(onClick = onClick),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp, pressedElevation = 2.dp),
    ) {
        Row(Modifier.fillMaxSize().padding(horizontal = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(9.dp)) {
            Surface(Modifier.size(39.dp), shape = RoundedCornerShape(13.dp), color = FuchsiaColors.RoseLight) {
                Box(contentAlignment = Alignment.Center) { Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp)) }
            }
            Text(label, modifier = Modifier.weight(1f), style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp), color = FuchsiaColors.Ink, maxLines = 1, textAlign = TextAlign.Start)
            Box(Modifier.size(5.dp).background(FuchsiaColors.Gold.copy(alpha = 0.65f), CircleShape))
        }
    }
}
