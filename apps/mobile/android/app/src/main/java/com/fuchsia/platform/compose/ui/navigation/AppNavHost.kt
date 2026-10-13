package com.fuchsia.platform.compose.ui.navigation

import android.app.Activity
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.TextButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
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
import com.fuchsia.platform.compose.data.FuchsiaApi
import com.fuchsia.platform.compose.data.RentalBookingDraft
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
import com.fuchsia.platform.compose.ui.screens.VenueBookingScreen
import com.fuchsia.platform.compose.ui.screens.VenuePartnerScreen
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import kotlinx.coroutines.launch

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
    const val VenueBooking = "venue-booking"
    const val VenuePartner = "venue-partner"
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

@OptIn(ExperimentalMaterial3Api::class)
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
    val scope = rememberCoroutineScope()
    var directRentalDraft by remember { mutableStateOf<RentalBookingDraft?>(null) }
    val currentEntry by navController.currentBackStackEntryAsState()
    val routeNow = currentEntry?.destination?.route
    var showExitSheet by remember { mutableStateOf(false) }
    var guestStarting by remember { mutableStateOf(false) }
    var guestError by remember { mutableStateOf("") }

    BackHandler(enabled = routeNow == AppRoutes.Home) { showExitSheet = true }

    fun selectTab(route: String) {
        navController.navigate(route) {
            popUpTo(AppRoutes.Home) { saveState = true }
            launchSingleTop = true
            restoreState = true
        }
    }

    fun fromWelcome(targetRoute: String) {
        if (targetRoute.startsWith("auth")) {
            AppPreferences.setOnboardingCompleted(context)
            navController.navigate(targetRoute) {
                popUpTo(AppRoutes.Welcome) { inclusive = true }
                launchSingleTop = true
            }
            return
        }
        guestStarting = true
        guestError = ""
        scope.launch {
            runCatching { FuchsiaApi.guest() }
                .onSuccess { session ->
                    SessionVault.save(context, session.user, session.token)
                    AppPreferences.setOnboardingCompleted(context)
                    navController.navigate(AppRoutes.Home) {
                        popUpTo(AppRoutes.Welcome) { inclusive = true }
                        launchSingleTop = true
                    }
                    if (targetRoute != AppRoutes.Home) navController.navigate(targetRoute) { launchSingleTop = true }
                }
                .onFailure { failure -> guestError = failure.message ?: "تعذر بدء التصفح دون حساب." }
            guestStarting = false
        }
    }

    val forwardEnter: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.EnterTransition = {
        slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(320, easing = FastOutSlowInEasing)) +
            fadeIn(tween(220)) + scaleIn(tween(320, easing = FastOutSlowInEasing), initialScale = 0.985f)
    }
    val forwardExit: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.ExitTransition = {
        slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Start, tween(280, easing = FastOutSlowInEasing)) +
            fadeOut(tween(180)) + scaleOut(tween(280, easing = FastOutSlowInEasing), targetScale = 0.985f)
    }
    val backEnter: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.EnterTransition = {
        slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(300, easing = FastOutSlowInEasing)) +
            fadeIn(tween(210)) + scaleIn(tween(300, easing = FastOutSlowInEasing), initialScale = 0.985f)
    }
    val backExit: AnimatedContentTransitionScope<*>.() -> androidx.compose.animation.ExitTransition = {
        slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.End, tween(270, easing = FastOutSlowInEasing)) +
            fadeOut(tween(170)) + scaleOut(tween(270, easing = FastOutSlowInEasing), targetScale = 0.985f)
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
                    onVenueBooking = { navController.navigate(AppRoutes.VenueBooking) },
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
                    onRentalCheckout = { draft ->
                        directRentalDraft = draft
                        navController.navigate(AppRoutes.checkout(gift = false))
                    },
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
                    directRental = directRentalDraft,
                    onBack = { navController.popBackStack() },
                    onOrderPlaced = { orderId ->
                        directRentalDraft = null
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
            composable(AppRoutes.VenueBooking) {
                VenueBookingScreen(onBack = { navController.popBackStack() })
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
                    onWishlist = { selectTab(AppRoutes.Wishlist) },
                    onVenuePartner = { navController.navigate(AppRoutes.VenuePartner) },
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
            composable(AppRoutes.VenuePartner) {
                VenuePartnerScreen(onBack = { navController.popBackStack() })
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

        if (guestStarting || guestError.isNotBlank()) {
            Box(
                Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background.copy(alpha = 0.97f)).zIndex(3f),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    Modifier.fillMaxWidth().padding(horizontal = 28.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Image(
                        painter = painterResource(R.drawable.fuchsia_logo),
                        contentDescription = "فوشيا",
                        modifier = Modifier.size(width = 118.dp, height = 96.dp),
                        contentScale = ContentScale.Fit,
                    )
                    if (guestStarting) {
                        Text("نجهّز لك التصفح دون حساب", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        CircularProgressIndicator(modifier = Modifier.size(24.dp), color = FuchsiaColors.Primary, strokeWidth = 2.dp)
                    } else {
                        Text("تعذر بدء التصفح دون حساب", color = FuchsiaColors.Ink, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(guestError, color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium)
                        Button(
                            onClick = { guestError = ""; fromWelcome(AppRoutes.Home) },
                            modifier = Modifier.fillMaxWidth().height(52.dp),
                            colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary),
                        ) { Text("إعادة المحاولة", fontWeight = FontWeight.Bold) }
                    }
                }
            }
        }

        if (showExitSheet) {
            ModalBottomSheet(
                onDismissRequest = { showExitSheet = false },
                containerColor = FuchsiaColors.White,
            ) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 24.dp, vertical = 8.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("هل تريد مغادرة التطبيق؟", color = FuchsiaColors.Ink, style = MaterialTheme.typography.headlineSmall, fontWeight = FontWeight.ExtraBold)
                    Text("شكراً لاستخدام فوشيا، نتطلع لخدمتك مجدداً.", color = FuchsiaColors.Muted, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.padding(top = 8.dp, bottom = 20.dp))
                    Button(onClick = { (context as? Activity)?.finish() }, modifier = Modifier.fillMaxWidth().height(52.dp), colors = ButtonDefaults.buttonColors(containerColor = FuchsiaColors.Primary)) { Text("خروج", fontWeight = FontWeight.Bold) }
                    TextButton(onClick = { showExitSheet = false }, modifier = Modifier.fillMaxWidth().height(48.dp)) { Text("البقاء", color = FuchsiaColors.TextAccent, fontWeight = FontWeight.Bold) }
                }
            }
        }
    }
}
