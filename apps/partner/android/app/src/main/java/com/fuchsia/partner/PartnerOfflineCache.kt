package com.fuchsia.partner

import android.content.Context
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Encrypted cache for read-only partner data; writes remain online-only. */
object PartnerOfflineCache {
    private const val PREFS = "fuchsia_partner_offline_cache"
    private const val KEY_ALIAS = "fuchsia.partner.offline.cache.aes.v1"
    private const val IV_BYTES = 12
    private const val MAX_AGE_MS = 24L * 60 * 60 * 1000

    @Synchronized
    fun put(context: Context, key: String, value: String) {
        runCatching {
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.ENCRYPT_MODE, secretKey())
            val packed = cipher.iv + cipher.doFinal(value.toByteArray(Charsets.UTF_8))
            val payload = JSONObject().put("savedAt", System.currentTimeMillis()).put("value", Base64.encodeToString(packed, Base64.NO_WRAP))
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(key, payload.toString()).apply()
        }
    }

    @Synchronized
    fun get(context: Context, key: String): String? {
        val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(key, null) ?: return null
        return runCatching {
            val payload = JSONObject(raw)
            if (System.currentTimeMillis() - payload.optLong("savedAt") > MAX_AGE_MS) return null
            val packed = Base64.decode(payload.getString("value"), Base64.NO_WRAP)
            require(packed.size > IV_BYTES)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, secretKey(), GCMParameterSpec(128, packed.copyOfRange(0, IV_BYTES)))
            String(cipher.doFinal(packed.copyOfRange(IV_BYTES, packed.size)), Charsets.UTF_8)
        }.getOrNull()
    }

    private fun secretKey(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }
        val generator = KeyGenerator.getInstance(android.security.keystore.KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(android.security.keystore.KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            android.security.keystore.KeyProperties.PURPOSE_ENCRYPT or android.security.keystore.KeyProperties.PURPOSE_DECRYPT,
        ).setBlockModes(android.security.keystore.KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(android.security.keystore.KeyProperties.ENCRYPTION_PADDING_NONE)
            .setRandomizedEncryptionRequired(true).build())
        return generator.generateKey()
    }
}
