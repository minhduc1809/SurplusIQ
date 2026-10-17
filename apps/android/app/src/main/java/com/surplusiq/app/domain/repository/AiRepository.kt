package com.surplusiq.app.domain.repository

import com.surplusiq.app.domain.model.Deal

data class AiAssistantResponse(
    val reply: String,
    val recommendedDeals: List<Deal>,
    val remainingQuota: Int
)

interface AiRepository {
    suspend fun chatWithAi(
        message: String,
        contextDealId: String? = null,
        availableDeals: List<Deal> = emptyList()
    ): Result<AiAssistantResponse>

    suspend fun checkAllergies(
        dealId: String,
        allergies: List<String>
    ): Result<Pair<Boolean, String>>
}
