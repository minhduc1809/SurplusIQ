package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/** Hỗ trợ đơn hàng: theo dõi (KX12), sự cố (KX03), trò chuyện (KX11), đổi suất (KX05), tặng suất (KX18). */
interface OrderSupportApiService {
    @GET("customer/orders/{id}/tracking")
    suspend fun tracking(@Path("id") orderId: String): Response<OrderTrackingDto>

    @GET("customer/orders/{id}/incidents")
    suspend fun incidents(@Path("id") orderId: String): Response<List<IncidentDto>>

    @POST("customer/orders/{id}/incidents")
    suspend fun createIncident(@Path("id") orderId: String, @Body body: CreateIncidentRequest): Response<IncidentDto>

    @GET("customer/orders/{id}/messages")
    suspend fun messages(@Path("id") orderId: String, @Query("since") since: String? = null): Response<ChatThreadDto>

    @POST("customer/orders/{id}/messages")
    suspend fun sendMessage(@Path("id") orderId: String, @Body body: SendMessageRequest): Response<ChatMessageDto>

    @GET("customer/orders/{id}/swap-options")
    suspend fun swapOptions(@Path("id") orderId: String): Response<SwapOptionsDto>

    @POST("customer/orders/{id}/swap")
    suspend fun swap(@Path("id") orderId: String, @Body body: SwapRequest): Response<Map<String, Any>>

    @POST("customer/orders/{id}/gift")
    suspend fun gift(@Path("id") orderId: String, @Body body: CreateGiftRequest): Response<GiftDto>

    @GET("customer/gifts")
    suspend fun gifts(): Response<GiftsDto>

    @POST("customer/gifts/{id}/accept")
    suspend fun acceptGift(@Path("id") id: String): Response<GiftDto>

    @POST("customer/gifts/{id}/decline")
    suspend fun declineGift(@Path("id") id: String): Response<GiftDto>

    @POST("customer/gifts/{id}/cancel")
    suspend fun cancelGift(@Path("id") id: String): Response<GiftDto>
}
