package com.surplusiq.app.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CustomerAiChatRequest(
    @SerializedName("message") val message: String,
    @SerializedName("contextDealId") val contextDealId: String? = null,
    @SerializedName("conversationId") val conversationId: String? = null
)

data class CustomerAiChatResponse(
    @SerializedName("reply") val reply: String,
    @SerializedName("conversationId") val conversationId: String? = null,
    @SerializedName("recommendedDealIds") val recommendedDealIds: List<String> = emptyList(),
    @SerializedName("remainingQuota") val remainingQuota: Int = 30
)

data class AiMatchedOfferDto(
    @SerializedName("offerId") val offerId: String,
    @SerializedName("title") val title: String,
    @SerializedName("category") val category: String? = null,
    @SerializedName("originalPrice") val originalPrice: Long = 0L,
    @SerializedName("currentPrice") val currentPrice: Long = 0L,
    @SerializedName("discountPercent") val discountPercent: Int = 0,
    @SerializedName("pickupStart") val pickupStart: String? = null,
    @SerializedName("pickupEnd") val pickupEnd: String? = null
)

data class CustomerAiSearchResponse(
    @SerializedName("query") val query: String = "",
    @SerializedName("explanation") val explanation: String = "",
    @SerializedName("matchedOffers") val matchedOffers: List<AiMatchedOfferDto> = emptyList(),
    @SerializedName("logId") val logId: String? = null
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

// --- Lịch sử hội thoại AI & Ghi nhớ ngữ cảnh (K51, R1-091) ---
data class AiConversationDto(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("createdAt") val createdAt: String,
    @SerializedName("updatedAt") val updatedAt: String,
    @SerializedName("messageCount") val messageCount: Int = 0,
    @SerializedName("lastMessage") val lastMessage: AiConversationLastMessageDto? = null
)

data class AiConversationLastMessageDto(
    @SerializedName("content") val content: String,
    @SerializedName("sender") val sender: String,
    @SerializedName("createdAt") val createdAt: String
)

data class AiMessageDto(
    @SerializedName("id") val id: String,
    @SerializedName("sender") val sender: String,
    @SerializedName("content") val content: String,
    @SerializedName("createdAt") val createdAt: String
)

data class AiConversationDetailResponse(
    @SerializedName("conversation") val conversation: AiConversationDto,
    @SerializedName("messages") val messages: List<AiMessageDto> = emptyList()
)

data class AiMemorySettingRequest(
    @SerializedName("rememberContext") val rememberContext: Boolean
)

data class AiMemorySettingResponse(
    @SerializedName("rememberContext") val rememberContext: Boolean
)

