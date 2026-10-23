package com.surplusiq.app.domain.model

/** Rescue Pool (CM-C02) - mô hình hiển thị. Thời gian giữ dạng chuỗi ISO 8601 từ server. */
data class RescuePool(
    val id: String,
    val storeName: String,
    val imageUrl: String?,
    val title: String,
    val targetCategory: String,
    val serviceArea: String,
    val registrationOpenAt: String?,
    val registrationCloseAt: String?,
    val confirmDeadlineAt: String?,
    val minimumDemand: Int,
    val maximumSupply: Int,
    val targetBudgetMin: Int?,
    val targetBudgetMax: Int?,
    val pickupWindowStart: String?,
    val pickupWindowEnd: String?,
    val endCondition: String,
    val status: String,
    val cancellationReason: String?,
    val expectedQuantity: Int,
    val canRegister: Boolean,
    val offer: RescuePoolOffer?,
    val myRegistration: RescuePoolRegistration?
)

data class RescuePoolOffer(
    val offerVersion: Int,
    val proposedPrice: Int?,
    val offeredQuantity: Int?,
    val remainingQuantity: Int?,
    val pickupStart: String?,
    val pickupEnd: String?,
    val offerExpiryAt: String?,
    val canConfirm: Boolean
)

data class RescuePoolRegistration(
    val id: String,
    /** ACTIVE = đã đăng ký nhu cầu (chưa mua) | ORDERED = đã đặt hàng thật | WITHDRAWN | CLOSED */
    val status: String,
    val requestedQuantity: Int,
    val budgetMax: Int?,
    val preferredPickupStart: String?,
    val linkedOrderId: String?
)

data class RescuePoolOrderResult(
    val orderId: String,
    val orderCode: String?,
    val message: String
)
