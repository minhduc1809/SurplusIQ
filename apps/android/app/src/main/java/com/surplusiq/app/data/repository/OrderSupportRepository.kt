package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.OrderSupportApiService
import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import javax.inject.Inject
import javax.inject.Singleton

/** Lỗi trả nguyên văn từ máy chủ (không đủ điều kiện, hết hạn...) để khách biết vì sao thao tác không được. */
@Singleton
class OrderSupportRepository @Inject constructor(private val api: OrderSupportApiService) {

    private suspend fun <T> call(fallback: String, block: suspend () -> Response<T>): Result<T> = try {
        val response = block()
        val body = response.body()
        if (response.isSuccessful && body != null) Result.success(body)
        else Result.failure(Exception(serverMessage(response.errorBody()?.string()) ?: "$fallback (${response.code()})"))
    } catch (e: Exception) {
        Result.failure(Exception("Không kết nối được. Kiểm tra mạng rồi thử lại."))
    }

    private fun serverMessage(raw: String?): String? = runCatching {
        val json = org.json.JSONObject(raw.orEmpty())
        val msg = json.opt("message")
        if (msg is org.json.JSONArray) (0 until msg.length()).joinToString("\n") { msg.getString(it) } else msg?.toString()
    }.getOrNull()?.takeIf { it.isNotBlank() }

    suspend fun tracking(orderId: String) = call("Không tải được tiến trình đơn") { api.tracking(orderId) }
    suspend fun incidents(orderId: String) = call("Không tải được danh sách sự cố") { api.incidents(orderId) }
    suspend fun createIncident(orderId: String, type: String, note: String?) =
        call("Không gửi được báo sự cố") { api.createIncident(orderId, CreateIncidentRequest(type, note?.takeIf { it.isNotBlank() })) }
    suspend fun messages(orderId: String) = call("Không tải được tin nhắn") { api.messages(orderId) }
    suspend fun sendMessage(orderId: String, body: String) = call("Không gửi được tin nhắn") { api.sendMessage(orderId, SendMessageRequest(body)) }
    suspend fun swapOptions(orderId: String) = call("Không tải được các suất có thể đổi") { api.swapOptions(orderId) }
    suspend fun swap(orderId: String, offerId: String) = call("Không đổi được suất") { api.swap(orderId, SwapRequest(offerId)) }
    suspend fun gift(orderId: String, recipient: String, message: String?) =
        call("Không gửi được lời tặng") { api.gift(orderId, CreateGiftRequest(recipient.trim(), message?.takeIf { it.isNotBlank() })) }
    suspend fun gifts() = call("Không tải được danh sách quà tặng") { api.gifts() }
    suspend fun respondGift(id: String, action: String) = call("Không xử lý được lời tặng") {
        when (action) {
            "ACCEPT" -> api.acceptGift(id)
            "DECLINE" -> api.declineGift(id)
            else -> api.cancelGift(id)
        }
    }
}
