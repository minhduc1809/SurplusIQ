package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AiApiService {

    @GET("customer/ai/quota")
    suspend fun getQuota(): Response<AiQuotaDto>

    @POST("customer/ai/chat")
    suspend fun chatWithAi(
        @Body request: CustomerAiChatRequest
    ): Response<CustomerAiChatResponse>

    @POST("customer/ai/search")
    suspend fun searchDealsWithAi(
        @Body request: CustomerAiSearchRequest
    ): Response<CustomerAiSearchResponse>

    @POST("customer/ai/allergy-check")
    suspend fun checkAllergies(
        @Body request: CustomerAllergyCheckRequest
    ): Response<CustomerAllergyCheckResponse>

    @GET("customer/ai/conversations")
    suspend fun getConversations(): Response<List<AiConversationDto>>

    @GET("customer/ai/conversations/{id}/messages")
    suspend fun getConversationMessages(
        @Path("id") id: String
    ): Response<AiConversationDetailResponse>

    @DELETE("customer/ai/conversations/{id}")
    suspend fun deleteConversation(
        @Path("id") id: String
    ): Response<Map<String, Any>>

    @DELETE("customer/ai/conversations")
    suspend fun clearAllConversations(): Response<Map<String, Any>>

    @GET("customer/ai/memory-setting")
    suspend fun getMemorySetting(): Response<AiMemorySettingResponse>

    @PUT("customer/ai/memory-setting")
    suspend fun updateMemorySetting(
        @Body request: AiMemorySettingRequest
    ): Response<AiMemorySettingResponse>
}

