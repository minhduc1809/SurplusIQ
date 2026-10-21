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
                Result.failure(Exception("Trợ lý chưa trả lời được (${response.code()}). Vui lòng thử lại sau."))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Không kết nối được trợ lý. Kiểm tra mạng rồi thử lại.", e))
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
                // Không kết luận "an toàn" khi chưa kiểm tra được: chỉ báo lỗi để khách tự đọc thành phần.
                Result.failure(Exception("Chưa kiểm tra được dị ứng (${response.code()}). Hãy xem mục Thành phần & Dị ứng của món."))
            }
        } catch (e: Exception) {
            Result.failure(Exception("Chưa kiểm tra được dị ứng. Hãy xem mục Thành phần & Dị ứng của món.", e))
        }
    }

    override suspend fun getRemainingQuota(): Result<Int> =
        apiCall("Không thể tải hạn mức hỏi trợ lý", { aiApiService.getQuota() }) { it.remaining }

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
}
