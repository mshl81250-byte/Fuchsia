package com.fuchsia.platform.compose.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
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
) {
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(FuchsiaColors.Cream),
    ) {
        val compact = maxHeight < 700.dp
        val heroHeight = if (compact) 166.dp else (maxHeight * 0.255f).coerceIn(188.dp, 224.dp)
        val baseModifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.safeDrawing)
            .padding(horizontal = 20.dp, vertical = 9.dp)
        val contentModifier = if (compact) baseModifier.verticalScroll(rememberScrollState()) else baseModifier

        Column(modifier = contentModifier) {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                BrandHeader()
                HeroCard(height = heroHeight)
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                    Text(
                        text = "لكل لحظة جميلة،\nهدية تليق بها",
                        style = MaterialTheme.typography.headlineMedium,
                        color = FuchsiaColors.Ink,
                        textAlign = TextAlign.Start,
                    )
                    Text(
                        text = "هدايا، ورد، وتنسيق مناسبات بلمسة أنيقة.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = FuchsiaColors.Muted,
                        textAlign = TextAlign.Start,
                    )
                }
                Column(verticalArrangement = Arrangement.spacedBy(9.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        CategoryAction("هدايا فاخرة", Icons.Rounded.CardGiftcard, 4, onCategory, Modifier.weight(1f))
                        CategoryAction("طاولات مناسبات", Icons.Rounded.Restaurant, 3, onCategory, Modifier.weight(1f))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(9.dp)) {
                        CategoryAction("ورود وزهور", Icons.Rounded.LocalFlorist, 6, onCategory, Modifier.weight(1f))
                        CategoryAction("تجهيز الخطوبة", Icons.Rounded.EventAvailable, 2, onCategory, Modifier.weight(1f))
                    }
                }
            }

            if (compact) Spacer(Modifier.height(14.dp)) else Spacer(Modifier.weight(1f))

            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = onExplore,
                    modifier = Modifier.fillMaxWidth().height(58.dp),
                    shape = RoundedCornerShape(19.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                    elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp, pressedElevation = 1.dp),
                ) {
                    Icon(Icons.Rounded.ShoppingBag, contentDescription = null, modifier = Modifier.size(21.dp))
                    Spacer(Modifier.width(11.dp))
                    Text("تصفّحي المجموعة", fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                Row(
                    modifier = Modifier.fillMaxWidth().height(46.dp),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    TextButton(onClick = onLogin) {
                        Text("تسجيل الدخول", color = FuchsiaColors.PrimaryDark, fontWeight = FontWeight.Bold)
                    }
                    Box(Modifier.width(1.dp).height(20.dp).background(FuchsiaColors.Line))
                    TextButton(onClick = onRegister) {
                        Text("إنشاء حساب", color = FuchsiaColors.PrimaryDark, fontWeight = FontWeight.Bold)
                    }
                }
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
        Image(
            painter = painterResource(R.drawable.fuchsia_logo),
            contentDescription = "شعار فوشيا بوتيك",
            modifier = Modifier.width(92.dp).height(62.dp),
            contentScale = ContentScale.Fit,
        )
        Surface(
            shape = RoundedCornerShape(50),
            color = FuchsiaColors.White,
            tonalElevation = 0.dp,
            shadowElevation = 1.dp,
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 11.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                Icon(Icons.Rounded.Place, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp))
                Text("صنعاء · اليمن", style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp), color = FuchsiaColors.Ink)
            }
        }
    }
}

@Composable
private fun HeroCard(height: Dp) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(25.dp)),
    ) {
        Image(
            painter = painterResource(R.drawable.welcome_hero),
            contentDescription = "هدية فاخرة مع باقة ورد",
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier.fillMaxSize().background(
                Brush.verticalGradient(
                    0.0f to Color.Transparent,
                    0.48f to Color(0x140D0710),
                    1.0f to Color(0xB80D0710),
                ),
            ),
        )
        Surface(
            modifier = Modifier.align(Alignment.TopEnd).padding(13.dp),
            shape = RoundedCornerShape(50),
            color = FuchsiaColors.White.copy(alpha = 0.94f),
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 11.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Icon(Icons.Rounded.FavoriteBorder, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(16.dp))
                Text("تفاصيل تصنع الذكرى", style = MaterialTheme.typography.labelLarge.copy(fontSize = 11.sp), color = FuchsiaColors.Ink)
            }
        }
        Column(
            modifier = Modifier.align(Alignment.BottomEnd).padding(15.dp),
            horizontalAlignment = Alignment.End,
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text("مختارة بعناية، لكِ", color = Color.White, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            Text("هدايا · زهور · مناسبات", color = Color.White.copy(alpha = 0.9f), fontSize = 12.sp)
        }
    }
}

@Composable
private fun CategoryAction(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    id: Int,
    onCategory: (Int) -> Unit,
    modifier: Modifier = Modifier,
) {
    Card(
        modifier = modifier.height(62.dp).clickable(onClick = { onCategory(id) }),
        shape = RoundedCornerShape(17.dp),
        colors = CardDefaults.cardColors(containerColor = FuchsiaColors.White),
        border = androidx.compose.foundation.BorderStroke(1.dp, FuchsiaColors.Line),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp, pressedElevation = 2.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxSize().padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(9.dp),
        ) {
            Surface(modifier = Modifier.size(39.dp), shape = RoundedCornerShape(13.dp), color = FuchsiaColors.RoseLight) {
                Box(contentAlignment = Alignment.Center) {
                    Icon(icon, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(21.dp))
                }
            }
            Text(
                text = label,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.labelLarge.copy(fontSize = 12.sp),
                color = FuchsiaColors.Ink,
                maxLines = 1,
                textAlign = TextAlign.Start,
            )
            Box(Modifier.size(5.dp).background(FuchsiaColors.Gold.copy(alpha = 0.65f), CircleShape))
        }
    }
}
