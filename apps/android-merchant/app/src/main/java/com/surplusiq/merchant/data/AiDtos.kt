package com.surplusiq.merchant.data

// --- Trợ lý AI (store-ai.controller.ts, decisions.controller.ts) ---

data class AiChatRequest(val message: String, val conversationId: String? = null)

data class AiChatResponse(val conversationId: String, val reply: String, val logId: String)

data class AiConversationDto(val id: String, val title: String, val updatedAt: String)

data class AiMessageDto(val id: String, val sender: String, val content: String, val createdAt: String)

data class AiConversationDetail(val id: String, val title: String, val messages: List<AiMessageDto>)

data class AiWeekStats(
    val orders: Int = 0,
    val pickedUp: Int = 0,
    val noShow: Int = 0,
    val cancelled: Int = 0,
    val units: Int = 0,
    val revenue: Long = 0
)

data class AiWeeklySummary(
    val summary: String,
    val foodSavedKg: Double,
    val co2SavedKg: Double,
    val totalRevenue: Long,
    val keyInsights: List<String> = emptyList(),
    val current: AiWeekStats = AiWeekStats(),
    val previous: AiWeekStats = AiWeekStats(),
    val logId: String? = null
)

data class AiFeedbackRequest(val logId: String, val rating: String)

data class AnomalyDto(
    val id: String,
    val metric: String,
    val date: String,
    val actualValue: Double,
    val expectedValue: Double,
    val direction: String,
    val severity: String,
    val explanation: String
)

data class AnomaliesResponse(
    val isEligible: Boolean,
    val totalHistoryDays: Int = 0,
    val reason: String? = null,
    val anomalies: List<AnomalyDto> = emptyList()
)

/** status: PENDING | ACCEPTED | REJECTED | EXPIRED. */
data class ActionCardDto(
    val id: String,
    val actionType: String,
    val reasonText: String,
    val expectedOutcome: String? = null,
    val status: String,
    val expiresAt: String? = null,
    val resultEvaluation: com.google.gson.JsonElement? = null
)

/** defaultTone: FRIENDLY | FORMAL | APOLOGETIC. */
data class AiConfigDto(
    val chat: Boolean,
    val weeklySummary: Boolean,
    val drafts: Boolean,
    val managerCanUse: Boolean,
    val defaultTone: String
)

data class AnomalyFactor(val type: String, val label: String, val actual: Double, val average: Double, val delta: Double)

data class AnomalyWhyResponse(val date: String, val factors: List<AnomalyFactor> = emptyList(), val note: String? = null)

data class AiLogDto(
    val id: String,
    val featureCode: String,
    val model: String,
    val latencyMs: Int = 0,
    val inputSummary: String = "",
    val outputSummary: String = "",
    val errorCode: String? = null,
    val createdAt: String
)

data class AiLogsResponse(val items: List<AiLogDto>, val total: Int, val page: Int, val totalPages: Int)
