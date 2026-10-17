package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CustomerProfileDto(
    @SerializedName("id") val id: String,
    @SerializedName("phone") val phone: String,
    @SerializedName("fullName") val fullName: String,
    @SerializedName("email") val email: String? = null,
    @SerializedName("avatarUrl") val avatarUrl: String? = null,
    @SerializedName("impactStats") val impactStats: ImpactStatsDto? = null
)

data class ImpactStatsDto(
    @SerializedName("foodSavedKg") val foodSavedKg: Double = 0.0,
    @SerializedName("co2AvoidedKg") val co2AvoidedKg: Double = 0.0,
    @SerializedName("moneySavedVnd") val moneySavedVnd: Long = 0L,
    @SerializedName("consecutiveDaysStreak") val consecutiveDaysStreak: Int = 1,
    @SerializedName("rescueBadge") val rescueBadge: String = "Người Cứu Món Tích Cực"
)

data class DietaryProfileDto(
    @SerializedName("dietaryPreferences") val dietaryPreferences: List<String> = emptyList(),
    @SerializedName("allergies") val allergies: List<String> = emptyList()
)

data class UpdateDietaryProfileRequest(
    @SerializedName("dietaryPreferences") val dietaryPreferences: List<String>,
    @SerializedName("allergies") val allergies: List<String>
)

data class FavoriteStoreDto(
    @SerializedName("storeId") val storeId: String,
    @SerializedName("storeName") val storeName: String,
    @SerializedName("storeAddress") val storeAddress: String? = null,
    @SerializedName("logoUrl") val logoUrl: String? = null,
    @SerializedName("activeDealsCount") val activeDealsCount: Int = 0
)
