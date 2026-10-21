package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.Deal

data class AiAssistantResponse(
    val reply: String,
    val conversationId: String? = null,
    val recommendedDeals: List<Deal>,
    val remainingQuota: Int?
)

interface AiRepository {
    suspend fun chatWithAi(
        message: String,
        contextDealId: String? = null,
        conversationId: String? = null,
        availableDeals: List<Deal> = emptyList()
    ): Result<AiAssistantResponse>

    /** Số lượt hỏi trợ lý còn lại trong ngày, lấy từ máy chủ. */
    suspend fun getRemainingQuota(): Result<Int>

    suspend fun checkAllergies(
        dealId: String,
        allergies: List<String>
    ): Result<Pair<Boolean, String>>

    suspend fun getConversations(): Result<List<com.surplusiq.app.data.remote.dto.AiConversationDto>>

    suspend fun getConversationMessages(id: String): Result<com.surplusiq.app.data.remote.dto.AiConversationDetailResponse>

    suspend fun deleteConversation(id: String): Result<Unit>

    suspend fun clearAllConversations(): Result<Unit>

    suspend fun getMemorySetting(): Result<Boolean>

    suspend fun updateMemorySetting(rememberContext: Boolean): Result<Boolean>
}

