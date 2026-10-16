package com.fuchsia.partner

import android.content.Context
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.messaging.FirebaseMessaging
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

internal object PartnerPushRegistration {
    suspend fun register(context: Context, authToken: String) {
        val deviceToken = firebaseToken(context) ?: return
        PartnerApi.registerPushToken(authToken, deviceToken)
    }

    suspend fun unregister(context: Context, authToken: String) {
        val deviceToken = firebaseToken(context) ?: return
        PartnerApi.unregisterPushToken(authToken, deviceToken)
    }

    private suspend fun firebaseToken(context: Context): String? {
        val app = firebaseApp(context) ?: return null
        return suspendCancellableCoroutine { continuation ->
            FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
                if (task.isSuccessful) continuation.resume(task.result)
                else continuation.resumeWithException(task.exception ?: IllegalStateException("تعذر الحصول على رمز Push"))
            }
        }
    }

    private fun firebaseApp(context: Context): FirebaseApp? {
        if (BuildConfig.FIREBASE_PROJECT_ID.isBlank() || BuildConfig.FIREBASE_APPLICATION_ID.isBlank()
            || BuildConfig.FIREBASE_API_KEY.isBlank() || BuildConfig.FIREBASE_MESSAGING_SENDER_ID.isBlank()
        ) return null
        return try {
            FirebaseApp.getApps(context).firstOrNull()
                ?: FirebaseApp.initializeApp(context, FirebaseOptions.Builder()
                    .setProjectId(BuildConfig.FIREBASE_PROJECT_ID)
                    .setApplicationId(BuildConfig.FIREBASE_APPLICATION_ID)
                    .setApiKey(BuildConfig.FIREBASE_API_KEY)
                    .setGcmSenderId(BuildConfig.FIREBASE_MESSAGING_SENDER_ID)
                    .setStorageBucket(BuildConfig.FIREBASE_STORAGE_BUCKET.takeIf(String::isNotBlank))
                    .build())
        } catch (_: Exception) {
            null
        }
    }
}
