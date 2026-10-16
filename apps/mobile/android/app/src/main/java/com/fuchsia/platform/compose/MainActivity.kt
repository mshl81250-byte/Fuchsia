package com.fuchsia.platform.compose

import android.graphics.Color as AndroidColor
import android.os.Bundle
import androidx.activity.SystemBarStyle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Fingerprint
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.luminance
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.fragment.app.FragmentActivity
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import com.fuchsia.platform.compose.data.AppPreferences
import com.fuchsia.platform.compose.data.BiometricAuthenticator
import com.fuchsia.platform.compose.data.ThemeMode
import com.fuchsia.platform.compose.ui.navigation.FuchsiaAppNavHost
import com.fuchsia.platform.compose.ui.theme.FuchsiaColors
import com.fuchsia.platform.compose.ui.theme.FuchsiaTheme

class MainActivity : FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val context = LocalContext.current
            var themeValue by remember { mutableStateOf(AppPreferences.themeMode(context)) }
            var biometricEnabled by remember { mutableStateOf(AppPreferences.biometricEnabled(context)) }
            var unlocked by remember { mutableStateOf(!biometricEnabled) }
            var biometricError by remember { mutableStateOf("") }
            var showLaunchSplash by remember { mutableStateOf(true) }
            val mode = ThemeMode.fromStorage(themeValue)
            val darkTheme = when (mode) {
                ThemeMode.DARK -> true
                ThemeMode.LIGHT -> false
                ThemeMode.SYSTEM -> androidx.compose.foundation.isSystemInDarkTheme()
            }
            val authenticator = remember(this) { BiometricAuthenticator(this) }
            val requestUnlock: () -> Unit = {
                biometricError = ""
                authenticator.authenticate(
                    title = "فوشيا بوكينج",
                    subtitle = "تحقق من هويتك لفتح التطبيق",
                    onSuccess = { unlocked = true; biometricError = "" },
                    onFailure = { biometricError = it },
                )
            }

            LaunchedEffect(biometricEnabled, unlocked) {
                if (biometricEnabled && !unlocked) {
                    if (authenticator.isAvailable()) {
                        requestUnlock()
                    } else {
                        AppPreferences.setBiometricEnabled(context, false)
                        biometricEnabled = false
                        unlocked = true
                        android.widget.Toast.makeText(
                            context,
                            "أُوقف قفل البصمة لعدم توفر وسيلة مصادقة مسجلة على الجهاز.",
                            android.widget.Toast.LENGTH_LONG,
                        ).show()
                    }
                }
            }
            LaunchedEffect(Unit) {
                delay(1450)
                showLaunchSplash = false
            }
            SideEffect {
                val systemBackground = if (darkTheme) AndroidColor.rgb(16, 11, 15) else AndroidColor.rgb(251, 247, 242)
                val barStyle = if (darkTheme) {
                    SystemBarStyle.dark(systemBackground)
                } else {
                    SystemBarStyle.light(systemBackground, systemBackground)
                }
                enableEdgeToEdge(statusBarStyle = barStyle, navigationBarStyle = barStyle)
            }

            FuchsiaTheme(darkTheme = darkTheme) {
                Box(modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background)) {
                    if (biometricEnabled && !unlocked) {
                        BiometricLockScreen(error = biometricError, onUnlock = requestUnlock)
                    } else if (showLaunchSplash) {
                        LaunchSplashScreen()
                    } else {
                        FuchsiaAppNavHost(
                            themeMode = themeValue,
                            onThemeModeChange = { value ->
                                AppPreferences.setThemeMode(context, ThemeMode.fromStorage(value))
                                themeValue = value
                            },
                            biometricEnabled = biometricEnabled,
                            onBiometricEnabledChange = { enabled ->
                                AppPreferences.setBiometricEnabled(context, enabled)
                                biometricEnabled = enabled
                                if (!enabled) unlocked = true
                            },
                        )
                    }
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun LaunchSplashScreen() {
    val logoScale = remember { Animatable(0.72f) }
    val logoAlpha = remember { Animatable(0f) }
    val titleAlpha = remember { Animatable(0f) }
    val titleOffset = remember { Animatable(18f) }

    LaunchedEffect(Unit) {
        kotlinx.coroutines.coroutineScope {
            launch { logoScale.animateTo(1f, tween(850, easing = FastOutSlowInEasing)) }
            launch { logoAlpha.animateTo(1f, tween(520, easing = FastOutSlowInEasing)) }
            delay(260)
            launch { titleAlpha.animateTo(1f, tween(520, easing = FastOutSlowInEasing)) }
            launch { titleOffset.animateTo(0f, tween(520, easing = FastOutSlowInEasing)) }
        }
    }

    Box(
        modifier = Modifier.fillMaxSize().background(FuchsiaColors.Cream),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Image(
                painter = painterResource(R.drawable.fuchsia_app_icon),
                contentDescription = "شعار فوشيا بوكينج",
                contentScale = ContentScale.Fit,
                colorFilter = if (MaterialTheme.colorScheme.onSurface.luminance() > 0.8f) ColorFilter.tint(androidx.compose.ui.graphics.Color.White) else null,
                modifier = Modifier.size(width = 190.dp, height = 120.dp).alpha(logoAlpha.value).graphicsLayer {
                    scaleX = logoScale.value
                    scaleY = logoScale.value
                },
            )
            Spacer(Modifier.height(13.dp))
            Text(
                "فوشيا بوكينج",
                modifier = Modifier.alpha(titleAlpha.value).graphicsLayer { translationY = titleOffset.value },
                color = FuchsiaColors.Primary,
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
            )
            Spacer(Modifier.height(7.dp))
            Text(
                "كل مناسبة تستحق لمسة مميزة",
                modifier = Modifier.alpha(titleAlpha.value),
                color = FuchsiaColors.Muted,
                style = MaterialTheme.typography.bodyMedium,
            )
        }
    }
}

@androidx.compose.runtime.Composable
private fun BiometricLockScreen(error: String, onUnlock: () -> Unit) {
    Box(
        modifier = Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Image(
                painter = painterResource(R.drawable.fuchsia_app_icon),
                contentDescription = "شعار فوشيا بوكينج",
                contentScale = ContentScale.Fit,
                colorFilter = if (MaterialTheme.colorScheme.onSurface.luminance() > 0.8f) ColorFilter.tint(androidx.compose.ui.graphics.Color.White) else null,
                modifier = Modifier.size(width = 190.dp, height = 120.dp),
            )
            Spacer(Modifier.height(20.dp))
            Icon(Icons.Rounded.Fingerprint, contentDescription = null, tint = FuchsiaColors.Primary, modifier = Modifier.size(38.dp))
            Spacer(Modifier.height(10.dp))
            Text("مساحتك الخاصة", style = MaterialTheme.typography.headlineMedium, color = FuchsiaColors.Ink)
            Text(
                "استخدم البصمة أو المصادقة الحيوية المسجّلة على جهازك للمتابعة.",
                modifier = Modifier.size(width = 300.dp, height = 58.dp),
                style = MaterialTheme.typography.bodyMedium,
                color = FuchsiaColors.Muted,
                textAlign = TextAlign.Center,
            )
            if (error.isNotBlank()) {
                Text(error, color = FuchsiaColors.Error, style = MaterialTheme.typography.bodyMedium, textAlign = TextAlign.Center)
            }
            Spacer(Modifier.height(16.dp))
            Button(onClick = onUnlock) {
                Text("المتابعة بالبصمة", fontWeight = FontWeight.Bold)
            }
        }
    }
}
