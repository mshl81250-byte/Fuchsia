package com.fuchsia.partner

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.BufferedInputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID

class PartnerApiException(message: String, val statusCode: Int) : Exception(message) {
    val isUnauthorized: Boolean get() = statusCode == HttpURLConnection.HTTP_UNAUTHORIZED
    val isForbidden: Boolean get() = statusCode == HttpURLConnection.HTTP_FORBIDDEN
    val isRetryable: Boolean get() = statusCode == 0 || statusCode == 408 || statusCode == 429 || statusCode >= 500
}

internal object PartnerHttpClient {
    private val baseUrl get() = BuildConfig.API_BASE_URL.trimEnd('/')

    suspend fun request(
        path: String,
        method: String,
        body: JSONObject? = null,
        token: String? = null,
        connectTimeoutMs: Int = 15_000,
        readTimeoutMs: Int = 20_000,
    ): String = withContext(Dispatchers.IO) {
        val canRetry = method.equals("GET", ignoreCase = true)
        var attempt = 0
        while (true) {
            val connection = (URL(baseUrl + path).openConnection() as HttpURLConnection).apply {
                requestMethod = method
                connectTimeout = connectTimeoutMs
                readTimeout = readTimeoutMs
                setRequestProperty("Accept", "application/json")
                if (!token.isNullOrBlank()) setRequestProperty("Authorization", "Bearer $token")
                if (body != null) {
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json; charset=utf-8")
                }
            }
            try {
                if (body != null) connection.outputStream.use { it.write(body.toString().toByteArray(Charsets.UTF_8)) }
                return@withContext readResponse(connection)
            } catch (error: PartnerApiException) {
                if (!canRetry || !error.isRetryable || attempt > 0) throw error
                attempt++
                delay(350L)
            } catch (error: Exception) {
                val wrapped = PartnerApiException(
                    error.localizedMessage?.takeIf(String::isNotBlank)
                        ?: "تعذر الاتصال بالخادم. تحقق من الإنترنت وحاول مجددًا.",
                    0,
                )
                if (!canRetry || !wrapped.isRetryable || attempt > 0) throw wrapped
                attempt++
                delay(350L)
            } finally {
                connection.disconnect()
            }
        }
    }

    suspend fun uploadImage(
        context: Context,
        uri: Uri,
        token: String,
        storeId: Int,
    ): String = withContext(Dispatchers.IO) {
        val contentType = context.contentResolver.getType(uri)?.lowercase()?.substringBefore(';')
            ?: throw IllegalArgumentException("تعذر تحديد نوع الصورة")
        require(contentType in setOf("image/jpeg", "image/png", "image/webp")) { "اختر صورة JPG أو PNG أو WebP" }
        val maxBytes = 7L * 1024 * 1024
        val declaredSize = context.contentResolver.query(uri, arrayOf(OpenableColumns.SIZE), null, null, null)
            ?.use { cursor -> if (cursor.moveToFirst() && !cursor.isNull(0)) cursor.getLong(0) else -1L }
            ?: -1L
        require(declaredSize <= maxBytes || declaredSize < 0) { "يجب ألا يتجاوز حجم كل صورة 7 ميغابايت" }

        val boundary = "----Fuchsia${UUID.randomUUID().toString().replace("-", "")}"
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
            connection.setChunkedStreamingMode(16 * 1024)
            connection.outputStream.use { stream ->
                val output = stream.buffered()
                fun field(name: String, value: String) {
                    output.write("--$boundary\r\nContent-Disposition: form-data; name=\"$name\"\r\n\r\n$value\r\n".toByteArray(Charsets.UTF_8))
                }
                field("purpose", "rental")
                field("storeId", storeId.toString())
                val extension = when (contentType) { "image/png" -> "png"; "image/webp" -> "webp"; else -> "jpg" }
                output.write("--$boundary\r\nContent-Disposition: form-data; name=\"image\"; filename=\"rental.$extension\"\r\nContent-Type: $contentType\r\n\r\n".toByteArray(Charsets.UTF_8))
                val input = context.contentResolver.openInputStream(uri)?.let(::BufferedInputStream)
                    ?: throw IllegalStateException("تعذر قراءة الصورة")
                input.use { source ->
                    val buffer = ByteArray(16 * 1024)
                    var totalBytes = 0L
                    while (true) {
                        val read = source.read(buffer)
                        if (read < 0) break
                        totalBytes += read
                        require(totalBytes <= maxBytes) { "يجب ألا يتجاوز حجم كل صورة 7 ميغابايت" }
                        output.write(buffer, 0, read)
                    }
                    require(totalBytes > 0) { "لا يمكن رفع صورة فارغة" }
                }
                output.write("\r\n--$boundary--\r\n".toByteArray(Charsets.UTF_8))
                output.flush()
            }
            val response = readResponse(connection)
            JSONObject(response).optString("url").takeIf(String::isNotBlank)
                ?: throw IllegalStateException("لم يُرجع الخادم رابط الصورة")
        } catch (error: PartnerApiException) {
            throw error
        } catch (error: IllegalArgumentException) {
            throw error
        } catch (error: IllegalStateException) {
            throw error
        } catch (error: Exception) {
            throw PartnerApiException(
                error.localizedMessage?.takeIf(String::isNotBlank)
                    ?: "تعذر رفع الصورة. تحقق من الإنترنت وحاول مجددًا.",
                0,
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun readResponse(connection: HttpURLConnection): String {
        val status = connection.responseCode
        val stream = if (status in 200..299) connection.inputStream else connection.errorStream
        val text = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
        if (status !in 200..299) {
            throw PartnerApiException(errorMessage(status, text), status)
        }
        return text.ifBlank { "{}" }
    }

    private fun errorMessage(status: Int, body: String): String {
        val serverMessage = runCatching {
            val json = JSONObject(body)
            json.optString("error").ifBlank { json.optString("message") }
        }.getOrNull().orEmpty()
        if (serverMessage.isNotBlank()) return serverMessage
        return when (status) {
            401 -> "انتهت جلسة الدخول. سجّل الدخول مرة أخرى."
            403 -> "لا تملك صلاحية تنفيذ هذه العملية."
            404 -> "المسار المطلوب غير متاح على الخادم الحالي."
            408 -> "انتهت مهلة الاتصال. حاول مجددًا."
            409 -> "تعذر تنفيذ العملية بسبب تعارض في البيانات. حدّث الصفحة وحاول مجددًا."
            429 -> "تم تجاوز عدد المحاولات المسموح. انتظر قليلًا ثم حاول مجددًا."
            in 500..599 -> "الخادم غير متاح مؤقتًا. حاول مجددًا لاحقًا."
            else -> "تعذر الاتصال بالخادم (HTTP $status)"
        }
    }
}
