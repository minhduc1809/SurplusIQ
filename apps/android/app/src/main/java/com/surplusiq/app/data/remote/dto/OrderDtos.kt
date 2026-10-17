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

data class OrderResponseDto(
    @SerializedName("id") val id: String,
    @SerializedName("code") val code: String,
    @SerializedName("customerId") val customerId: String,
    @SerializedName("storeId") val storeId: String,
    @SerializedName("offerId") val offerId: String,
    @SerializedName("storeName") val storeName: String? = null,
    @SerializedName("itemName") val itemName: String? = null,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("unitPrice") val unitPrice: Double,
    @SerializedName("discountAmount") val discountAmount: Double = 0.0,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("status") val status: String,
    @SerializedName("holdExpiresAt") val holdExpiresAt: String? = null,
    @SerializedName("pickupSlot") val pickupSlot: String? = null,
    @SerializedName("note") val note: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)
