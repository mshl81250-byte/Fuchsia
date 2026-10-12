package com.fuchsia.platform.compose.data

import android.content.Context
import com.fuchsia.platform.compose.BuildConfig

object AppPreferences {
    private const val PREFS = "fuchsia_app_preferences"
    private const val THEME_MODE = "theme_mode"
    private const val BIOMETRIC_LOCK = "biometric_lock_enabled"
    private const val ONBOARDING_COMPLETED = "onboarding_completed"
    private const val WELCOME_SHOWN = "welcome_shown"
    private const val NOTIFY_ORDER_UPDATES = "notify_order_updates"
    private const val NOTIFY_PROMOTIONS = "notify_promotions"
    private const val NOTIFY_REMINDERS = "notify_reminders"

    fun themeMode(context: Context): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(THEME_MODE, ThemeMode.SYSTEM.storageValue) ?: ThemeMode.SYSTEM.storageValue

    fun setThemeMode(context: Context, mode: ThemeMode) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putString(THEME_MODE, mode.storageValue).apply()
    }

    fun biometricEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(BIOMETRIC_LOCK, false)

    fun setBiometricEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(BIOMETRIC_LOCK, enabled).apply()
    }

    fun orderNotificationsEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(NOTIFY_ORDER_UPDATES, true)

    fun setOrderNotificationsEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(NOTIFY_ORDER_UPDATES, enabled).apply()
    }

    fun promotionNotificationsEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(NOTIFY_PROMOTIONS, true)

    fun setPromotionNotificationsEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(NOTIFY_PROMOTIONS, enabled).apply()
    }

    fun reminderNotificationsEnabled(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(NOTIFY_REMINDERS, true)

    fun setReminderNotificationsEnabled(context: Context, enabled: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean(NOTIFY_REMINDERS, enabled).apply()
    }

    fun onboardingCompleted(context: Context): Boolean =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean(ONBOARDING_COMPLETED, false)

    fun shouldShowWelcome(context: Context): Boolean {
        val preferences = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (preferences.getBoolean(ONBOARDING_COMPLETED, false)) return false
        if (preferences.getBoolean(WELCOME_SHOWN, false)) return false
        @Suppress("DEPRECATION")
        val firstInstallTime = runCatching {
            context.packageManager.getPackageInfo(context.packageName, 0).firstInstallTime
        }.getOrDefault(0L)
        if (firstInstallTime in 1 until BuildConfig.BUILD_TIMESTAMP_MS) {
            preferences.edit().putBoolean(ONBOARDING_COMPLETED, true).putBoolean(WELCOME_SHOWN, true).apply()
            return false
        }
        preferences.edit().putBoolean(WELCOME_SHOWN, true).apply()
        return true
    }

    fun setOnboardingCompleted(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
            .putBoolean(ONBOARDING_COMPLETED, true)
            .putBoolean(WELCOME_SHOWN, true)
            .apply()
    }
}

enum class ThemeMode(val storageValue: String, val label: String) {
    SYSTEM("system", "حسب الجهاز"),
    LIGHT("light", "نهاري"),
    DARK("dark", "ليلي");

    companion object {
        fun fromStorage(value: String): ThemeMode = entries.firstOrNull { it.storageValue == value } ?: SYSTEM
    }
}
