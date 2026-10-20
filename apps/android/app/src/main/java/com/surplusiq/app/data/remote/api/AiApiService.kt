package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface AiApiService {

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
}
