package com.fuchsia.partner

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

internal data class PartnerStore(val id: Int, val name: String, val logoUrl: String, val isOpen: Boolean)
internal data class PartnerCategory(val id: Int, val name: String)
internal data class PartnerRentalProduct(
    val id: Int,
    val storeId: Int,
    val name: String,
    val description: String,
    val categoryId: Int,
    val rentalCategory: String,
    val audience: String,
    val dailyPrice: Double,
    val deposit: Double,
    val minDays: Int,
    val maxDays: Int,
    val tableHeightCm: Double?,
    val colors: List<String>,
    val stockQuantity: Int,
    val inStock: Boolean,
    val isPublished: Boolean,
    val imageUrl: String,
    val images: List<String>,
    val bufferDays: Int = 0,
)
internal data class PartnerRentalItem(
    val name: String,
    val quantity: Int,
    val price: Double,
    val startDate: String,
    val days: Int,
    val endDate: String,
    val fulfillment: String,
    val timeSlot: String,
    val imageUrl: String,
)
internal data class PartnerRentalBooking(
    val id: Int,
    val status: String,
    val customerName: String,
    val customerPhone: String,
    val total: Double,
    val paymentAmount: Double,
    val paymentStatus: String,
    val paymentReceiptUrl: String?,
    val transactionReference: String?,
    val notes: String?,
    val items: List<PartnerRentalItem>,
    val changeRequests: List<PartnerRentalChangeRequest> = emptyList(),
)
internal data class PartnerStoreOrder(
    val id: Int,
    val status: String,
    val customerName: String,
    val customerPhone: String,
    val deliveryAddress: String,
    val total: Double,
    val driverName: String?,
    val driverPhone: String?,
    val createdAt: String,
)
internal data class PartnerRentalChangeRequest(val id: Int, val type: String, val requestedStartDate: String?, val reason: String?)
internal data class PartnerMaintenanceBlock(val id: Int, val productId: Int, val productName: String, val startDate: String, val endDate: String, val quantity: Int, val reason: String?)

internal object PartnerRentalApi {
    private val baseUrl get() = BuildConfig.API_BASE_URL.trimEnd('/')

