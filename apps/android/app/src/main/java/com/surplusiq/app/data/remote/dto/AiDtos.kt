package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CustomerAiChatRequest(
    @SerializedName("message") val message: String,
    @SerializedName("contextDealId") val contextDealId: String? = null
)

data class CustomerAiChatResponse(
    @SerializedName("reply") val reply: String,
    @SerializedName("recommendedDealIds") val recommendedDealIds: List<String> = emptyList(),
    @SerializedName("remainingQuota") val remainingQuota: Int = 30
)

data class CustomerAiSearchRequest(
    @SerializedName("query") val query: String,
    @SerializedName("latitude") val latitude: Double? = null,
    @SerializedName("longitude") val longitude: Double? = null,
    @SerializedName("maxBudget") val maxBudget: Double? = null
)

data class CustomerAllergyCheckRequest(
    @SerializedName("dealId") val dealId: String,
    @SerializedName("customerAllergies") val customerAllergies: List<String>
)

data class CustomerAllergyCheckResponse(
    @SerializedName("isSafe") val isSafe: Boolean,
    @SerializedName("riskLevel") val riskLevel: String,
    @SerializedName("matchedAllergens") val matchedAllergens: List<String> = emptyList(),
    @SerializedName("explanation") val explanation: String
)
