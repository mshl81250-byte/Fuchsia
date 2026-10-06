package com.fuchsia.platform.compose.ui.navigation

import android.net.Uri
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.zIndex
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.fuchsia.platform.compose.R
import com.fuchsia.platform.compose.data.AppPreferences
import com.fuchsia.platform.compose.data.SessionVault
import com.fuchsia.platform.compose.ui.screens.AboutScreen
import com.fuchsia.platform.compose.ui.screens.AccountScreen
import com.fuchsia.platform.compose.ui.screens.AddressBookScreen
import com.fuchsia.platform.compose.ui.screens.AuthScreen
import com.fuchsia.platform.compose.ui.screens.CategoryScreen
import com.fuchsia.platform.compose.ui.screens.CategoriesScreen
import com.fuchsia.platform.compose.ui.screens.CartScreen
import com.fuchsia.platform.compose.ui.screens.CheckoutScreen
import com.fuchsia.platform.compose.ui.screens.ContactScreen
import com.fuchsia.platform.compose.ui.screens.GiftOrderScreen
import com.fuchsia.platform.compose.ui.screens.HelpScreen
import com.fuchsia.platform.compose.ui.screens.HomeScreen
import com.fuchsia.platform.compose.ui.screens.OrdersScreen
import com.fuchsia.platform.compose.ui.screens.OrderSuccessScreen
import com.fuchsia.platform.compose.ui.screens.PolicyScreen
import com.fuchsia.platform.compose.ui.screens.ProductDetailsScreen
import com.fuchsia.platform.compose.ui.screens.ProfileEditorScreen
import com.fuchsia.platform.compose.ui.screens.ReservationScreen
import com.fuchsia.platform.compose.ui.screens.SettingsScreen
import com.fuchsia.platform.compose.ui.screens.VerifyScreen
import com.fuchsia.platform.compose.ui.screens.WelcomeScreen
import com.fuchsia.platform.compose.ui.screens.WishlistScreen
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.delay

object AppRoutes {
    const val Welcome = "welcome"
    const val Auth = "auth?register={register}"
    const val Verify = "verify/{email}?debugCode={debugCode}"
    const val Home = "home"
    const val Categories = "categories"
    const val Wishlist = "wishlist"
    const val Category = "category/{id}"
    const val Product = "product/{id}"
    const val Cart = "cart"
    const val Checkout = "checkout?gift={gift}"
    const val GiftOrder = "gift-order"
    const val Reservation = "reservation"
    const val OrderSuccess = "order-success/{orderId}"
    const val Orders = "orders?focusOrderId={focusOrderId}"
    const val OrdersRoot = "orders?focusOrderId=0"
    const val Account = "account"
    const val Settings = "settings"
    const val ProfileEdit = "profile-edit"
    const val AddressBook = "address-book"
    const val Privacy = "privacy"
    const val Terms = "terms"
    const val Help = "help"
    const val Contact = "contact"
    const val About = "about"

    fun auth(register: Boolean): String = "auth?register=$register"
    fun verify(email: String, debugCode: String?): String =
        "verify/${Uri.encode(email)}?debugCode=${Uri.encode(debugCode.orEmpty())}"
    fun category(id: Int): String = "category/$id"
    fun product(id: Int): String = "product/$id"
    fun checkout(gift: Boolean): String = "checkout?gift=$gift"
    fun orderSuccess(id: Int): String = "order-success/$id"
    fun orders(focusOrderId: Int = 0): String = "orders?focusOrderId=$focusOrderId"
}

