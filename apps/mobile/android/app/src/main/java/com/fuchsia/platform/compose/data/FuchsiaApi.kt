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
import java.util.Locale
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
    val images: List<String> = emptyList(),
    val rating: Double = 0.0,
    val reviewCount: Int = 0,
    val originalPrice: Double? = null,
    val inStock: Boolean = true,
    val deliveryDays: Int? = null,
    val tags: List<String> = emptyList(),
    val fulfillmentType: String = "sale",
    val rentalDailyPrice: Double? = null,
    val rentalDeposit: Double = 0.0,
    val rentalMinDays: Int = 1,
    val rentalMaxDays: Int = 3,
    val rentalCategory: String = "other",
    val eventAudience: String = "both",
    val tableHeightCm: Double? = null,
    val availableColors: List<String> = emptyList(),
    val stockQuantity: Int? = null,
)

data class RentalBookingDraft(
    val product: StoreProduct,
    val startDate: String,
    val days: Int,
    val quantity: Int,
    val fulfillment: String,
    val timeSlot: String,
    val idempotencyKey: String,
)

data class RentalAvailability(
    val availableQuantity: Int,
    val stockQuantity: Int,
    val reservedQuantity: Int,
    val endDate: String,
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
    val fulfillmentType: String = "sale",
    val rentalStartDate: String? = null,
    val rentalDays: Int? = null,
    val rentalEndDate: String? = null,
    val rentalDeposit: Double = 0.0,
    val rentalFulfillment: String? = null,
    val rentalTimeSlot: String? = null,
    val lineTotal: Double = price * quantity,
)

