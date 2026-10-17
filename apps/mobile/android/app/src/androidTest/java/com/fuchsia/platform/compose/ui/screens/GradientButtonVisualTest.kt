package com.fuchsia.platform.compose.ui.screens

import android.graphics.Bitmap
import androidx.compose.ui.graphics.asAndroidBitmap
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.captureToImage
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.onRoot
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import com.fuchsia.designsystem.FuchsiaTheme
import java.io.File
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
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val bitmap = composeRule.onRoot().captureToImage().asAndroidBitmap()
        File(context.filesDir, fileName).outputStream().use { output ->
            check(bitmap.compress(Bitmap.CompressFormat.PNG, 100, output))
        }
    }
}
