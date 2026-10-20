package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CreatePaymentRequest(
    @SerializedName("method") val method: String = "SIMULATED"
)

/** Khớp PaymentsService.createPayment response thật từ backend (VietQR + cú pháp chuyển khoản). */
data class PaymentTransactionDto(
    @SerializedName("transactionId") val transactionId: String,
    @SerializedName("gatewayTxnId") val gatewayTxnId: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("amount") val amount: Double,
    @SerializedName("transferSyntax") val transferSyntax: String,
    @SerializedName("bankAccount") val bankAccount: String,
    @SerializedName("bankBin") val bankBin: String,
    @SerializedName("bankName") val bankName: String,
    @SerializedName("qrUrl") val qrUrl: String,
    @SerializedName("holdExpiresAt") val holdExpiresAt: String,
    @SerializedName("status") val status: String
)

data class PaymentRecheckResponseDto(
    @SerializedName("orderId") val orderId: String,
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("orderStatus") val orderStatus: String,
    @SerializedName("paymentStatus") val paymentStatus: String,
    @SerializedName("lastCheckedAt") val lastCheckedAt: String,
    @SerializedName("retryCount") val retryCount: Int,
    @SerializedName("message") val message: String
)
