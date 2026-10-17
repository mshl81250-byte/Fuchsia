package com.fuchsia.platform.compose.ui.screens

import android.os.ParcelFileDescriptor
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fuchsia.designsystem.FuchsiaTheme
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class GradientButtonVisualTest {
    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun registrationScreenRendersAndCapturesGradientButton() {
        composeRule.setContent {
            FuchsiaTheme(darkTheme = true) {
                AuthScreen(
                    startWithRegister = true,
                    onBack = {},
                    onAuthComplete = {},
                    onCodeRequested = { _, _ -> },
                )
            }
        }

        composeRule.onNodeWithText("متابعة إلى التحقق").assertIsDisplayed()
        composeRule.waitForIdle()
        saveSnapshot("fuchsia-auth-register.png")
    }

    @Test
    fun loginScreenRendersAndCapturesGradientButton() {
        composeRule.setContent {
            FuchsiaTheme(darkTheme = true) {
                AuthScreen(
                    startWithRegister = false,
                    onBack = {},
                    onAuthComplete = {},
                    onCodeRequested = { _, _ -> },
                )
            }
        }

        composeRule.onNodeWithText("مرحبًا من جديد").assertIsDisplayed()
        composeRule.waitForIdle()
        saveSnapshot("fuchsia-auth-login.png")
    }

    @Test
    fun emptyStateRendersAndCapturesSharedGradientButton() {
        composeRule.setContent {
            FuchsiaTheme(darkTheme = true) {
                CommerceEmptyState("لا توجد نتائج", "جرّب اسمًا أو منطقة أخرى.", "مسح البحث") {}
            }
        }

        composeRule.onNodeWithText("مسح البحث").assertIsDisplayed()
        composeRule.waitForIdle()
        saveSnapshot("fuchsia-commerce-empty.png")
    }

    private fun saveSnapshot(fileName: String) {
        val command = "mkdir -p /sdcard/Download && screencap -p > /sdcard/Download/$fileName && test -s /sdcard/Download/$fileName && echo snapshot-ready"
        val output = InstrumentationRegistry.getInstrumentation().uiAutomation.executeShellCommand(command)
        val result = ParcelFileDescriptor.AutoCloseInputStream(output).bufferedReader().use { it.readText().trim() }
        check(result == "snapshot-ready") { "Failed to capture emulator snapshot $fileName" }
    }
}
