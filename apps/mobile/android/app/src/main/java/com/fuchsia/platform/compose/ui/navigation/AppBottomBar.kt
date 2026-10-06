package com.fuchsia.platform.compose.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ReceiptLong
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.FavoriteBorder
import androidx.compose.material.icons.rounded.Category
import androidx.compose.material.icons.rounded.Person
import androidx.compose.material.icons.rounded.ShoppingCart
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
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
    NavigationBar(
        containerColor = MaterialTheme.colorScheme.surface,
        contentColor = FuchsiaColors.Ink,
    ) {
        tabs.forEach { tab ->
            NavigationBarItem(
                selected = selectedRoute == tab.route,
                onClick = { if (selectedRoute != tab.route) onSelect(tab.route) },
                icon = { Icon(tab.icon, contentDescription = tab.label) },
                label = { Text(tab.label) },
                alwaysShowLabel = true,
                colors = NavigationBarItemDefaults.colors(
                    selectedIconColor = FuchsiaColors.Primary,
                    selectedTextColor = FuchsiaColors.Primary,
                    indicatorColor = FuchsiaColors.Rose,
                    unselectedIconColor = FuchsiaColors.Muted,
                    unselectedTextColor = FuchsiaColors.Muted,
                ),
            )
        }
    }
}

private data class BottomTab(val route: String, val label: String, val icon: ImageVector)
