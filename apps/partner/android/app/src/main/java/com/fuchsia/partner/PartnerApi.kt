package com.fuchsia.partner

import android.content.Context
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class PartnerApiException(message: String, val statusCode: Int) : Exception(message)

data class PartnerVenue(
    val id: Int,
    val name: String,
    val audienceScope: String,
    val city: String,
    val capacity: Int,
    val dailyPrice: Double,
    val primaryImageUrl: String = "",
    val images: List<String> = emptyList(),
)

data class PartnerBooking(
    val id: Int,
    val venueId: Int,
    val audience: String,
    val reservationAt: String,
    val bookingDays: Int,
    val partySize: Int,
    val customerName: String,
    val customerPhone: String,
    val totalAmount: Double,
    val paymentAmount: Double,
    val paymentStatus: String,
    val transactionReference: String?,
    val status: String,
    val paymentReceiptUrl: String?,
    val notes: String?,
    val expiresAt: String? = null,
) {
    val dateOnly: String get() = reservationAt.substringBefore('T')
}

data class PartnerWeeklySlot(val audienceScope: String, val weekDay: Int, val isOpen: Boolean)
data class PartnerBlackout(val id: Int, val startDate: String, val endDate: String, val audienceScope: String, val reason: String?)
data class PartnerMonthAvailability(val booked: Set<String>, val closed: Set<String>)

data class PartnerLogin(val user: JSONObject, val token: String)

object PartnerApi {
    private val baseUrl get() = BuildConfig.API_BASE_URL.trimEnd('/')

    suspend fun login(email: String, password: String): PartnerLogin = withContext(Dispatchers.IO) {
        val response = JSONObject(request("/api/auth/login", "POST", JSONObject().put("email", email).put("password", password)))
        val token = response.optString("token")
        val user = response.optJSONObject("user")
        if (token.isBlank() || user == null) throw PartnerApiException("استجابة تسجيل الدخول غير مكتملة", 502)
        PartnerLogin(user, token)
    }

    suspend fun profile(token: String): JSONObject = withContext(Dispatchers.IO) {
        JSONObject(request("/api/venue-partner/me", "GET", token = token))
    }

    suspend fun requestPartner(token: String, businessName: String, phone: String): JSONObject = withContext(Dispatchers.IO) {
        JSONObject(request("/api/venue-partner/owner-request", "POST", JSONObject()
            .put("businessName", businessName.trim())
            .put("contactPhone", phone.trim()), token))
    }

