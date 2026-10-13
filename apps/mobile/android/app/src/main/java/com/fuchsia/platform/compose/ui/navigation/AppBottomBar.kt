package com.fuchsia.platform.compose.ui.navigation

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.unit.dp
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors

@Composable
fun FuchsiaBottomBar(selectedRoute: String, onSelect: (String) -> Unit) {
    val tabs = listOf(
        BottomTab(AppRoutes.Home, "الرئيسية", Icons.Rounded.Home),
        BottomTab(AppRoutes.Categories, "التصنيفات", Icons.Rounded.Category),
        BottomTab(AppRoutes.Wishlist, "المفضلة", Icons.Rounded.FavoriteBorder),
        BottomTab(AppRoutes.Cart, "السلة", Icons.Rounded.ShoppingCart),
        BottomTab(AppRoutes.OrdersRoot, "طلباتي", Icons.AutoMirrored.Rounded.ReceiptLong),
        BottomTab(AppRoutes.Account, "حسابي", Icons.Rounded.Person),
    )
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 12.dp,
        shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
    ) {
        NavigationBar(
            modifier = Modifier.fillMaxWidth().height(84.dp),
            containerColor = MaterialTheme.colorScheme.surface,
            contentColor = FuchsiaColors.Ink,
            tonalElevation = 0.dp,
        ) {
            tabs.forEach { tab ->
                val selected = selectedRoute == tab.route
                val iconScale by animateFloatAsState(if (selected) 1.1f else 1f, animationSpec = tween(220), label = "bottom-tab-scale")
                NavigationBarItem(
                    selected = selected,
                    onClick = { if (!selected) onSelect(tab.route) },
                    icon = {
                        Box(
                            modifier = Modifier
                                .size(if (selected) 48.dp else 42.dp)
                                .scale(iconScale)
                                .background(
                                    if (selected) Brush.linearGradient(listOf(FuchsiaColors.Primary, FuchsiaColors.PrimaryDark))
                                    else Brush.linearGradient(listOf(MaterialTheme.colorScheme.surface, MaterialTheme.colorScheme.surface)),
                                    RoundedCornerShape(if (selected) 17.dp else 14.dp),
                                )
                                .border(
                                    width = if (selected) 1.dp else 0.dp,
                                    color = if (selected) FuchsiaColors.Gold.copy(alpha = .55f) else MaterialTheme.colorScheme.surface,
                                    shape = RoundedCornerShape(if (selected) 17.dp else 14.dp),
                                ),
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(tab.icon, contentDescription = tab.label, tint = if (selected) FuchsiaColors.White else FuchsiaColors.Muted, modifier = Modifier.size(if (selected) 25.dp else 24.dp))
                        }
                    },
                    label = {
                        AnimatedVisibility(visible = selected, enter = fadeIn(tween(160)) + scaleIn(tween(160)), exit = fadeOut(tween(100)) + scaleOut(tween(100))) {
                            Text(tab.label, style = MaterialTheme.typography.labelSmall, color = FuchsiaColors.TextAccent)
                        }
                    },
                    alwaysShowLabel = false,
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = FuchsiaColors.IconAccent,
                        selectedTextColor = FuchsiaColors.TextAccent,
                        indicatorColor = MaterialTheme.colorScheme.surface,
                        unselectedIconColor = FuchsiaColors.Muted,
                        unselectedTextColor = FuchsiaColors.Muted,
                    ),
                )
            }
        }
    }
}

private data class BottomTab(val route: String, val label: String, val icon: ImageVector)