data class ShoppingCart(
    val sessionId: String,
    val items: List<CartLine>,
    val subtotal: Double,
    val deliveryFee: Double,
    val discount: Double,
    val total: Double,
    val rentalDeposit: Double = 0.0,
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

data class VenueSummary(
    val id: Int,
    val name: String,
    val description: String,
    val imageUrl: String?,
    val images: List<String> = emptyList(),
    val address: String,
    val city: String,
    val capacity: Int,
    val priceFrom: Double,
    val rating: Double,
    val reviewCount: Int,
    val audience: String,
    val amenities: List<String>,
    val rules: String,
)

data class VenueAvailability(
    val venueId: Int,
    val month: String,
    val booked: Set<String>,
    val closed: Set<String> = emptySet(),
)

data class TableReservation(
    val id: Int,
    val storeId: Int,
    val venueId: Int = 0,
    val reservationAt: String,
    val bookingDays: Int = 1,
    val partySize: Int,
    val status: String,
    val customerName: String,
    val customerPhone: String,
)

data class DeliveryAddress(
    val id: Int,
    val label: String,
    val recipientName: String,
    val phone: String,
    val address: String,
    val notes: String?,
    val latitude: Double?,
    val longitude: Double?,
    val isDefault: Boolean,
)

data class CustomerOrder(
    val id: Int,
    val status: String,
    val total: Double,
    val createdAt: String,
    val itemCount: Int,
    val isGift: Boolean,
)

data class OrderStatusUpdate(
    val status: String,
    val message: String,
    val createdAt: String,
)

data class RentalTracking(
    val startDate: String,
    val returnDate: String,
    val days: Int,
    val deposit: Double,
    val reminder: String?,
    val depositStatus: String = "pending",
    val refundedAmount: Double = 0.0,
    val damageDeduction: Double = 0.0,
    val lateFee: Double = 0.0,
    val depositReason: String? = null,
    val processedAt: String? = null,
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
    val rental: RentalTracking? = null,
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

    suspend fun profile(bearerToken: String): JSONObject = getJson("/api/auth/profile", bearerToken)

    suspend fun updateProfile(
        bearerToken: String,
        fullName: String,
        phone: String,
    ): JSONObject = sendJson(
        "/api/auth/profile",
        "PATCH",
        JSONObject().put("fullName", fullName).put("phone", phone),
        bearerToken = bearerToken,
    )

    suspend fun addresses(bearerToken: String): List<DeliveryAddress> = withContext(Dispatchers.IO) {
        val array = JSONArray(getText("/api/addresses", bearerToken))
        buildList {
            for (index in 0 until array.length()) {
                val item = array.optJSONObject(index) ?: continue
                add(item.toDeliveryAddress())
            }
        }
    }

    suspend fun createAddress(payload: JSONObject, bearerToken: String): DeliveryAddress =
        sendJson("/api/addresses", "POST", payload, bearerToken = bearerToken).toDeliveryAddress()

    suspend fun updateAddress(id: Int, payload: JSONObject, bearerToken: String): DeliveryAddress =
        sendJson("/api/addresses/$id", "PATCH", payload, bearerToken = bearerToken).toDeliveryAddress()

    suspend fun deleteAddress(id: Int, bearerToken: String) {
        sendJson("/api/addresses/$id", "DELETE", bearerToken = bearerToken)
    }

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

    suspend fun searchProducts(query: String): List<StoreProduct> = withContext(Dispatchers.IO) {
        parseProducts(getText("/api/products?search=${urlEncode(query.trim())}&limit=30"))
    }

    suspend fun product(productId: Int): StoreProduct = withContext(Dispatchers.IO) {
        getJson("/api/products/$productId").toStoreProduct()
    }

    suspend fun favorites(userId: Int): List<StoreProduct> = withContext(Dispatchers.IO) {
        parseProducts(getText("/api/favorites?userId=$userId"))
    }

    suspend fun toggleFavorite(userId: Int, productId: Int): Boolean = withContext(Dispatchers.IO) {
        sendJson(
            "/api/favorites",
            "POST",
            JSONObject().put("userId", userId).put("productId", productId),
        ).optBoolean("isFavorite", false)
    }

    suspend fun getCart(sessionId: String): ShoppingCart = parseCart(
        getJson("/api/cart?sessionId=${urlEncode(sessionId)}"),
    )

    suspend fun addToCart(
        sessionId: String,
        productId: Int,
        quantity: Int = 1,
        giftWrapping: Boolean = false,
        giftMessage: String? = null,
        rentalStartDate: String? = null,
        rentalDays: Int? = null,
        rentalFulfillment: String? = null,
        rentalTimeSlot: String? = null,
    ): ShoppingCart = parseCart(
        post(
            "/api/cart",
            JSONObject()
                .put("sessionId", sessionId)
                .put("productId", productId)
                .put("quantity", quantity)
                .put("giftWrapping", giftWrapping)
                .put("giftMessage", giftMessage)
                .putNullable("rentalStartDate", rentalStartDate)
                .putNullable("rentalDays", rentalDays)
                .putNullable("rentalFulfillment", rentalFulfillment)
                .putNullable("rentalTimeSlot", rentalTimeSlot),
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

    suspend fun venues(search: String = "", audience: String? = null): List<VenueSummary> = withContext(Dispatchers.IO) {
        val params = listOfNotNull(
            search.trim().takeIf(String::isNotBlank)?.let { "search=${urlEncode(it)}" },
            audience?.takeIf(String::isNotBlank)?.let { "audience=${urlEncode(it)}" },
        )
        val suffix = if (params.isEmpty()) "" else "?${params.joinToString("&")}"
        parseVenues(JSONArray(getText("/api/venues$suffix")))
    }

    suspend fun venue(venueId: Int): VenueSummary = getJson("/api/venues/$venueId").toVenue()

    suspend fun venuePartnerProfile(bearerToken: String): JSONObject = getJson("/api/venue-partner/me", bearerToken)

    suspend fun requestVenuePartner(payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/venue-partner/owner-request", "POST", payload, bearerToken = bearerToken)

    suspend fun createPartnerVenue(payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/venue-partner/venues", "POST", payload, bearerToken = bearerToken)

    suspend fun savePartnerVenueAvailability(venueId: Int, payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/venue-partner/venues/$venueId/availability", "PUT", payload, bearerToken = bearerToken)

    suspend fun updatePartnerVenue(venueId: Int, payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/venue-partner/venues/$venueId", "PATCH", payload, bearerToken = bearerToken)

    suspend fun vendorStores(bearerToken: String): List<JSONObject> = withContext(Dispatchers.IO) {
        val rows = JSONArray(getText("/api/vendor/stores", bearerToken))
        buildList { for (index in 0 until rows.length()) rows.optJSONObject(index)?.let(::add) }
    }

    suspend fun vendorProducts(storeId: Int, bearerToken: String): List<JSONObject> = withContext(Dispatchers.IO) {
        val rows = JSONArray(getText("/api/vendor/products?storeId=$storeId", bearerToken))
        buildList { for (index in 0 until rows.length()) rows.optJSONObject(index)?.let(::add) }
    }

    suspend fun createVendorProduct(payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/vendor/products", "POST", payload, bearerToken = bearerToken)

    suspend fun updateVendorProduct(productId: Int, payload: JSONObject, bearerToken: String): JSONObject =
        sendJson("/api/vendor/products/$productId", "PATCH", payload, bearerToken = bearerToken)

    suspend fun uploadPartnerImage(context: Context, uri: Uri, purpose: String, bearerToken: String): String = withContext(Dispatchers.IO) {
        require(purpose == "venue" || purpose == "rental") { "نوع الصورة غير صحيح" }
        val contentType = context.contentResolver.getType(uri)?.lowercase()?.substringBefore(';') ?: throw IllegalArgumentException("تعذر تحديد نوع الصورة")
        require(contentType in setOf("image/jpeg", "image/png", "image/webp")) { "اختر صورة JPG أو PNG أو WebP" }
        val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: throw IllegalStateException("تعذر قراءة الصورة")
        require(bytes.isNotEmpty() && bytes.size <= 7 * 1024 * 1024) { "يجب ألا يتجاوز حجم الصورة 7 ميغابايت" }

        val boundary = "----Fuchsia${UUID.randomUUID().toString().replace("-", "")}"
        val connection = open("/api/uploads/image", "POST", bearerToken)
        try {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "multipart/form-data; boundary=$boundary")
            connection.outputStream.use { stream ->
                val output = stream.buffered()
                fun writeText(value: String) { output.write(value.toByteArray(Charsets.UTF_8)) }
                writeText("--$boundary\r\nContent-Disposition: form-data; name=\"purpose\"\r\n\r\n$purpose\r\n")
                val extension = when (contentType) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
                writeText("--$boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"upload.$extension\"\r\nContent-Type: $contentType\r\n\r\n")
                output.write(bytes)
                writeText("\r\n--$boundary--\r\n")
                output.flush()
            }
            val response = readJson(connection)
            response.optString("url").takeIf(String::isNotBlank) ?: throw IllegalStateException("لم يُرجع التخزين رابط الصورة")
        } finally { connection.disconnect() }
    }

    suspend fun venueAvailability(venueId: Int, month: String, audience: String): VenueAvailability = withContext(Dispatchers.IO) {
        val year = month.substring(0, 4).toIntOrNull() ?: throw IllegalArgumentException("صيغة الشهر غير صحيحة")
        val monthNumber = month.substringAfter('-').toIntOrNull()?.takeIf { it in 1..12 }
            ?: throw IllegalArgumentException("صيغة الشهر غير صحيحة")
        val nextMonth = if (monthNumber == 12) java.lang.String.format(java.util.Locale.US, "%04d-01", year + 1)
        else java.lang.String.format(java.util.Locale.US, "%04d-%02d", year, monthNumber + 1)
        val current = getJson("/api/venues/$venueId/availability?month=${urlEncode(month)}&audience=${urlEncode(audience)}")
        val next = getJson("/api/venues/$venueId/availability?month=${urlEncode(nextMonth)}&audience=${urlEncode(audience)}")
        val booked = buildSet {
            listOf(current, next).forEach { response ->
                val rows = response.optJSONArray("booked") ?: JSONArray()
                for (index in 0 until rows.length()) add(rows.optString(index))
            }
        }
        val closed = buildSet {
            listOf(current, next).forEach { response ->
                val rows = response.optJSONArray("closed") ?: JSONArray()
                for (index in 0 until rows.length()) add(rows.optString(index))
            }
        }
        VenueAvailability(current.optInt("venueId", venueId), current.optString("month", month), booked, closed)
    }

    suspend fun createOrder(payload: JSONObject): JSONObject = post("/api/orders", payload)

    suspend fun rentalAvailability(productId: Int, startDate: String, days: Int): RentalAvailability = withContext(Dispatchers.IO) {
        val response = getJson(
            "/api/rental-bookings/availability?productId=$productId&startDate=${urlEncode(startDate)}&days=$days",
        )
        RentalAvailability(
            availableQuantity = response.optInt("availableQuantity"),
            stockQuantity = response.optInt("stockQuantity"),
            reservedQuantity = response.optInt("reservedQuantity"),
            endDate = response.optString("endDate"),
        )
    }

    suspend fun createRentalBooking(payload: JSONObject, bearerToken: String? = null): JSONObject =
        sendJson("/api/rental-bookings", "POST", payload, bearerToken = bearerToken)

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
                        isGift = item.optBoolean("isGift", false),
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
            rental = json.optJSONObject("rental")?.let { rental ->
                RentalTracking(
                    startDate = rental.optString("startDate"),
                    returnDate = rental.optString("returnDate"),
                    days = rental.optInt("days", 1),
                    deposit = rental.optDouble("deposit", 0.0),
                    reminder = rental.nullableString("reminder"),
                    depositStatus = rental.optString("depositStatus").ifBlank { "pending" },
                    refundedAmount = rental.optDouble("refundedAmount", 0.0),
                    damageDeduction = rental.optDouble("damageDeduction", 0.0),
                    lateFee = rental.optDouble("lateFee", 0.0),
                    depositReason = rental.nullableString("depositReason"),
                    processedAt = rental.nullableString("processedAt"),
                )
            },
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

    suspend fun createVenueBooking(payload: JSONObject, bearerToken: String): TableReservation =
        sendJson("/api/venue-bookings", "POST", payload, bearerToken = bearerToken).toReservation()

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
                add(item.toStoreProduct())
            }
        }
    }

    private fun parseVenues(array: JSONArray): List<VenueSummary> = buildList {
        for (i in 0 until array.length()) array.optJSONObject(i)?.let { add(it.toVenue()) }
    }

    private fun JSONObject.toVenue() = VenueSummary(
        id = optInt("id"),
        name = optString("nameAr"),
        description = optString("descriptionAr"),
        imageUrl = nullableString("imageUrl"),
        images = optStringArray("images"),
        address = optString("address"),
        city = optString("city"),
        capacity = optInt("capacity", 0),
        priceFrom = optDouble("priceFrom", 0.0),
        rating = optDouble("rating", 0.0),
        reviewCount = optInt("reviewCount", 0),
        audience = optString("venueAudience").ifBlank { "both" },
        amenities = optStringArray("amenities"),
        rules = optString("rules"),
    )

    private fun JSONObject.toStoreProduct(): StoreProduct {
        val imageRows = optJSONArray("images")
        val images = buildList {
            if (imageRows != null) {
                for (i in 0 until imageRows.length()) {
                    imageRows.optString(i).takeIf(String::isNotBlank)?.let(::add)
                }
            }
        }
        val image = images.firstOrNull() ?: nullableString("imageUrl")
        val discountedPrice = optDouble("discountPrice").takeIf { it > 0 }
        val basePrice = optDouble("price", 0.0)
        val productName = optString("nameAr").ifBlank { optString("name") }
        val productDescription = optString("descriptionAr").ifBlank { optString("description") }
        val productTags = optStringArray("tags")
        val nestedCategoryName = optJSONObject("category")?.optString("nameAr").orEmpty()
        val classificationText = (
            listOf(
                productName,
                productDescription,
                optString("categoryName"),
                optString("categoryNameAr"),
                optString("categoryAr"),
                optString("category"),
                nestedCategoryName,
            ) + productTags
        ).joinToString(" ").lowercase(Locale.ROOT)
        val declaredRentalCategory = optString("rentalCategory").trim().lowercase(Locale.ROOT)
        val rentalCategory = when {
            declaredRentalCategory == "kosh" -> "kosh"
            declaredRentalCategory == "table" -> "table"
            classificationText.contains("كوش") ||
                classificationText.contains("kosh") ||
                classificationText.contains("koush") -> "kosh"
            classificationText.contains("طاول") || classificationText.contains("table") -> "table"
            else -> "other"
        }
        val fulfillmentType = if (
            optString("fulfillmentType").equals("rental", ignoreCase = true) || rentalCategory != "other"
        ) "rental" else "sale"
        return StoreProduct(
            id = optInt("id"),
            name = productName,
            description = productDescription,
            price = discountedPrice ?: basePrice,
            imageUrl = image,
            categoryId = optInt("categoryId"),
            images = images.ifEmpty { image?.let(::listOf).orEmpty() },
            rating = optDouble("rating", 0.0),
            reviewCount = optInt("reviewCount", 0),
            originalPrice = discountedPrice?.let { basePrice.takeIf { value -> value > it } },
            inStock = optBoolean("inStock", true),
            deliveryDays = if (isNull("deliveryDays")) null else optInt("deliveryDays"),
            tags = productTags,
            fulfillmentType = fulfillmentType,
            rentalDailyPrice = nullableDouble("rentalDailyPrice") ?: basePrice.takeIf { fulfillmentType == "rental" },
            rentalDeposit = optDouble("rentalDeposit", 0.0),
            rentalMinDays = optInt("rentalMinDays", 1),
            rentalMaxDays = optInt("rentalMaxDays", 3),
            rentalCategory = rentalCategory,
            eventAudience = optString("eventAudience").ifBlank { "both" },
            tableHeightCm = if (isNull("tableHeightCm")) null else optDouble("tableHeightCm"),
            availableColors = optStringArray("availableColors"),
            stockQuantity = if (isNull("stockQuantity")) null else optInt("stockQuantity"),
        )
    }

    private fun JSONObject.optStringArray(name: String): List<String> {
        val rows = optJSONArray(name) ?: return emptyList()
        return buildList {
            for (i in 0 until rows.length()) rows.optString(i).takeIf(String::isNotBlank)?.let(::add)
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
                        fulfillmentType = row.optString("fulfillmentType").ifBlank { "sale" },
                        rentalStartDate = row.nullableString("rentalStartDate"),
                        rentalDays = if (row.isNull("rentalDays")) null else row.optInt("rentalDays"),
                        rentalEndDate = row.nullableString("rentalEndDate"),
                        rentalDeposit = row.optDouble("rentalDeposit", 0.0),
                        rentalFulfillment = row.nullableString("rentalFulfillment"),
                        rentalTimeSlot = row.nullableString("rentalTimeSlot"),
                        lineTotal = row.optDouble("lineTotal", row.optDouble("price", 0.0) * row.optInt("quantity", 1)),
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
            rentalDeposit = json.optDouble("rentalDeposit", 0.0),
        )
    }

    private fun JSONObject.toReservation() = TableReservation(
        id = optInt("id"),
        storeId = optInt("storeId"),
        venueId = optInt("venueId"),
        reservationAt = optString("reservationAt"),
        bookingDays = optInt("bookingDays", 1),
        partySize = optInt("partySize"),
        status = optString("status").ifBlank { "pending" },
        customerName = optString("customerName"),
        customerPhone = optString("customerPhone"),
    )

    private fun JSONObject.toDeliveryAddress() = DeliveryAddress(
        id = optInt("id"),
        label = optString("label").ifBlank { "عنوان التوصيل" },
        recipientName = optString("recipientName"),
        phone = optString("phone"),
        address = optString("address"),
        notes = nullableString("notes"),
        latitude = nullableDouble("latitude"),
        longitude = nullableDouble("longitude"),
        isDefault = optBoolean("isDefault"),
    )

    private fun JSONObject.nullableString(name: String): String? =
        if (isNull(name)) null else optString(name).takeIf(String::isNotBlank)

    private fun JSONObject.nullableDouble(name: String): Double? =
        if (isNull(name)) null else optDouble(name).takeIf(Double::isFinite)

    private fun JSONObject.putNullable(name: String, value: Any?): JSONObject {
        if (value == null) put(name, JSONObject.NULL) else put(name, value)
        return this
    }

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
            setRequestProperty("User-Agent", "FuchsiaBoutique-Android/1.3")
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
