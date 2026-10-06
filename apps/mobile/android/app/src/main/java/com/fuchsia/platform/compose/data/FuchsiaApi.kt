package com.fuchsia.platform.compose.data

import android.content.Context
import android.net.Uri
import com.fuchsia.platform.compose.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.UUID

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

data class CartLine(
    val id: Int,
    val productId: Int,
    val productName: String,
    val price: Double,
    val quantity: Int,
    val imageUrl: String?,
    val giftWrapping: Boolean,
    val giftMessage: String?,
)

data class ShoppingCart(
    val sessionId: String,
    val items: List<CartLine>,
    val subtotal: Double,
    val deliveryFee: Double,
    val discount: Double,
    val total: Double,
)

data class PaymentWallet(
    val id: Int,
    val name: String,
    val accountNumber: String,
    val instructions: String,
    val iconUrl: String?,
)

data class StoreSummary(
    val id: Int,
    val name: String,
    val location: String,
    val phone: String,
    val isOpen: Boolean,
)

data class TableReservation(
    val id: Int,
    val storeId: Int,
    val reservationAt: String,
    val partySize: Int,
    val status: String,
    val customerName: String,
    val customerPhone: String,
)

data class CustomerOrder(
    val id: Int,
    val status: String,
    val total: Double,
    val createdAt: String,
    val itemCount: Int,
)

data class OrderStatusUpdate(
    val status: String,
    val message: String,
    val createdAt: String,
)