    suspend fun stores(token: String): List<PartnerStore> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/vendor/stores", "GET", token = token)).objects { row ->
            PartnerStore(row.optInt("id"), row.optString("nameAr"), row.optString("logoUrl"), row.optBoolean("isOpen", true))
        }
    }

    suspend fun categories(): List<PartnerCategory> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/categories", "GET")).objects { row -> PartnerCategory(row.optInt("id"), row.optString("nameAr")) }
    }

    suspend fun products(token: String, storeId: Int): List<PartnerRentalProduct> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/vendor/products?storeId=$storeId", "GET", token = token)).objects { it }
            .filter { it.optString("fulfillmentType") == "rental" }
            .map(::product)
    }

    suspend fun createProduct(token: String, payload: JSONObject): PartnerRentalProduct = withContext(Dispatchers.IO) {
        product(JSONObject(request("/api/vendor/products", "POST", payload, token)))
    }

    suspend fun updateProduct(token: String, productId: Int, payload: JSONObject): PartnerRentalProduct = withContext(Dispatchers.IO) {
        product(JSONObject(request("/api/vendor/products/$productId", "PATCH", payload, token)))
    }

    suspend fun bookings(token: String, storeId: Int): List<PartnerRentalBooking> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/vendor/rental-bookings?storeId=$storeId", "GET", token = token)).objects(::booking)
    }

    suspend fun orders(token: String, storeId: Int): List<PartnerStoreOrder> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/vendor/orders?storeId=$storeId", "GET", token = token)).objects { row ->
            PartnerStoreOrder(row.optInt("id"), row.optString("status", "received"), row.optString("customerName"), row.optString("customerPhone"), row.optString("deliveryAddress"), row.optDouble("total"), row.optString("driverName").takeIf(String::isNotBlank), row.optString("driverPhone").takeIf(String::isNotBlank), row.optString("createdAt"))
        }
    }

    suspend fun decideBooking(token: String, storeId: Int, orderId: Int, decision: String, reason: String = "") = withContext(Dispatchers.IO) {
        request("/api/vendor/rental-bookings/$orderId", "PATCH", JSONObject()
            .put("storeId", storeId).put("decision", decision).put("reason", reason), token)
        Unit
    }

    suspend fun decideChangeRequest(token: String, storeId: Int, orderId: Int, requestId: Int, decision: String, responseNote: String = "") = withContext(Dispatchers.IO) {
        request("/api/vendor/rental-bookings/$orderId/change-requests/$requestId", "PATCH", JSONObject()
            .put("storeId", storeId).put("decision", decision).put("responseNote", responseNote), token)
        Unit
    }

    suspend fun maintenance(token: String, storeId: Int, month: String): List<PartnerMaintenanceBlock> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/vendor/rental-maintenance?storeId=$storeId&month=$month", "GET", token = token)).objects { row ->
            PartnerMaintenanceBlock(row.optInt("id"), row.optInt("productId"), row.optString("productName"), row.optString("startDate").take(10), row.optString("endDate").take(10), row.optInt("quantity", 1), row.optString("reason").takeIf(String::isNotBlank))
        }
    }

    suspend fun addMaintenance(token: String, storeId: Int, productId: Int, startDate: String, endDate: String, quantity: Int, reason: String) = withContext(Dispatchers.IO) {
        request("/api/vendor/rental-maintenance", "POST", JSONObject().put("storeId", storeId).put("productId", productId).put("startDate", startDate).put("endDate", endDate).put("quantity", quantity).put("reason", reason), token)
        Unit
    }

    suspend fun deleteMaintenance(token: String, blockId: Int) = withContext(Dispatchers.IO) {
        request("/api/vendor/rental-maintenance/$blockId", "DELETE", token = token)
        Unit
    }

    suspend fun uploadImage(context: Context, uri: Uri, token: String, storeId: Int): String = withContext(Dispatchers.IO) {
        val contentType = context.contentResolver.getType(uri)?.lowercase()?.substringBefore(';')
            ?: throw IllegalArgumentException("تعذر تحديد نوع الصورة")
        require(contentType in setOf("image/jpeg", "image/png", "image/webp")) { "اختر صورة JPG أو PNG أو WebP" }
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("تعذر قراءة الصورة")
        require(bytes.isNotEmpty() && bytes.size <= 7 * 1024 * 1024) { "يجب ألا يتجاوز حجم كل صورة 7 ميغابايت" }

        val boundary = "----Fuchsia${UUID.randomUUID().toString().replace("-", "") }"
        val connection = (URL(baseUrl + "/api/uploads/image").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 20_000
            readTimeout = 30_000
            doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        }
        try {
            connection.outputStream.use { stream ->
                val output = stream.buffered()
                fun field(name: String, value: String) {
                    output.write("--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n".toByteArray(Charsets.UTF_8))
                }
                field("purpose", "rental")
                field("storeId", storeId.toString())
                val extension = when (contentType) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
                output.write("--$boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"rental.$extension\"\r\nContent-Type: $contentType\r\n\r\n".toByteArray(Charsets.UTF_8))
                output.write(bytes)
                output.write("\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8))
                output.flush()
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty()
                throw PartnerApiException(message.ifBlank { "تعذر رفع الصورة (HTTP $status)" }, status)
            }
            JSONObject(text).optString("url").takeIf(String::isNotBlank)
                ?: throw IllegalStateException("لم يُرجع الخادم رابط الصورة")
        } finally { connection.disconnect() }
    }

    private suspend fun request(path: String, method: String, body: JSONObject? = null, token: String? = null): String = withContext(Dispatchers.IO) {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
            if (body != null) { doOutput = true; setRequestProperty("Content-Type", "application/json; charset=utf-8") }
        }
        try {
            if (body != null) connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) {
                val message = runCatching { JSONObject(text).optString("error") }.getOrNull().orEmpty()
                throw PartnerApiException(message.ifBlank { "تعذر الاتصال بالخادم (HTTP $status)" }, status)
            }
            text.ifBlank { "{}" }
        } catch (error: PartnerApiException) {
            throw error
        } catch (error: Exception) {
            throw PartnerApiException(error.localizedMessage ?: "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.", 0)
        } finally { connection.disconnect() }
    }

    private fun product(row: JSONObject) = PartnerRentalProduct(
        id = row.optInt("id"), storeId = row.optInt("storeId"), name = row.optString("nameAr"),
        description = row.optString("description"), categoryId = row.optInt("categoryId"),
        rentalCategory = row.optString("rentalCategory", "other"), audience = row.optString("eventAudience", "both"),
        dailyPrice = row.optDouble("rentalDailyPrice", row.optDouble("price")), deposit = row.optDouble("rentalDeposit"),
        minDays = row.optInt("rentalMinDays", 1), maxDays = row.optInt("rentalMaxDays", 3),
        tableHeightCm = if (row.isNull("tableHeightCm")) null else row.optDouble("tableHeightCm"),
        colors = row.strings("availableColors"), stockQuantity = row.optInt("stockQuantity"),
        inStock = row.optBoolean("inStock", true), isPublished = row.optBoolean("isPublished"),
        imageUrl = row.optString("imageUrl"), images = row.strings("images"), bufferDays = row.optInt("rentalBufferDays", 0),
    )

    private fun booking(row: JSONObject): PartnerRentalBooking {
        val itemRows = row.optJSONArray("items") ?: JSONArray()
        val items = itemRows.objects { item ->
            PartnerRentalItem(
                name = item.optString("productName"), quantity = item.optInt("quantity", 1), price = item.optDouble("price"),
                startDate = item.optString("rentalStartDate"), days = item.optInt("rentalDays", 1), endDate = item.optString("rentalEndDate"),
                fulfillment = item.optString("rentalFulfillment"), timeSlot = item.optString("rentalTimeSlot"), imageUrl = item.optString("imageUrl"),
            )
        }.filterIndexed { index, _ -> itemRows.optJSONObject(index)?.optString("fulfillmentType") == "rental" }
        val requests = (row.optJSONArray("changeRequests") ?: JSONArray()).objects { request ->
            PartnerRentalChangeRequest(request.optInt("id"), request.optString("requestType"), request.optString("requestedStartDate").takeIf(String::isNotBlank), request.optString("reason").takeIf(String::isNotBlank))
        }
        return PartnerRentalBooking(
            id = row.optInt("id"), status = row.optString("status"), customerName = row.optString("customerName"),
            customerPhone = row.optString("customerPhone"), total = row.optDouble("total"), paymentAmount = row.optDouble("paymentAmount"),
            paymentStatus = row.optString("paymentStatus"), paymentReceiptUrl = row.optString("paymentReceiptUrl").takeIf(String::isNotBlank),
            transactionReference = row.optString("transactionReference").takeIf(String::isNotBlank), notes = row.optString("notes").takeIf(String::isNotBlank), items = items, changeRequests = requests,
        )
    }
}

private inline fun <T> JSONArray.objects(transform: (JSONObject) -> T): List<T> = buildList {
    for (index in 0 until length()) optJSONObject(index)?.let { add(transform(it)) }
}

private fun JSONObject.strings(key: String): List<String> {
    val value = opt(key)
    val array = when (value) { is JSONArray -> value; is String -> runCatching { JSONArray(value) }.getOrNull(); else -> null } ?: return emptyList()
    return buildList { for (index in 0 until array.length()) array.optString(index).takeIf(String::isNotBlank)?.let(::add) }
}
