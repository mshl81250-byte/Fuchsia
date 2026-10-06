package com.fuchsia.platform.compose.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

object SessionVault {
    private const val PREFS = "fuchsia_native_secure_session"
    private const val BLOB = "encrypted_session"
    private const val KEY_ALIAS = "fuchsia.native.session.aes.v1"
    private const val IV_BYTES = 12

    @Synchronized
    fun save(context: Context, user: JSONObject, token: String) {
        val payload = JSONObject().put("user", user).put("token", token).toString()
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key())
        val ciphertext = cipher.doFinal(payload.toByteArray(Charsets.UTF_8))
        val packed = cipher.iv + ciphertext
        val encoded = Base64.encodeToString(packed, Base64.NO_WRAP)
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(BLOB, encoded).apply()
    }

    @Synchronized
    fun read(context: Context): JSONObject? {
        val encoded = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(BLOB, null)
            ?: return null
        return runCatching {
            val packed = Base64.decode(encoded, Base64.NO_WRAP)
            require(packed.size > IV_BYTES)
            val iv = packed.copyOfRange(0, IV_BYTES)
            val ciphertext = packed.copyOfRange(IV_BYTES, packed.size)
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, iv))
            JSONObject(String(cipher.doFinal(ciphertext), Charsets.UTF_8))
        }.getOrElse {
            clear(context)
            null
        }
    }

    @Synchronized
    fun clear(context: Context) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(BLOB).apply()
    }

    fun sessionId(context: Context): String? = read(context)
        ?.optJSONObject("user")
        ?.opt("id")
        ?.toString()
        ?.takeIf { it.isNotBlank() && it != "null" }

    fun userId(context: Context): Int? = read(context)
        ?.optJSONObject("user")
        ?.optInt("id")
        ?.takeIf { it > 0 }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

        val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore")
        generator.init(
            KeyGenParameterSpec.Builder(
                KEY_ALIAS,
                KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
            )
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setRandomizedEncryptionRequired(true)
                .build(),
        )
        return generator.generateKey()
    }
}
