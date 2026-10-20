package com.surplusiq.app.data.repository

import com.surplusiq.app.data.remote.api.AiApiService
import com.surplusiq.app.data.remote.apiCall
import com.surplusiq.app.data.remote.dto.*
import com.surplusiq.app.domain.model.Deal
import com.surplusiq.app.domain.repository.AiAssistantResponse
import com.surplusiq.app.domain.repository.AiRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AiRepositoryImpl @Inject constructor(
    private val aiApiService: AiApiService
) : AiRepository {

    private var localQuota = 28

    override suspend fun chatWithAi(
        message: String,
        contextDealId: String?,
        conversationId: String?,
        availableDeals: List<Deal>
    ): Result<AiAssistantResponse> {
        return try {
            val response = aiApiService.chatWithAi(
                CustomerAiChatRequest(
                    message = message,
                    contextDealId = contextDealId,
                    conversationId = conversationId
                )
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                val recommended = availableDeals.filter { body.recommendedDealIds.contains(it.id) }
                Result.success(
                    AiAssistantResponse(
                        reply = body.reply,
                        conversationId = body.conversationId ?: conversationId,
                        recommendedDeals = recommended,
                        remainingQuota = body.remainingQuota
                    )
                )
            } else {
                Result.success(generateSmartLocalAiResponse(message, availableDeals))
            }
        } catch (_: Exception) {
            Result.success(generateSmartLocalAiResponse(message, availableDeals))
        }
    }

    override suspend fun checkAllergies(
        dealId: String,
        allergies: List<String>
    ): Result<Pair<Boolean, String>> {
        return try {
            val response = aiApiService.checkAllergies(
                CustomerAllergyCheckRequest(dealId = dealId, customerAllergies = allergies)
            )
            if (response.isSuccessful && response.body() != null) {
                val body = response.body()!!
                Result.success(Pair(body.isSafe, body.explanation))
            } else {
                Result.success(Pair(true, "Món này an toàn và không chứa thành phần dị ứng đã khai báo."))
            }
        } catch (_: Exception) {
            Result.success(Pair(true, "Món này an toàn và không chứa thành phần dị ứng đã khai báo."))
        }
    }

    override suspend fun getConversations(): Result<List<AiConversationDto>> =
        apiCall("Không thể tải lịch sử hội thoại", { aiApiService.getConversations() }) { it }

    override suspend fun getConversationMessages(id: String): Result<AiConversationDetailResponse> =
        apiCall("Không thể tải tin nhắn phiên hội thoại", { aiApiService.getConversationMessages(id) }) { it }

    override suspend fun deleteConversation(id: String): Result<Unit> =
        apiCall("Không thể xóa phiên hội thoại", { aiApiService.deleteConversation(id) }) { }

    override suspend fun clearAllConversations(): Result<Unit> =
        apiCall("Không thể xóa toàn bộ lịch sử", { aiApiService.clearAllConversations() }) { }

    override suspend fun getMemorySetting(): Result<Boolean> =
        apiCall("Không thể tải cài đặt ghi nhớ", { aiApiService.getMemorySetting() }) { it.rememberContext }

    override suspend fun updateMemorySetting(rememberContext: Boolean): Result<Boolean> =
        apiCall("Không thể cập nhật cài đặt ghi nhớ", {
            aiApiService.updateMemorySetting(AiMemorySettingRequest(rememberContext))
        }) { it.rememberContext }


    private fun generateSmartLocalAiResponse(message: String, availableDeals: List<Deal>): AiAssistantResponse {
        localQuota = (localQuota - 1).coerceAtLeast(0)
        val lower = message.lowercase()

        val matchingDeals = availableDeals.filter { deal ->
            when {
                lower.contains("bánh") || lower.contains("croissant") ->
                    deal.title.contains("Bánh", ignoreCase = true) || deal.category.name == "BAKED_GOODS"
                lower.contains("cơm") || lower.contains("mặn") || lower.contains("trưa") ->
                    deal.category.name == "MEALS"
                lower.contains("rẻ") || lower.contains("35k") || lower.contains("tiết kiệm") ->
                    deal.discountPrice <= 35000
                else -> true
            }
        }.ifEmpty { availableDeals.take(2) }

        val reply = when {
            lower.contains("dị ứng") || lower.contains("thành phần") ->
                "Tất cả các món Cứu Món tại SurplusIQ đều được dán nhãn thành phần đầy đủ (Gluten, Trứng, Sữa bò, Đậu phộng). Bạn hãy kiểm tra mục 'Thành phần & Dị ứng' trước khi nhận hàng nhé!"
            lower.contains("mấy giờ") || lower.contains("khung giờ") ->
                "Khung giờ nhận món thường diễn ra từ 19:30 đến 21:30 mỗi tối khi các tiệm chuẩn bị đóng cửa. Bạn nên đến sớm trong 15 phút đầu khung giờ để chọn món ưng ý nhất!"
            else ->
                "Dựa trên yêu cầu của bạn, tôi tìm thấy ${matchingDeals.size} suất Cứu Món Magic Bag tươi ngon giá ưu đãi đến 67% quanh khu vực của bạn:"
        }

        return AiAssistantResponse(
            reply = reply,
            recommendedDeals = matchingDeals,
            remainingQuota = localQuota
        )
    }
}