@Composable
fun FuchsiaAppNavHost(
    themeMode: String,
    onThemeModeChange: (String) -> Unit,
    biometricEnabled: Boolean,
    onBiometricEnabledChange: (Boolean) -> Unit,
) {
    val context = LocalContext.current
    val startDestination = remember(context) {
        if (!SessionVault.token(context).isNullOrBlank()) {
            AppPreferences.setOnboardingCompleted(context)
            AppRoutes.Home
        } else {
            val showWelcome = AppPreferences.shouldShowWelcome(context)
            if (showWelcome) AppRoutes.Welcome else AppRoutes.Home
        }
    }
    val navController = rememberNavController()
    val currentEntry by navController.currentBackStackEntryAsState()
    val routeNow = currentEntry?.destination?.route
    var previousRoute by remember { mutableStateOf<String?>(null) }
    var showBrandTransition by remember { mutableStateOf(false) }

    LaunchedEffect(routeNow) {
        if (routeNow != null) {
            if (previousRoute != null && previousRoute != routeNow) {
                showBrandTransition = true
                delay(260)
                showBrandTransition = false
            }
            previousRoute = routeNow
        }
    }

    fun selectTab(route: String) {
        navController.navigate(route) {
            popUpTo(AppRoutes.Home) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    fun fromWelcome(targetRoute: String) {
        AppPreferences.setOnboardingCompleted(context)
        navController.navigate(AppRoutes.Home) {
            popUpTo(AppRoutes.Welcome) { inclusive = true }
            launchSingleTop = true
        }
        if (targetRoute != AppRoutes.Home) {
            navController.navigate(targetRoute) { launchSingleTop = true }
        }
    }

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

    Box(Modifier.fillMaxSize()) {
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.fillMaxSize(),
            enterTransition = forwardEnter,
            exitTransition = forwardExit,
            popEnterTransition = backEnter,
            popExitTransition = backExit,
        ) {
            composable(AppRoutes.Welcome) {
                WelcomeScreen(
                    onExplore = { fromWelcome(AppRoutes.Home) },
                    onLogin = { fromWelcome(AppRoutes.auth(register = false)) },
                    onRegister = { fromWelcome(AppRoutes.auth(register = true)) },
                    onCategory = { fromWelcome(AppRoutes.category(it)) },
                    onReservation = { fromWelcome(AppRoutes.Reservation) },
                    onGiftOrder = { fromWelcome(AppRoutes.GiftOrder) },
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
                            popUpTo(AppRoutes.Home) { inclusive = false }
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
                            popUpTo(AppRoutes.Home) { inclusive = false }
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(AppRoutes.Home) {
                HomeScreen(
                    onCategory = { navController.navigate(AppRoutes.category(it)) },
                    onProduct = { navController.navigate(AppRoutes.product(it)) },
                    onCart = { navController.navigate(AppRoutes.Cart) },
                    onReservation = { navController.navigate(AppRoutes.Reservation) },
                    onGiftOrder = { navController.navigate(AppRoutes.GiftOrder) },
                    onOrders = { selectTab(AppRoutes.OrdersRoot) },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Home, ::selectTab) },
                )
            }
            composable(AppRoutes.Categories) {
                CategoriesScreen(
                    onCategory = { navController.navigate(AppRoutes.category(it)) },
                    onBack = { selectTab(AppRoutes.Home) },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Categories, ::selectTab) },
                )
            }
            composable(AppRoutes.Wishlist) {
                WishlistScreen(
                    onSignIn = { navController.navigate(AppRoutes.auth(register = false)) },
                    onProduct = { navController.navigate(AppRoutes.product(it)) },
                    onCart = { navController.navigate(AppRoutes.Cart) },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Wishlist, ::selectTab) },
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
                    onProduct = { navController.navigate(AppRoutes.product(it)) },
                )
            }
            composable(
                route = AppRoutes.Product,
                arguments = listOf(navArgument("id") { type = NavType.IntType }),
            ) { entry ->
                ProductDetailsScreen(
                    productId = entry.arguments?.getInt("id") ?: 0,
                    onBack = { navController.popBackStack() },
                    onCart = { navController.navigate(AppRoutes.Cart) },
                )
            }
            composable(AppRoutes.Cart) {
                CartScreen(
                    onBack = { navController.popBackStack() },
                    onCheckout = { navController.navigate(AppRoutes.checkout(gift = false)) },
                    onShop = { selectTab(AppRoutes.Home) },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Cart, ::selectTab) },
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
                    onManageAddresses = { navController.navigate(AppRoutes.AddressBook) },
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
                route = AppRoutes.Orders,
                arguments = listOf(navArgument("focusOrderId") { type = NavType.IntType; defaultValue = 0 }),
            ) { entry ->
                OrdersScreen(
                    onBack = { selectTab(AppRoutes.Home) },
                    onSignIn = { navController.navigate(AppRoutes.auth(register = false)) },
                    focusOrderId = entry.arguments?.getInt("focusOrderId") ?: 0,
                    bottomBar = { FuchsiaBottomBar(AppRoutes.OrdersRoot, ::selectTab) },
                )
            }
            composable(AppRoutes.Account) {
                AccountScreen(
                    onSignIn = { navController.navigate(AppRoutes.auth(register = false)) },
                    onEditProfile = { navController.navigate(AppRoutes.ProfileEdit) },
                    onAddresses = { navController.navigate(AppRoutes.AddressBook) },
                    onOrders = { selectTab(AppRoutes.OrdersRoot) },
                    onSettings = { selectTab(AppRoutes.Settings) },
                    onContact = { navController.navigate(AppRoutes.Contact) },
                    onSignedOut = {
                        navController.navigate(AppRoutes.Account) {
                            popUpTo(AppRoutes.Account) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Account, ::selectTab) },
                )
            }
            composable(AppRoutes.Settings) {
                SettingsScreen(
                    themeMode = themeMode,
                    onThemeModeChange = onThemeModeChange,
                    biometricEnabled = biometricEnabled,
                    onBiometricEnabledChange = onBiometricEnabledChange,
                    onEditProfile = { navController.navigate(AppRoutes.ProfileEdit) },
                    onAddresses = { navController.navigate(AppRoutes.AddressBook) },
                    onPrivacy = { navController.navigate(AppRoutes.Privacy) },
                    onTerms = { navController.navigate(AppRoutes.Terms) },
                    onHelp = { navController.navigate(AppRoutes.Help) },
                    onContact = { navController.navigate(AppRoutes.Contact) },
                    onAbout = { navController.navigate(AppRoutes.About) },
                    bottomBar = { FuchsiaBottomBar(AppRoutes.Settings, ::selectTab) },
                )
            }
            composable(AppRoutes.ProfileEdit) {
                ProfileEditorScreen(
                    onBack = { navController.popBackStack() },
                    onSaved = {
                        navController.navigate(AppRoutes.Account) {
                            popUpTo(AppRoutes.Account) { inclusive = true }
                            launchSingleTop = true
                        }
                    },
                )
            }
            composable(AppRoutes.AddressBook) {
                AddressBookScreen(onBack = { navController.popBackStack() })
            }
            composable(AppRoutes.Privacy) { PolicyScreen(isTerms = false, onBack = { navController.popBackStack() }) }
            composable(AppRoutes.Terms) { PolicyScreen(isTerms = true, onBack = { navController.popBackStack() }) }
            composable(AppRoutes.Help) { HelpScreen(onBack = { navController.popBackStack() }) }
            composable(AppRoutes.Contact) { ContactScreen(onBack = { navController.popBackStack() }) }
            composable(AppRoutes.About) { AboutScreen(onBack = { navController.popBackStack() }) }
            composable(
                route = AppRoutes.OrderSuccess,
                arguments = listOf(navArgument("orderId") { type = NavType.IntType }),
            ) { entry ->
                OrderSuccessScreen(
                    orderId = entry.arguments?.getInt("orderId") ?: 0,
                    onTrackOrder = { navController.navigate(AppRoutes.orders(entry.arguments?.getInt("orderId") ?: 0)) },
                    onContinueShopping = { selectTab(AppRoutes.Home) },
                )
            }
        }

        AnimatedVisibility(
            visible = showBrandTransition,
            modifier = Modifier.fillMaxSize().zIndex(2f),
            enter = fadeIn(tween(90)),
            exit = fadeOut(tween(120)),
        ) {
            Box(
                Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background.copy(alpha = 0.98f)),
                contentAlignment = Alignment.Center,
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Image(
                        painter = painterResource(R.drawable.fuchsia_logo),
                        contentDescription = "فوشيا بوتيك",
                        modifier = Modifier.size(width = 154.dp, height = 132.dp),
                        contentScale = ContentScale.Fit,
                    )
                    Spacer(Modifier.height(10.dp))
                    Text("لحظات ونفتح الصفحة", color = FuchsiaColors.Ink, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.SemiBold)
                    Spacer(Modifier.height(15.dp))
                    CircularProgressIndicator(modifier = Modifier.size(22.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                }
            }
        }
    }
}
