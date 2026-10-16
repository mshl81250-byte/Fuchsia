package com.fuchsia.partner

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

data class PartnerVenue(
    val id: Int,
    val name: String,
    val audienceScope: String,
    val city: String,
    val capacity: Int,
    val dailyPrice: Double,
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
data class PartnerNotification(val id: Int, val type: String, val title: String, val message: String, val isRead: Boolean, val createdAt: String, val bookingType: String?, val bookingId: Int?)

data class PartnerLogin(val user: JSONObject, val token: String)

object PartnerApi {
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

    suspend fun notifications(token: String): List<PartnerNotification> = withContext(Dispatchers.IO) {
        JSONArray(request("/api/notifications/partner", "GET", token = token)).toObjectList { row ->
            PartnerNotification(row.optInt("id"), row.optString("type"), row.optString("title"), row.optString("message"), row.optBoolean("isRead"), row.optString("createdAt"), row.optString("bookingType").takeIf(String::isNotBlank), if (row.isNull("bookingId")) null else row.optInt("bookingId"))
        }
    }

    suspend fun markNotificationRead(token: String, notificationId: Int) = withContext(Dispatchers.IO) {
        request("/api/notifications/partner/$notificationId/read", "PATCH", token = token)
        Unit
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

    private suspend fun request(path: String, method: String, body: JSONObject? = null, token: String? = null): String =
        PartnerHttpClient.request(path, method, body, token)
}

private inline fun <T> JSONArray.toObjectList(transform: (JSONObject) -> T): List<T> = buildList {
    for (index in 0 until length()) optJSONObject(index)?.let { add(transform(it)) }
}

private fun JSONObject.arrayStrings(key: String): List<String> {
    val array = optJSONArray(key) ?: return emptyList()
    return buildList { for (index in 0 until array.length()) array.optString(index).takeIf(String::isNotBlank)?.let(::add) }
}
