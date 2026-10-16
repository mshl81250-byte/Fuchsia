package com.fuchsia.platform.compose.ui.theme

import androidx.compose.runtime.Composable
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.ui.graphics.Color
import com.fuchsia.designsystem.FuchsiaColors as SharedFuchsiaColors
import com.fuchsia.designsystem.FuchsiaTheme as SharedFuchsiaTheme

/** Compatibility facade while existing customer screens migrate to shared design tokens. */
object FuchsiaColors {
    val Primary: Color @Composable get() = SharedFuchsiaColors.Primary
    val PrimaryDark: Color @Composable get() = SharedFuchsiaColors.PrimaryDark
    val Rose: Color @Composable get() = SharedFuchsiaColors.Rose
    val RoseLight: Color @Composable get() = SharedFuchsiaColors.RoseLight
    val Cream: Color @Composable get() = SharedFuchsiaColors.Cream
    val Ink: Color @Composable get() = SharedFuchsiaColors.Ink
    val Muted: Color @Composable get() = SharedFuchsiaColors.Muted
    val Line: Color @Composable get() = SharedFuchsiaColors.Line
    val Gold: Color @Composable get() = SharedFuchsiaColors.Gold
    val White: Color @Composable get() = SharedFuchsiaColors.White
    val TextAccent: Color @Composable get() = SharedFuchsiaColors.TextAccent
    val IconAccent: Color @Composable get() = SharedFuchsiaColors.IconAccent
    val Success: Color @Composable get() = SharedFuchsiaColors.Success
    val Warning: Color @Composable get() = SharedFuchsiaColors.Warning
    val Error: Color @Composable get() = SharedFuchsiaColors.Error
    val Info: Color @Composable get() = SharedFuchsiaColors.Info
}

@Composable
fun FuchsiaTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    SharedFuchsiaTheme(darkTheme = darkTheme, content = content)
}
