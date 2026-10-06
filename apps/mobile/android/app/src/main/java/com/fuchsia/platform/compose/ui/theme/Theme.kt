package com.fuchsia.platform.compose.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp

object FuchsiaColors {
    val Primary = Color(0xFFA40D50)
    val PrimaryDark = Color(0xFF760A3A)
    val Rose = Color(0xFFF5E6ED)
    val RoseLight = Color(0xFFFFF2F7)
    val Cream = Color(0xFFFBF7F2)
    val Ink = Color(0xFF2D1721)
    val Muted = Color(0xFF85727B)
    val Line = Color(0xFFE9DDE2)
    val Gold = Color(0xFFB48B52)
    val White = Color(0xFFFFFFFF)
    val Success = Color(0xFF377456)
    val Error = Color(0xFFB3261E)
}

private val BoutiqueTypography = androidx.compose.material3.Typography(
    headlineLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 30.sp, lineHeight = 37.sp),
    headlineMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.ExtraBold, fontSize = 26.sp, lineHeight = 33.sp),
    titleLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 19.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 16.sp, lineHeight = 23.sp),
    bodyLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 25.sp),
    bodyMedium = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontFamily = FontFamily.SansSerif, fontWeight = FontWeight.Bold, fontSize = 14.sp, lineHeight = 19.sp),
)

@Composable
fun FuchsiaTheme(content: @Composable () -> Unit) {
    val colors = lightColorScheme(
        primary = FuchsiaColors.Primary,
        onPrimary = FuchsiaColors.White,
        secondary = FuchsiaColors.Gold,
        onSecondary = FuchsiaColors.White,
        background = FuchsiaColors.Cream,
        onBackground = FuchsiaColors.Ink,
        surface = FuchsiaColors.White,
        onSurface = FuchsiaColors.Ink,
        error = FuchsiaColors.Error,
    )
    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        MaterialTheme(colorScheme = colors, typography = BoutiqueTypography, content = content)
    }
}
