package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class PickupPassDto(
    @SerializedName("orderId") val orderId: String,
    @SerializedName("orderCode") val orderCode: String,
    @SerializedName("status") val status: String,
    @SerializedName("pickupToken") val pickupToken: String,
    @SerializedName("backupCode") val backupCode: String,
    @SerializedName("expiresAt") val expiresAt: String,
    @SerializedName("itemName") val itemName: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("totalAmount") val totalAmount: Double,
    @SerializedName("note") val note: String? = null
)