data class OrderTracking(
    val orderId: Int,
    val status: String,
    val total: Double,
    val createdAt: String,
    val updatedAt: String,
    val driverName: String?,
    val driverPhone: String?,
    val history: List<OrderStatusUpdate>,
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
        post("/api/auth/register/verify-code", JSONObject().put("email", email).put("code", code)),
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
                        imageUrl = item.nullableString("imageUrl"),
                    ),
                )
            }
        }
    }

    suspend fun featuredProducts(): List<StoreProduct> = parseProducts(getText("/api/products/featured"))

    suspend fun productsByCategory(categoryId: Int): List<StoreProduct> =
        parseProducts(getText("/api/products?categoryId=$categoryId"))

    suspend fun getCart(sessionId: String): ShoppingCart = parseCart(
        getJson("/api/cart?sessionId=${urlEncode(sessionId)}"),
    )

    suspend fun addToCart(
        sessionId: String,
        productId: Int,
        quantity: Int = 1,
        giftWrapping: Boolean = false,
        giftMessage: String? = null,
    ): ShoppingCart = parseCart(
        post(
            "/api/cart",
            JSONObject()
                .put("sessionId", sessionId)
                .put("productId", productId)
                .put("quantity", quantity)
                .put("giftWrapping", giftWrapping)
                .put("giftMessage", giftMessage),
        ),
    )

    suspend fun updateCartQuantity(itemId: Int, quantity: Int, sessionId: String): ShoppingCart = parseCart(
        sendJson(
            "/api/cart/$itemId",
            "PATCH",
            JSONObject().put("quantity", quantity).put("sessionId", sessionId),
        ),
    )

    suspend fun removeCartItem(itemId: Int): ShoppingCart =
        parseCart(sendJson("/api/cart/$itemId", "DELETE"))

    suspend fun paymentWallets(): List<PaymentWallet> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/payment-wallets"))
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    PaymentWallet(
                        id = item.optInt("id"),
                        name = item.optString("nameAr").ifBlank { "محفظة دفع" },
                        accountNumber = item.optString("accountNumber"),
                        instructions = item.optString("instructions"),
                        iconUrl = item.nullableString("iconUrl"),
                    ),
                )
            }
        }
    }

    suspend fun stores(): List<StoreSummary> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/stores"))
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    StoreSummary(
                        id = item.optInt("id"),
                        name = item.optString("nameAr").ifBlank { "فرع فوشيا" },
                        location = item.optString("location"),
                        phone = item.optString("phone"),
                        isOpen = item.optBoolean("isOpen", true),
                    ),
                )
            }
        }
    }

    suspend fun createOrder(payload: JSONObject): JSONObject = post("/api/orders", payload)

    suspend fun customerOrders(token: String): List<CustomerOrder> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/orders/mine", token))
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(
                    CustomerOrder(
                        id = item.optInt("id"),
                        status = item.optString("status").ifBlank { "received" },
                        total = item.optDouble("total", 0.0),
                        createdAt = item.optString("createdAt"),
                        itemCount = item.optJSONArray("items")?.length() ?: 0,
                    ),
                )
            }
        }
    }

    suspend fun orderTracking(orderId: Int, token: String): OrderTracking = withContext(Dispatchers.IO) {
        val json = getJson("/api/orders/$orderId/tracking", token)
        val rows = json.optJSONArray("history") ?: JSONArray()
        val history = buildList {
            for (i in 0 until rows.length()) {
                val event = rows.optJSONObject(i) ?: continue
                add(
                    OrderStatusUpdate(
                        status = event.optString("status").ifBlank { "received" },
                        message = event.optString("message"),
                        createdAt = event.optString("createdAt"),
                    ),
                )
            }
        }
        OrderTracking(
            orderId = json.optInt("orderId"),
            status = json.optString("status").ifBlank { "received" },
            total = json.optDouble("total", 0.0),
            createdAt = json.optString("createdAt"),
            updatedAt = json.optString("updatedAt"),
            driverName = json.nullableString("driverName"),
            driverPhone = json.nullableString("driverPhone"),
            history = history,
        )
    }

    suspend fun reservations(bearerToken: String): List<TableReservation> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/reservations", bearerToken))
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                add(item.toReservation())
            }
        }
    }

    suspend fun createReservation(payload: JSONObject, bearerToken: String): TableReservation =
        sendJson("/api/reservations", "POST", payload, bearerToken = bearerToken).toReservation()

    suspend fun uploadReceipt(context: Context, uri: Uri): JSONObject = withContext(Dispatchers.IO) {
        val mimeType = context.contentResolver.getType(uri)?.lowercase()
            ?: throw ApiException("تعذر معرفة نوع ملف الإيصال")
        if (mimeType !in setOf("image/jpeg", "image/png", "image/webp")) {
            throw ApiException("يرجى اختيار صورة JPG أو PNG أو WebP")
        }
        val boundary = "Fuchsia-${UUID.randomUUID()}"
        val connection = open("/api/uploads/receipt", "POST")
        try {
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            connection.doOutput = true
            connection.outputStream.use { output ->
                val filename = "receipt.${mimeType.substringAfter('/') .replace("jpeg", "jpg")}"
                output.write("--$boundary\r\n".toByteArray(Charsets.UTF_8))
                output.write("Content-Disposition: form-data; name=\"receipt\"; filename=\"$filename\"\r\n".toByteArray(Charsets.UTF_8))
                output.write("Content-Type: $mimeType\r\n\r\n".toByteArray(Charsets.UTF_8))
                context.contentResolver.openInputStream(uri)?.use { input -> input.copyTo(output) }
                    ?: throw ApiException("تعذر فتح صورة الإيصال")
                output.write("\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8))
            }
            readJson(connection)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun parseProducts(path: String): List<StoreProduct> = withContext(Dispatchers.IO) {
        val array = JSONArray(path)
        buildList {
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val images = item.optJSONArray("images")
                val image = images?.optString(0)?.takeIf { it.isNotBlank() }
                    ?: item.nullableString("imageUrl")
                add(
                    StoreProduct(
                        id = item.optInt("id"),
                        name = item.optString("nameAr").ifBlank { item.optString("name") },
                        description = item.optString("descriptionAr").ifBlank { item.optString("description") },
                        price = item.optDouble("discountPrice").takeIf { it > 0 }
                            ?: item.optDouble("price", 0.0),
                        imageUrl = image,
                        categoryId = item.optInt("categoryId"),
                    ),
                )
            }
        }
    }

    private fun parseCart(json: JSONObject): ShoppingCart {
        val rows = json.optJSONArray("items") ?: JSONArray()
        val items = buildList {
            for (i in 0 until rows.length()) {
                val row = rows.optJSONObject(i) ?: continue
                add(
                    CartLine(
                        id = row.optInt("id"),
                        productId = row.optInt("productId"),
                        productName = row.optString("productName").ifBlank { "هدية فوشيا" },
                        price = row.optDouble("price", 0.0),
                        quantity = row.optInt("quantity", 1),
                        imageUrl = row.nullableString("imageUrl"),
                        giftWrapping = row.optBoolean("giftWrapping"),
                        giftMessage = row.nullableString("giftMessage"),
                    ),
                )
            }
        }
        return ShoppingCart(
            sessionId = json.optString("sessionId"),
            items = items,
            subtotal = json.optDouble("subtotal", 0.0),
            deliveryFee = json.optDouble("deliveryFee", 0.0),
            discount = json.optDouble("discount", 0.0),
            total = json.optDouble("total", 0.0),
        )
    }

    private fun JSONObject.toReservation() = TableReservation(
        id = optInt("id"),
        storeId = optInt("storeId"),
        reservationAt = optString("reservationAt"),
        partySize = optInt("partySize"),
        status = optString("status").ifBlank { "pending" },
        customerName = optString("customerName"),
        customerPhone = optString("customerPhone"),
    )

    private fun JSONObject.nullableString(name: String): String? =
        if (isNull(name)) null else optString(name).takeIf(String::isNotBlank)

    private fun urlEncode(value: String): String = URLEncoder.encode(value, Charsets.UTF_8.name())

    private suspend fun post(
        path: String,
        body: JSONObject,
        includeDebugOtp: Boolean = false,
        bearerToken: String? = null,
    ): JSONObject = sendJson(path, "POST", body, includeDebugOtp, bearerToken)

    private suspend fun sendJson(
        path: String,
        method: String,
        body: JSONObject? = null,
        includeDebugOtp: Boolean = false,
        bearerToken: String? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val connection = open(path, method, bearerToken)
        try {
            if (includeDebugOtp) connection.setRequestProperty("X-Fuchsia-OTP-Debug", "true")
            if (body != null) {
                connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                connection.doOutput = true
                connection.outputStream.use { output -> output.write(body.toString().toByteArray(Charsets.UTF_8)) }
            }
            readJson(connection)
        } finally {
            connection.disconnect()
        }
    }

    private suspend fun getJson(path: String, bearerToken: String? = null): JSONObject = withContext(Dispatchers.IO) {
        val connection = open(path, "GET", bearerToken)
        try { readJson(connection) } finally { connection.disconnect() }
    }

    private suspend fun getText(path: String, bearerToken: String? = null): String = withContext(Dispatchers.IO) {
        val connection = open(path, "GET", bearerToken)
        try { readBody(connection) } finally { connection.disconnect() }
    }

    private fun open(path: String, method: String, bearerToken: String? = null): HttpURLConnection =
        (URL(BuildConfig.API_BASE_URL.trimEnd('/') + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = CONNECT_TIMEOUT_MS
            readTimeout = READ_TIMEOUT_MS
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "FuchsiaBoutique-Android/1.2")
            if (!bearerToken.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $bearerToken")
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
