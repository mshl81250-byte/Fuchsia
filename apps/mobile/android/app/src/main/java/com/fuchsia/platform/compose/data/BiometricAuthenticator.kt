package com.fuchsia.platform.compose.data

import androidx.biometric.BiometricManager
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.fragment.app.FragmentActivity

class BiometricAuthenticator(private val activity: FragmentActivity) {
    fun isAvailable(): Boolean =
        BiometricManager.from(activity).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK) ==
            BiometricManager.BIOMETRIC_SUCCESS

    fun authenticate(
        title: String,
        subtitle: String,
        onSuccess: () -> Unit,
        onFailure: (String) -> Unit,
    ) {
        val manager = BiometricManager.from(activity)
        val result = manager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK)
        if (result != BiometricManager.BIOMETRIC_SUCCESS) {
            onFailure(availabilityMessage(result))
            return
        }

        val prompt = BiometricPrompt(
            activity,
            ContextCompat.getMainExecutor(activity),
            object : BiometricPrompt.AuthenticationCallback() {
                override fun onAuthenticationSucceeded(result: BiometricPrompt.AuthenticationResult) {
                    onSuccess()
                }

                override fun onAuthenticationError(errorCode: Int, errString: CharSequence) {
                    onFailure(errString.toString().ifBlank { "تعذر إكمال التحقق الحيوي." })
                }

                override fun onAuthenticationFailed() {
                    onFailure("لم يتم التحقق؛ حاول مرة أخرى.")
                }
            },
        )
        val promptInfo = BiometricPrompt.PromptInfo.Builder()
            .setTitle(title)
            .setSubtitle(subtitle)
            .setNegativeButtonText("إلغاء")
            .build()
        prompt.authenticate(promptInfo)
    }

    private fun availabilityMessage(result: Int): String = when (result) {
        BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE -> "لا يحتوي هذا الجهاز على مستشعر مصادقة حيوية."
        BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE -> "مستشعر المصادقة الحيوية غير متاح الآن."
        BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED -> "أضف بصمة أو وسيلة مصادقة حيوية من إعدادات الجهاز أولًا."
        else -> "لا يمكن تفعيل المصادقة الحيوية على هذا الجهاز حاليًا."
    }
}