    suspend fun bookings(token: String): List<PartnerBooking> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/venue-partner/bookings", "GET", token = token)).toObjectList(::toBooking)
    }

    suspend fun setBookingStatus(token: String, bookingId: Int, status: String, reason: String? = null) = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("status", status)
        reason?.takeIf(String::isNotBlank)?.let { payload.put("reason", it.trim().take(500)) }
        request("/api/venue-partner/bookings/$bookingId", "PATCH", payload, token)
        Unit
    }

    suspend fun updateOrder(token: String, orderId: Int, status: String, driverName: String?, driverPhone: String?) = withContext(Dispatchers.IO) {
        request("/api/vendor/orders/$orderId", "PATCH", JSONObject()
            .put("status", status)
            .put("driverName", driverName?.trim().orEmpty())
            .put("driverPhone", driverPhone?.trim().orEmpty()), token)
        Unit
    }

    suspend fun uploadVenueImage(context: Context, uri: Uri, token: String): String = withContext(Dispatchers.IO) {
        val contentType = context.contentResolver.getType(uri)?.lowercase()?.substringBefore(';')
            ?: throw IllegalArgumentException("تعذر تحديد نوع الصورة")
        require(contentType in setOf("image/jpeg", "image/png", "image/webp")) { "اختر صورة JPG أو PNG أو WebP" }
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
            ?: throw IllegalStateException("تعذر قراءة الصورة")
        require(bytes.isNotEmpty() && bytes.size <= 7 * 1024 * 1024) { "يجب ألا يتجاوز حجم الصورة 7 ميغابايت" }
        val boundary = "----Fuchsia${java.util.UUID.randomUUID().toString().replace("-", "") }"
        val connection = (URL(baseUrl + "/api/uploads/image").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"; connectTimeout = 20_000; readTimeout = 30_000; doOutput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer $token")
            setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
        }
        try {
            connection.outputStream.use { stream ->
                val output = stream.buffered()
                output.write("--$boundary\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\nvenue\r\n".toByteArray())
                val extension = when (contentType) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
                output.write("--$boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"venue.$extension\"\r\nContent-Type: $contentType\r\n\r\n".toByteArray())
                output.write(bytes); output.write("\r\n--$boundary--\r\n".toByteArray()); output.flush()
            }
            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
            if (status !in 200..299) throw PartnerApiException(JSONObject(text).optString("error").ifBlank { "تعذر رفع الصورة" }, status)
            JSONObject(text).optString("url").takeIf(String::isNotBlank) ?: throw IllegalStateException("لم يُرجع التخزين رابط الصورة")
        } finally { connection.disconnect() }
    }

    suspend fun updateVenueImages(token: String, venueId: Int, primaryImageUrl: String, images: List<String>) = withContext(Dispatchers.IO) {
        request("/api/venue-partner/venues/$venueId", "PATCH", JSONObject()
            .put("primaryImageUrl", primaryImageUrl)
            .put("images", JSONArray(images.take(12))), token)
        Unit
    }

    suspend fun monthAvailability(token: String, venueId: Int, month: String, audience: String): PartnerMonthAvailability = withContext(Dispatchers.IO) {
        val json = JSONObject(request("/api/venue-partner/venues/$venueId/calendar?month=$month&audience=$audience", "GET", token = token))
        PartnerMonthAvailability(json.arrayStrings("booked").toSet(), json.arrayStrings("closed").toSet())
    }

    suspend fun weeklySchedule(token: String, venueId: Int): List<PartnerWeeklySlot> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/venue-partner/venues/$venueId/availability", "GET", token = token))
            .toObjectList { row ->
                PartnerWeeklySlot(
                    audienceScope = row.optString("audienceScope", "both"),
                    weekDay = row.optInt("weekDay", -1),
                    isOpen = row.optBoolean("isOpen", false),
                )
            }
    }

    suspend fun saveWeeklySchedule(token: String, venueId: Int, slots: List<PartnerWeeklySlot>) = withContext(Dispatchers.IO) {
        val rows = JSONArray()
        slots.forEach { slot ->
            rows.put(JSONObject().put("audienceScope", slot.audienceScope).put("weekDay", slot.weekDay).put("isOpen", slot.isOpen))
        }
        request("/api/venue-partner/venues/$venueId/availability", "PUT", JSONObject().put("slots", rows), token)
        Unit
    }

    suspend fun blackouts(token: String, venueId: Int, month: String): List<PartnerBlackout> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/venue-partner/venues/$venueId/blackouts?month=$month", "GET", token = token))
            .toObjectList { row ->
                PartnerBlackout(
                    id = row.optInt("id"),
                    startDate = row.optString("startDate"),
                    endDate = row.optString("endDate"),
                    audienceScope = row.optString("audienceScope", "both"),
                    reason = if (row.isNull("reason")) null else row.optString("reason").takeIf(String::isNotBlank),
                )
            }
    }

    suspend fun closeDates(token: String, venueId: Int, start: String, end: String, audience: String, reason: String) = withContext(Dispatchers.IO) {
        request("/api/venue-partner/venues/$venueId/blackouts", "POST", JSONObject()
            .put("startDate", start).put("endDate", end).put("audienceScope", audience).put("reason", reason), token)
        Unit
    }

    suspend fun reopenDates(token: String, venueId: Int, blackoutId: Int) = withContext(Dispatchers.IO) {
        request("/api/venue-partner/venues/$venueId/blackouts/$blackoutId", "DELETE", token = token)
        Unit
    }

    private fun toBooking(row: JSONObject) = PartnerBooking(
        id = row.optInt("id"),
        venueId = row.optInt("venueId"),
        audience = row.optString("audience", "women"),
        reservationAt = row.optString("reservationAt"),
        bookingDays = row.optInt("bookingDays", 1).coerceAtLeast(1),
        partySize = row.optInt("partySize"),
        customerName = row.optString("customerName"),
        customerPhone = row.optString("customerPhone"),
        totalAmount = row.optDouble("totalAmount"),
        paymentAmount = row.optDouble("paymentAmount"),
        paymentStatus = row.optString("paymentStatus", "pending_review"),
        transactionReference = row.optString("transactionReference").takeIf(String::isNotBlank),
        status = row.optString("status", "pending"),
        paymentReceiptUrl = row.optString("paymentReceiptUrl").takeIf(String::isNotBlank),
        notes = row.optString("notes").takeIf(String::isNotBlank),
        expiresAt = if (row.isNull("expiresAt")) null else row.optString("expiresAt").takeIf(String::isNotBlank),
    )

    private suspend fun request(path: String, method: String, body: JSONObject? = null, token: String? = null): String = withContext(Dispatchers.IO) {
        val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json; charset=utf-8")
            }
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
        } finally {
            connection.disconnect()
        }
    }
}

private inline fun <T> JSONArray.toObjectList(transform: (JSONObject) -> T): List<T> = buildList {
    for (index in 0 until length()) optJSONObject(index)?.let { add(transform(it)) }
}

private fun JSONObject.arrayStrings(key: String): List<String> {
    val array = optJSONArray(key) ?: return emptyList()
    return buildList { for (index in 0 until array.length()) array.optString(index).takeIf(String::isNotBlank)?.let(::add) }
}
