package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.CreatePaymentRequest
import com.surplusiq.app.data.remote.dto.PaymentRecheckResponseDto
import com.surplusiq.app.data.remote.dto.PaymentTransactionDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path

/** Thanh toán VietQR/giả lập cho đơn hàng (R1-041, R1-055, R1-056). */
interface PaymentsApiService {

    @POST("customer/orders/{orderId}/payments")
    suspend fun createPayment(
        @Path("orderId") orderId: String,
        @Body request: CreatePaymentRequest,
        @Header("Idempotency-Key") idempotencyKey: String
    ): Response<PaymentTransactionDto>

    @POST("customer/orders/{orderId}/payments/recheck")
    suspend fun recheckPayment(
        @Path("orderId") orderId: String
    ): Response<PaymentRecheckResponseDto>

    @GET("customer/orders/{orderId}/payments")
    suspend fun getPaymentStatus(
        @Path("orderId") orderId: String
    ): Response<PaymentTransactionDto>
}
