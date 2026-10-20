package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Rescue Pool (CM-C02). Đăng ký nhu cầu không phải đơn hàng - chỉ confirm-offer trả về đơn thật. */
data class RescuePoolDto(
    @SerializedName("id") val id: String,
    @SerializedName("storeName") val storeName: String? = null,
    @SerializedName("poolTitle") val poolTitle: String? = null,
    @SerializedName("targetCategory") val targetCategory: String? = null,
    @SerializedName("serviceArea") val serviceArea: String? = null,
    @SerializedName("registrationOpenAt") val registrationOpenAt: String? = null,
    @SerializedName("registrationCloseAt") val registrationCloseAt: String? = null,
    @SerializedName("confirmDeadlineAt") val confirmDeadlineAt: String? = null,
    @SerializedName("minimumDemand") val minimumDemand: Int = 0,
    @SerializedName("maximumSupply") val maximumSupply: Int = 0,
    @SerializedName("targetBudgetMin") val targetBudgetMin: Int? = null,
    @SerializedName("targetBudgetMax") val targetBudgetMax: Int? = null,
    @SerializedName("pickupWindowStart") val pickupWindowStart: String? = null,
    @SerializedName("pickupWindowEnd") val pickupWindowEnd: String? = null,
    @SerializedName("endCondition") val endCondition: String? = null,
    @SerializedName("poolStatus") val poolStatus: String? = null,
    @SerializedName("cancellationReason") val cancellationReason: String? = null,
    @SerializedName("expectedQuantity") val expectedQuantity: Int = 0,
    @SerializedName("canRegister") val canRegister: Boolean = false,
    @SerializedName("offer") val offer: PoolOfferDto? = null,
    @SerializedName("myRegistration") val myRegistration: PoolRegistrationDto? = null
)

data class PoolOfferDto(
    @SerializedName("offerVersion") val offerVersion: Int = 0,
    @SerializedName("proposedPrice") val proposedPrice: Int? = null,
    @SerializedName("offeredQuantity") val offeredQuantity: Int? = null,
    @SerializedName("remainingQuantity") val remainingQuantity: Int? = null,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null,
    @SerializedName("offerExpiryAt") val offerExpiryAt: String? = null,
    @SerializedName("canConfirm") val canConfirm: Boolean = false
)

data class PoolRegistrationDto(
    @SerializedName("id") val id: String,
    @SerializedName("registrationStatus") val registrationStatus: String? = null,
    @SerializedName("requestedQuantity") val requestedQuantity: Int = 0,
    @SerializedName("budgetMin") val budgetMin: Int? = null,
    @SerializedName("budgetMax") val budgetMax: Int? = null,
    @SerializedName("preferredPickupStart") val preferredPickupStart: String? = null,
    @SerializedName("preferredPickupEnd") val preferredPickupEnd: String? = null,
    @SerializedName("linkedOrderId") val linkedOrderId: String? = null
)

data class RegisterDemandRequest(
    @SerializedName("requestedQuantity") val requestedQuantity: Int,
    @SerializedName("budgetMax") val budgetMax: Int? = null,
    @SerializedName("preferredPickupStart") val preferredPickupStart: String? = null,
    @SerializedName("preferredPickupEnd") val preferredPickupEnd: String? = null
)

data class WithdrawDemandRequest(
    @SerializedName("reason") val reason: String
)

data class ConfirmPoolOfferRequest(
    @SerializedName("offerVersion") val offerVersion: Int
)

data class ConfirmPoolOfferResponseDto(
    @SerializedName("idempotent") val idempotent: Boolean = false,
    @SerializedName("order") val order: PoolOrderDto? = null,
    @SerializedName("message") val message: String? = null
)

data class PoolOrderDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String? = null,
    @SerializedName("status") val status: String? = null
)
