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

/** Giá điểm do máy chủ quyết định theo danh mục, app chỉ gửi mã ưu đãi muốn đổi. */
data class RedeemRewardRequest(
    @SerializedName("redemptionId") val redemptionId: String
)

data class RewardCatalogItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("points") val points: Int,
    @SerializedName("valueVnd") val valueVnd: Int,
    @SerializedName("minOrderVnd") val minOrderVnd: Int,
    @SerializedName("validDays") val validDays: Int,
    @SerializedName("canRedeem") val canRedeem: Boolean,
    @SerializedName("shortfall") val shortfall: Int
)

data class RewardCatalogDto(
    @SerializedName("pointsBalance") val pointsBalance: Int,
    @SerializedName("dailyLimit") val dailyLimit: Int,
    @SerializedName("redeemedToday") val redeemedToday: Int,
    @SerializedName("items") val items: List<RewardCatalogItemDto> = emptyList()
)

data class RewardRuleSectionDto(
    @SerializedName("title") val title: String,
    @SerializedName("body") val body: String
)

data class RewardRulesDto(
    @SerializedName("sections") val sections: List<RewardRuleSectionDto> = emptyList()
)

data class RewardVoucherDto(
    @SerializedName("name") val name: String,
    @SerializedName("expiresAt") val expiresAt: String? = null
)

data class RedeemRewardResponseDto(
    @SerializedName("pointsBalance") val pointsBalance: Int,
    @SerializedName("voucher") val voucher: RewardVoucherDto? = null
)
