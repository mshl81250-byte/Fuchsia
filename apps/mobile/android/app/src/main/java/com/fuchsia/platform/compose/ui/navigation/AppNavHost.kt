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
import com.fuchsia.platform.compose.ui.screens.HomeScreen
import com.fuchsia.platform.compose.ui.screens.VerifyScreen
import com.fuchsia.platform.compose.ui.screens.WelcomeScreen

object AppRoutes {
    const val Welcome = "welcome"
    const val Auth = "auth?register={register}"
    const val Verify = "verify/{email}?debugCode={debugCode}"
    const val Home = "home"
    const val Category = "category/{id}"

    fun auth(register: Boolean): String = "auth?register=$register"

    fun verify(email: String, debugCode: String?): String =
        "verify/${Uri.encode(email)}?debugCode=${Uri.encode(debugCode.orEmpty())}"

    fun category(id: Int): String = "category/$id"
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
            HomeScreen(onCategory = { navController.navigate(AppRoutes.category(it)) })
        }
        composable(
            route = AppRoutes.Category,
            arguments = listOf(navArgument("id") { type = NavType.IntType }),
        ) { entry ->
            CategoryScreen(
                categoryId = entry.arguments?.getInt("id") ?: 0,
                onBack = { navController.popBackStack() },
            )
        }
    }
}
