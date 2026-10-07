package com.fuchsia.platform.compose.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp
import com.fuchsia.platform.compose.R

private data class FuchsiaPalette(
    val primary: Color,
    val primaryDark: Color,
    val rose: Color,
    val roseLight: Color,
    val cream: Color,
    val ink: Color,
    val muted: Color,
    val line: Color,
    val gold: Color,
    val surface: Color,
    val textAccent: Color,
    val iconAccent: Color,
    val success: Color,
    val error: Color,
)

private val LightPalette = FuchsiaPalette(
    // Brand red extracted from the Fuchsia logo (#760132), not bright pink.
    primary = Color(0xFF760132),
    primaryDark = Color(0xFF560024),
    rose = Color(0xFFF1E8E4),
    roseLight = Color(0xFFFCF8F5),
    cream = Color(0xFFFBF7F2),
    ink = Color(0xFF2D1519),
    muted = Color(0xFF806B6E),
    line = Color(0xFFE8D8D9),
    gold = Color(0xFF8F2940),
    surface = Color(0xFFFFFFFF),
    textAccent = Color(0xFF760132),
    iconAccent = Color(0xFF760132),
    success = Color(0xFF377456),
    error = Color(0xFFB3261E),
)

private val DarkPalette = FuchsiaPalette(
    primary = Color(0xFF760132),
    primaryDark = Color(0xFFB83A55),
    rose = Color(0xFF382A29),
    roseLight = Color(0xFF2A2220),
    cream = Color(0xFF171314),
    ink = Color(0xFFFFFFFF),
    muted = Color(0xFFD0C8CE),
    line = Color(0xFF4B3437),
    gold = Color(0xFFC45A6C),
    surface = Color(0xFF1E1E1E),
    textAccent = Color(0xFFFFFFFF),
    iconAccent = Color(0xFFFFFFFF),
    success = Color(0xFF71C297),
    error = Color(0xFFF28B82),
)

private val LocalFuchsiaPalette = staticCompositionLocalOf { LightPalette }

object FuchsiaColors {
    val Primary: Color
        @Composable get() = LocalFuchsiaPalette.current.primary
    val PrimaryDark: Color
        @Composable get() = LocalFuchsiaPalette.current.primaryDark
    val Rose: Color
        @Composable get() = LocalFuchsiaPalette.current.rose
    val RoseLight: Color
        @Composable get() = LocalFuchsiaPalette.current.roseLight
    val Cream: Color
        @Composable get() = LocalFuchsiaPalette.current.cream
    val Ink: Color
        @Composable get() = LocalFuchsiaPalette.current.ink
    val Muted: Color
        @Composable get() = LocalFuchsiaPalette.current.muted
    val Line: Color
        @Composable get() = LocalFuchsiaPalette.current.line
    val Gold: Color
        @Composable get() = LocalFuchsiaPalette.current.gold
    val White: Color
        @Composable get() = LocalFuchsiaPalette.current.surface
    val TextAccent: Color
        @Composable get() = LocalFuchsiaPalette.current.textAccent
    val IconAccent: Color
        @Composable get() = LocalFuchsiaPalette.current.iconAccent
    val Success: Color
        @Composable get() = LocalFuchsiaPalette.current.success
    val Error: Color
        @Composable get() = LocalFuchsiaPalette.current.error
}

private val Cairo = FontFamily(
    Font(R.font.cairo_regular, FontWeight.Normal),
    Font(R.font.cairo_semibold, FontWeight.SemiBold),
    Font(R.font.cairo_bold, FontWeight.Bold),
)

private val BoutiqueTypography = androidx.compose.material3.Typography(
    headlineLarge = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.Bold, fontSize = 30.sp, lineHeight = 37.sp),
    headlineMedium = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.Bold, fontSize = 26.sp, lineHeight = 33.sp),
    titleLarge = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.Bold, fontSize = 19.sp, lineHeight = 26.sp),
    titleMedium = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.SemiBold, fontSize = 16.sp, lineHeight = 23.sp),
    bodyLarge = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.Normal, fontSize = 16.sp, lineHeight = 25.sp),
    bodyMedium = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.Normal, fontSize = 14.sp, lineHeight = 22.sp),
    labelLarge = TextStyle(fontFamily = Cairo, fontWeight = FontWeight.SemiBold, fontSize = 14.sp, lineHeight = 19.sp),
)

@Composable
fun FuchsiaTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = palette.primary,
            onPrimary = Color.White,
            secondary = palette.gold,
            onSecondary = Color(0xFF2B1D0D),
            background = palette.cream,
            onBackground = palette.ink,
            surface = palette.surface,
            onSurface = palette.ink,
            surfaceVariant = palette.rose,
            onSurfaceVariant = palette.muted,
            outline = palette.line,
            error = palette.error,
        )
    } else {
        lightColorScheme(
            primary = palette.primary,
            onPrimary = Color.White,
            secondary = palette.gold,
            onSecondary = Color.White,
            background = palette.cream,
            onBackground = palette.ink,
            surface = palette.surface,
            onSurface = palette.ink,
            surfaceVariant = palette.rose,
            onSurfaceVariant = palette.muted,
            outline = palette.line,
            error = palette.error,
        )
    }
    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl,
        LocalFuchsiaPalette provides palette,
    ) {
        MaterialTheme(colorScheme = colorScheme, typography = BoutiqueTypography, content = content)
    }
}
