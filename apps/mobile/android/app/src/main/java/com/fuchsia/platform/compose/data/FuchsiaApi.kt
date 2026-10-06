package com.fuchsia.platform.compose.data

import com.fuchsia.platform.compose.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

 data class AuthSession(val user: JSONObject, val token: String)

data class StoreCategory(
    val id: Int,
    val name: String,
    val description: String = "",
    val imageUrl: String? = null,
)

data class StoreProduct(
    val id: Int,
    val name: String,
    val description: String = "",
    val price: Double = 0.0,
    val imageUrl: String? = null,
    val categoryId: Int = 0,
)

class ApiException(message: String, val statusCode: Int = 0) : Exception(message)

object FuchsiaApi {
    private const val CONNECT_TIMEOUT_MS = 18_000
    private const val READ_TIMEOUT_MS = 22_000

    suspend fun login(email: String, password: String): AuthSession =
        parseSession(post("/api/auth/login", JSONObject().put("email", email).put("password", password)))

    suspend fun requestRegistrationCode(
        fullName: String,
        email: String,
        password: String,
        phone: String,
    ): JSONObject = post(
        "/api/auth/register/request-code",
        JSONObject()
            .put("fullName", fullName)
            .put("email", email)
            .put("password", password)
            .put("phone", phone),
        includeDebugOtp = BuildConfig.OTP_DEBUG,
    )

    suspend fun verifyRegistrationCode(email: String, code: String): AuthSession = parseSession(
        post(
            "/api/auth/register/verify-code",
            JSONObject().put("email", email).put("code", code),
        ),
    )

    suspend fun guest(): AuthSession = parseSession(post("/api/auth/guest", JSONObject()))

    suspend fun categories(): List<StoreCategory> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/categories"))
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    StoreCategory(
                        id = item.optInt("id"),
                        name = item.optString("nameAr").ifBlank {
                            item.optString("name").ifBlank { "تصنيف ${item.optInt("id")}" }
                        },
                        description = item.optString("descriptionAr").ifBlank { item.optString("description") },
                        imageUrl = item.optString("imageUrl").takeIf(String::isNotBlank),
                    ),
                )
            }
        }
    }

    suspend fun featuredProducts(): List<StoreProduct> = parseProducts(getText("/api/products/featured"))

    suspend fun productsByCategory(categoryId: Int): List<StoreProduct> =
        parseProducts(getText("/api/products?categoryId=$categoryId"))

    private suspend fun parseProducts(path: String): List<StoreProduct> = withContext(Dispatchers.IO) {
        val array = JSONArray(path)
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val images = item.optJSONArray("images")
                val image = images?.optString(0)?.takeIf { it.isNotBlank() }
                    ?: item.optString("imageUrl").takeIf { it.isNotBlank() }
                add(
                    StoreProduct(
                        id = item.optInt("id"),
                        name = item.optString("nameAr").ifBlank { item.optString("name") },
                        description = item.optString("descriptionAr").ifBlank { item.optString("description") },
                        price = item.optDouble("price", 0.0),
                        imageUrl = image,
                        categoryId = item.optInt("categoryId"),
                    ),
                )
            }
        }
    }

    private suspend fun post(
        path: String,
        body: JSONObject,
        includeDebugOtp: Boolean = false,
    ): JSONObject = withContext(Dispatchers.IO) {
        val connection = open(path, "POST")
        try {
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
            if (includeDebugOtp) connection.setRequestProperty("X-Fuchsia-OTP-Debug", "true")
            connection.doOutput = true
            connection.outputStream.use { output ->
                output.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            readJson(connection)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun getText(path: String): String = withContext(Dispatchers.IO) {
        val connection = open(path, "GET")
        try {
            readBody(connection)
        } finally {
            connection.disconnect()
        }
    }

    private fun open(path: String, method: String): HttpURLConnection =
        (URL(BuildConfig.API_BASE_URL.trimEnd('/') + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "FuchsiaBoutique-Android/1.0")
        }

    private fun readJson(connection: HttpURLConnection): JSONObject {
        val body = readBody(connection)
        return if (body.isBlank()) JSONObject() else JSONObject(body)
    }

    private fun readBody(connection: HttpURLConnection): String {
        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val body = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        if (status !in 200..299) {
            val message = runCatching { JSONObject(body).optString("error") }.getOrNull()
                .orEmpty().ifBlank { "تعذر إكمال الطلب (HTTP $status)" }
            throw ApiException(message, status)
        }
        return body
    }

    private fun parseSession(json: JSONObject): AuthSession {
        val user = json.optJSONObject("user") ?: throw ApiException("استجابة الخادم غير مكتملة")
        val token = json.optString("token").takeIf { it.isNotBlank() }
            ?: throw ApiException("تعذر إنشاء جلسة آمنة")
        return AuthSession(user, token)
    }
}
