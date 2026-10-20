package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface OrdersApiService {

    @POST("customer/orders")
    suspend fun holdOrder(
        @Body request: CreateOrderRequest,
        @Header("Idempotency-Key") idempotencyKey: String
    ): Response<OrderResponseDto>

    @GET("customer/orders")
    suspend fun getCustomerOrders(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20,
        @Query("status") status: String? = null
    ): Response<List<OrderResponseDto>>

    @GET("customer/orders/active")
    suspend fun getActiveOrders(): Response<List<OrderResponseDto>>

    @GET("customer/orders/{id}")
    suspend fun getOrderById(
        @Path("id") id: String
    ): Response<OrderResponseDto>

    @POST("customer/orders/{id}/cancel")
    suspend fun cancelHold(
        @Path("id") id: String,
        @Body request: CancelOrderRequest? = null
    ): Response<OrderResponseDto>

    @POST("customer/orders/{id}/arriving")
    suspend fun notifyArriving(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @POST("customer/orders/{id}/proxy-code")
    suspend fun createProxyCode(
        @Path("id") id: String
    ): Response<ProxyCodeResponse>

    @GET("customer/orders/{id}/proxy-code")
    suspend fun getProxyCode(
        @Path("id") id: String
    ): Response<ProxyCodeResponse?>

    @DELETE("customer/orders/{id}/proxy-code")
    suspend fun revokeProxyCode(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @GET("customer/orders/{id}/receipt")
    suspend fun getOrderReceipt(
        @Path("id") id: String
    ): Response<OrderReceiptDto>

    @POST("customer/orders/{id}/payment-proof")
    suspend fun attachPaymentProof(
        @Path("id") id: String,
        @Body request: AttachPaymentProofRequest
    ): Response<OrderResponseDto>

    @PATCH("customer/orders/{id}/pickup-slot")
    suspend fun updatePickupSlot(
        @Path("id") id: String,
        @Body request: UpdatePickupSlotRequest
    ): Response<OrderResponseDto>

    @POST("customer/orders/reorder/{oldOrderId}")
    suspend fun reorder(
        @Path("oldOrderId") oldOrderId: String
    ): Response<ReorderResponseDto>
}
