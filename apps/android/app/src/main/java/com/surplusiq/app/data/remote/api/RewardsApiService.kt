package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.RedeemRewardRequest
import com.surplusiq.app.data.remote.dto.RewardBalanceDto
import com.surplusiq.app.data.remote.dto.RewardLedgerEntryDto
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST

interface RewardsApiService {

    @GET("customer/rewards/balance")
    suspend fun getBalance(): Response<RewardBalanceDto>

    @GET("customer/rewards/history")
    suspend fun getHistory(): Response<List<RewardLedgerEntryDto>>

    @POST("customer/rewards/redeem")
    suspend fun redeem(
        @Body request: RedeemRewardRequest
    ): Response<RewardBalanceDto>
}
