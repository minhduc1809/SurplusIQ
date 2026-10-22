package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CreateOrderRequest(
    @SerializedName("offerId") val offerId: String,
    @SerializedName("quantity") val quantity: Int = 1,
    @SerializedName("pickupSlot") val pickupSlot: String? = null,
    @SerializedName("promotionId") val promotionId: String? = null,
    @SerializedName("note") val note: String? = null
)

data class CancelOrderRequest(
    @SerializedName("reason") val reason: String? = null
)

data class ProxyCodeResponse(
    @SerializedName("id") val id: String,
    @SerializedName("orderId") val orderId: String,
    @SerializedName("code") val code: String,
    @SerializedName("status") val status: String,
    @SerializedName("expiresAt") val expiresAt: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class OrderResponseDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("customerId") val customerId: String,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("offerId") val offerId: String,
    @SerializedName("storeName") val storeName: String? = null,
    @SerializedName("itemName") val itemName: String? = null,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("storeLogoUrl") val storeLogoUrl: String? = null,
    @SerializedName("storePhone") val storePhone: String? = null,
    @SerializedName("imageUrl") val imageUrl: String? = null,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("discountAmount") val discountAmount: Double = 0.0,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("holdExpiresAt") val holdExpiresAt: String? = null,
    @SerializedName("pickupSlot") val pickupSlot: String? = null,
    @SerializedName("paymentProofUrl") val paymentProofUrl: String? = null,
    @SerializedName("paymentProofUploadedAt") val paymentProofUploadedAt: String? = null,
    @SerializedName("note") val note: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null,
    @SerializedName("offer") val offer: OrderOfferBriefDto? = null
)

/** Offer gốc kèm theo GET customer/orders/:id - chỉ lấy mốc giờ nhận để tính hạn hủy (R1-043). */
data class OrderOfferBriefDto(
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null
)

/** Khớp OrdersService.getOrderReceipt (R1-054) - backend trả JSON, không có PDF. */
data class OrderReceiptDto(
    @SerializedName("orderId") val orderId: String,
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("status") val status: String,
    @SerializedName("itemName") val itemName: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("discountAmount") val discountAmount: Double = 0.0,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("paidAt") val paidAt: String? = null,
    @SerializedName("transactionCode") val transactionCode: String? = null,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String = "",
    @SerializedName("createdAt") val createdAt: String? = null
)

/** Khớp OrdersService.reorderShortcut (R1-051): một suất OPEN cùng món, 400 nếu không có. */
data class ReorderResponseDto(
    @SerializedName("message") val message: String? = null,
    @SerializedName("offerId") val offerId: String,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("currentPrice") val currentPrice: Double,
    @SerializedName("originalPrice") val originalPrice: Double,
    @SerializedName("remainingQuantity") val remainingQuantity: Int,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null
)

/** KX02: Đính kèm ảnh biên lai chuyển khoản */
data class AttachPaymentProofRequest(
    @SerializedName("proofUrl") val proofUrl: String
)

/** KX04: Cập nhật giờ hẹn nhận hàng */
data class UpdatePickupSlotRequest(
    @SerializedName("pickupSlot") val pickupSlot: String
)
