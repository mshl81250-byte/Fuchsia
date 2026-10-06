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
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.sp

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
    val success: Color,
    val error: Color,
)

private val LightPalette = FuchsiaPalette(
    primary = Color(0xFFA40D50),
    primaryDark = Color(0xFF760A3A),
    rose = Color(0xFFF5E6ED),
    roseLight = Color(0xFFFFF2F7),
    cream = Color(0xFFFBF7F2),
    ink = Color(0xFF2D1721),
    muted = Color(0xFF85727B),
    line = Color(0xFFE9DDE2),
    gold = Color(0xFFB48B52),
    surface = Color(0xFFFFFFFF),
    success = Color(0xFF377456),
    error = Color(0xFFB3261E),
)

private val DarkPalette = FuchsiaPalette(
    primary = Color(0xFFF075A6),
    primaryDark = Color(0xFFFFAAC8),
    rose = Color(0xFF382630),
    roseLight = Color(0xFF30202A),
    cream = Color(0xFF17131A),
    ink = Color(0xFFF5EDF1),
    muted = Color(0xFFB6A6AF),
    line = Color(0xFF44323C),
    gold = Color(0xFFD2AA72),
    surface = Color(0xFF241E26),
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
    val Success: Color
        @Composable get() = LocalFuchsiaPalette.current.success
    val Error: Color
        @Composable get() = LocalFuchsiaPalette.current.error
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
fun FuchsiaTheme(darkTheme: Boolean = false, content: @Composable () -> Unit) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val colorScheme = if (darkTheme) {
        darkColorScheme(
            primary = palette.primary,
            onPrimary = Color(0xFF35111F),
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
