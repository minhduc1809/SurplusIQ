package com.surplusiq.app.data.remote

import com.google.gson.JsonParser
import retrofit2.Response

/**
 * Gọi API và chuyển kết quả thành Result; lỗi HTTP trả về message thật của backend
 * NestJS ({ "message": string | string[] }) để người dùng thấy đúng lý do (vd. "tối đa 5 địa điểm").
 */
suspend fun <T, R> apiCall(
    fallbackMessage: String,
    call: suspend () -> Response<T>,
    map: (T) -> R
): Result<R> = try {
    val response = call()
    val body = response.body()
    if (response.isSuccessful && body != null) {
        Result.success(map(body))
    } else {
        Result.failure(Exception(parseErrorMessage(response.errorBody()?.string()) ?: "$fallbackMessage (${response.code()})"))
    }
} catch (e: Exception) {
    Result.failure(Exception("Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.", e))
}

private fun parseErrorMessage(raw: String?): String? = try {
    val message = JsonParser.parseString(raw ?: "").asJsonObject.get("message")
    when {
        message == null || message.isJsonNull -> null
        message.isJsonArray -> message.asJsonArray.joinToString("\n") { it.asString }
        else -> message.asString
    }
} catch (_: Exception) {
    null
}
