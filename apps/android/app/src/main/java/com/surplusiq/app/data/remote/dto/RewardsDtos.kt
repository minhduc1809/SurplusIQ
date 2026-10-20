package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

/** Rescue Rewards (CM-C04) */
data class RewardBalanceDto(
    @SerializedName("customerId") val customerId: String? = null,
    @SerializedName("pointsBalance") val pointsBalance: Int,
    @SerializedName("updatedAt") val updatedAt: String? = null
)

data class RewardLedgerEntryDto(
    @SerializedName("id") val id: String,
    @SerializedName("entryType") val entryType: String,
    @SerializedName("pointsDelta") val pointsDelta: Int,
    @SerializedName("reason") val reason: String? = null,
    @SerializedName("createdAt") val createdAt: String? = null
)

data class RedeemRewardRequest(
    @SerializedName("points") val points: Int,
    @SerializedName("redemptionId") val redemptionId: String
)
