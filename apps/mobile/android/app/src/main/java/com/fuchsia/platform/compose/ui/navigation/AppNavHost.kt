package com.fuchsia.platform.compose.ui.navigation

import android.net.Uri
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.navigation.NavType
import androidx.navigation.navArgument
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.fuchsia.platform.compose.ui.screens.AuthScreen
import com.fuchsia.platform.compose.ui.screens.CategoryScreen
import com.fuchsia.platform.compose.ui.screens.CartScreen
import com.fuchsia.platform.compose.ui.screens.CheckoutScreen
import com.fuchsia.platform.compose.ui.screens.GiftOrderScreen
import com.fuchsia.platform.compose.ui.screens.HomeScreen
import com.fuchsia.platform.compose.ui.screens.OrderSuccessScreen
import com.fuchsia.platform.compose.ui.screens.ReservationScreen
import com.fuchsia.platform.compose.ui.screens.VerifyScreen
import com.fuchsia.platform.compose.ui.screens.WelcomeScreen

object AppRoutes {
    const val Welcome = "welcome"
    const val Auth = "auth?register={register}"
    const val Verify = "verify/{email}?debugCode={debugCode}"
    const val Home = "home"
    const val Category = "category/{id}"
    const val Cart = "cart"
    const val Checkout = "checkout?gift={gift}"
    const val GiftOrder = "gift-order"
    const val Reservation = "reservation"
    const val OrderSuccess = "order-success/{orderId}"

    fun auth(register: Boolean): String = "auth?register=$register"

    fun verify(email: String, debugCode: String?): String =
        "verify/${Uri.encode(email)}?debugCode=${Uri.encode(debugCode.orEmpty())}"

    fun category(id: Int): String = "category/$id"
    fun checkout(gift: Boolean): String = "checkout?gift=$gift"
    fun orderSuccess(id: Int): String = "order-success/$id"
}

@Composable
fun FuchsiaAppNavHost() {
    val navController = rememberNavController()
    val forwardEnter: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.EnterTransition = {
        slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(260)) + fadeIn(tween(180))
    }
    val forwardExit: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.ExitTransition = {
        slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(230)) + fadeOut(tween(160))
    }
    val backEnter: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.EnterTransition = {
        slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(240)) + fadeIn(tween(180))
    }
    val backExit: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.ExitTransition = {
        slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(220)) + fadeOut(tween(150))
    }

    NavHost(
        navController = navController,
        startDestination = AppRoutes.Welcome,
        modifier = Modifier.fillMaxSize(),
        enterTransition = forwardEnter,
        exitTransition = forwardExit,
        popEnterTransition = backEnter,
        popExitTransition = backExit,
    ) {
        composable(AppRoutes.Welcome) {
            WelcomeScreen(
                onExplore = { navController.navigate(AppRoutes.Home) },
                onLogin = { navController.navigate(AppRoutes.auth(register = false)) },
                onRegister = { navController.navigate(AppRoutes.auth(register = true)) },
                onCategory = { navController.navigate(AppRoutes.category(it)) },
                onReservation = { navController.navigate(AppRoutes.Reservation) },
                onGiftOrder = { navController.navigate(AppRoutes.GiftOrder) },
            )
        }
        composable(
            route = AppRoutes.Auth,
            arguments = listOf(navArgument("register") { type = NavType.BoolType; defaultValue = false }),
        ) { entry ->
            AuthScreen(
                startWithRegister = entry.arguments?.getBoolean("register") ?: false,
                onBack = { navController.popBackStack() },
                onAuthComplete = {
                    navController.navigate(AppRoutes.Home) {
                        popUpTo(AppRoutes.Welcome) { inclusive = true }
                        launchSingleTop = true
                    }
                },
                onCodeRequested = { email, code -> navController.navigate(AppRoutes.verify(email, code)) },
            )
        }
        composable(
            route = AppRoutes.Verify,
            arguments = listOf(
                navArgument("email") { type = NavType.StringType },
                navArgument("debugCode") { type = NavType.StringType; defaultValue = "" },
            ),
        ) { entry ->
            VerifyScreen(
                email = entry.arguments?.getString("email").orEmpty(),
                debugCode = entry.arguments?.getString("debugCode").orEmpty().takeIf { it.isNotBlank() },
                onBack = { navController.popBackStack() },
                onVerified = {
                    navController.navigate(AppRoutes.Home) {
                        popUpTo(AppRoutes.Welcome) { inclusive = true }
                        launchSingleTop = true
                    }
                },
            )
        }
        composable(AppRoutes.Home) {
            HomeScreen(
                onCategory = { navController.navigate(AppRoutes.category(it)) },
                onCart = { navController.navigate(AppRoutes.Cart) },
                onReservation = { navController.navigate(AppRoutes.Reservation) },
                onGiftOrder = { navController.navigate(AppRoutes.GiftOrder) },
            )
        }
        composable(
            route = AppRoutes.Category,
            arguments = listOf(navArgument("id") { type = NavType.IntType }),
        ) { entry ->
            CategoryScreen(
                categoryId = entry.arguments?.getInt("id") ?: 0,
                onBack = { navController.popBackStack() },
                onCart = { navController.navigate(AppRoutes.Cart) },
            )
        }
        composable(AppRoutes.Cart) {
            CartScreen(
                onBack = { navController.popBackStack() },
                onCheckout = { navController.navigate(AppRoutes.checkout(gift = false)) },
                onShop = {
                    navController.navigate(AppRoutes.Home) {
                        popUpTo(AppRoutes.Home) { inclusive = false }
                        launchSingleTop = true
                    }
                },
            )
        }
        composable(
            route = AppRoutes.Checkout,
            arguments = listOf(navArgument("gift") { type = NavType.BoolType; defaultValue = false }),
        ) { entry ->
            CheckoutScreen(
                initialGift = entry.arguments?.getBoolean("gift") ?: false,
                onBack = { navController.popBackStack() },
                onOrderPlaced = { orderId ->
                    navController.navigate(AppRoutes.orderSuccess(orderId)) {
                        popUpTo(AppRoutes.Home) { inclusive = false }
                        launchSingleTop = true
                    }
                },
            )
        }
        composable(AppRoutes.GiftOrder) {
            GiftOrderScreen(
                onBack = { navController.popBackStack() },
                onCart = { navController.navigate(AppRoutes.Cart) },
                onGiftCheckout = { navController.navigate(AppRoutes.checkout(gift = true)) },
            )
        }
        composable(AppRoutes.Reservation) {
            ReservationScreen(onBack = { navController.popBackStack() })
        }
        composable(
            route = AppRoutes.OrderSuccess,
            arguments = listOf(navArgument("orderId") { type = NavType.IntType }),
        ) { entry ->
            OrderSuccessScreen(
                orderId = entry.arguments?.getInt("orderId") ?: 0,
                onContinueShopping = {
                    navController.navigate(AppRoutes.Home) {
                        popUpTo(AppRoutes.Home) { inclusive = false }
                        launchSingleTop = true
                    }
                },
            )
        }
    }
}
