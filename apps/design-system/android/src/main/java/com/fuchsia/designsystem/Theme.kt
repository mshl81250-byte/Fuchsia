package com.fuchsia.designsystem

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.platform.LocalLayoutDirection
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
    val textAccent: Color,
    val iconAccent: Color,
    val success: Color,
    val warning: Color,
    val error: Color,
    val info: Color,
)

private val LightPalette = FuchsiaPalette(
    primary = Color(0xFF760132),
    primaryDark = Color(0xFF560024),
    rose = Color(0xFFF1E8E4),
    roseLight = Color(0xFFFCF8F5),
    cream = Color(0xFFFBF7F2),
    ink = Color(0xFF2D1519),
    muted = Color(0xFF68565A),
    line = Color(0xFFE5D8D7),
    gold = Color(0xFF92703A),
    surface = Color(0xFFFFFFFF),
    textAccent = Color(0xFF760132),
    iconAccent = Color(0xFF760132),
    success = Color(0xFF2F6D50),
    warning = Color(0xFF795611),
    error = Color(0xFFB3261E),
    info = Color(0xFF345A78),
)

private val DarkPalette = FuchsiaPalette(
    // ألوان مأخوذة من الصورة المرجعية: خلفية #100B0F ولون الشعار #760032.
    primary = Color(0xFF760032),
    primaryDark = Color(0xFF560024),
    rose = Color(0xFF760032),
    roseLight = Color(0xFF3A0019),
    cream = Color(0xFF100B0F),
    ink = Color(0xFFFFF3F5),
    muted = Color(0xFFCBB8C0),
    line = Color(0xFF4A2033),
    gold = Color(0xFFD2B27A),
    surface = Color(0xFF100B0F),
    // درجة عنابية فاتحة مشتقة من لون الشعار لضمان وضوح الأيقونات والنصوص على الخلفية الليلية.
    textAccent = Color(0xFFD9A6B8),
    iconAccent = Color(0xFFD9A6B8),
    success = Color(0xFF8BD8AA),
    warning = Color(0xFFEBCB83),
    error = Color(0xFFFFB4AB),
    info = Color(0xFFA9D1F0),
)

private val LocalFuchsiaPalette = staticCompositionLocalOf { LightPalette }

object FuchsiaColors {
    val Primary: Color @Composable get() = LocalFuchsiaPalette.current.primary
    val PrimaryDark: Color @Composable get() = LocalFuchsiaPalette.current.primaryDark
    val Rose: Color @Composable get() = LocalFuchsiaPalette.current.rose
    val RoseLight: Color @Composable get() = LocalFuchsiaPalette.current.roseLight
    val Cream: Color @Composable get() = LocalFuchsiaPalette.current.cream
    val Ink: Color @Composable get() = LocalFuchsiaPalette.current.ink
    val Muted: Color @Composable get() = LocalFuchsiaPalette.current.muted
    val Line: Color @Composable get() = LocalFuchsiaPalette.current.line
    val Gold: Color @Composable get() = LocalFuchsiaPalette.current.gold
    val White: Color @Composable get() = LocalFuchsiaPalette.current.surface
    val OnPrimary: Color @Composable get() = Color.White
    val TextAccent: Color @Composable get() = LocalFuchsiaPalette.current.textAccent
    val IconAccent: Color @Composable get() = LocalFuchsiaPalette.current.iconAccent
    val Success: Color @Composable get() = LocalFuchsiaPalette.current.success
    val Warning: Color @Composable get() = LocalFuchsiaPalette.current.warning
    val Error: Color @Composable get() = LocalFuchsiaPalette.current.error
    val Info: Color @Composable get() = LocalFuchsiaPalette.current.info
}

private val Cairo = FontFamily(
    Font(R.font.cairo_regular, FontWeight.Normal),
    Font(R.font.cairo_semibold, FontWeight.SemiBold),
    Font(R.font.cairo_bold, FontWeight.Bold),
)

private fun cairoStyle(size: Int, lineHeight: Int, weight: FontWeight = FontWeight.Normal) =
    TextStyle(fontFamily = Cairo, fontWeight = weight, fontSize = size.sp, lineHeight = lineHeight.sp)

private val BoutiqueTypography = Typography(
    displayLarge = cairoStyle(57, 68, FontWeight.Bold),
    displayMedium = cairoStyle(45, 56, FontWeight.Bold),
    displaySmall = cairoStyle(36, 46, FontWeight.Bold),
    headlineLarge = cairoStyle(30, 39, FontWeight.Bold),
    headlineMedium = cairoStyle(26, 35, FontWeight.Bold),
    headlineSmall = cairoStyle(23, 32, FontWeight.Bold),
    titleLarge = cairoStyle(19, 28, FontWeight.Bold),
    titleMedium = cairoStyle(16, 24, FontWeight.SemiBold),
    titleSmall = cairoStyle(14, 21, FontWeight.SemiBold),
    bodyLarge = cairoStyle(18, 28),
    bodyMedium = cairoStyle(16, 25),
    bodySmall = cairoStyle(14, 21),
    labelLarge = cairoStyle(15, 21, FontWeight.SemiBold),
    labelMedium = cairoStyle(13, 19, FontWeight.SemiBold),
    labelSmall = cairoStyle(12, 17, FontWeight.SemiBold),
)

@Composable
fun FuchsiaTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    val palette = if (darkTheme) DarkPalette else LightPalette
    val scheme = if (darkTheme) {
        darkColorScheme(
            primary = palette.primary,
            onPrimary = Color.White,
            primaryContainer = palette.rose,
            onPrimaryContainer = Color(0xFFFFE8EC),
            secondary = palette.gold,
            onSecondary = Color(0xFF2B1B06),
            secondaryContainer = Color(0xFF40301A),
            onSecondaryContainer = Color(0xFFFFEBC0),
            tertiary = palette.info,
            onTertiary = Color(0xFF102030),
            background = palette.cream,
            onBackground = palette.ink,
            surface = palette.surface,
            onSurface = palette.ink,
            surfaceVariant = palette.roseLight,
            onSurfaceVariant = palette.muted,
            outline = palette.line,
            outlineVariant = palette.line,
            error = palette.error,
            onError = Color(0xFF3B0808),
            inverseSurface = Color(0xFFF5EDEF),
            inverseOnSurface = Color(0xFF2D1519),
            inversePrimary = Color(0xFF9A174D),
            surfaceTint = Color.Transparent,
        )
    } else {
        lightColorScheme(
            primary = palette.primary,
            onPrimary = Color.White,
            primaryContainer = palette.rose,
            onPrimaryContainer = palette.primaryDark,
            secondary = palette.gold,
            onSecondary = Color.White,
            secondaryContainer = palette.rose,
            onSecondaryContainer = palette.ink,
            tertiary = palette.info,
            onTertiary = Color.White,
            background = palette.cream,
            onBackground = palette.ink,
            surface = palette.surface,
            onSurface = palette.ink,
            surfaceVariant = palette.roseLight,
            onSurfaceVariant = palette.muted,
            outline = palette.line,
            outlineVariant = palette.line,
            error = palette.error,
            onError = Color.White,
            inverseSurface = Color(0xFF3A2A30),
            inverseOnSurface = Color(0xFFFFF3F5),
            inversePrimary = Color(0xFFFFB0C7),
            surfaceTint = Color.Transparent,
        )
    }

    CompositionLocalProvider(
        LocalLayoutDirection provides LayoutDirection.Rtl,
        LocalFuchsiaPalette provides palette,
    ) {
        MaterialTheme(colorScheme = scheme, typography = BoutiqueTypography, content = content)
    }
}
