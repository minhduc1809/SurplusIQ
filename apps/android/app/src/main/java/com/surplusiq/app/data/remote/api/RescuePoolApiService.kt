package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.ConfirmPoolOfferRequest
import com.surplusiq.app.data.remote.dto.ConfirmPoolOfferResponseDto
import com.surplusiq.app.data.remote.dto.RegisterDemandRequest
import com.surplusiq.app.data.remote.dto.RescuePoolDto
import com.surplusiq.app.data.remote.dto.WithdrawDemandRequest
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.HTTP
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface RescuePoolApiService {

    @GET("customer/rescue-pools")
    suspend fun listPools(
        @Query("serviceArea") serviceArea: String? = null
    ): Response<List<RescuePoolDto>>

    @GET("customer/rescue-pools/{id}")
    suspend fun getPool(@Path("id") poolId: String): Response<RescuePoolDto>

    @POST("customer/rescue-pools/{id}/register")
    suspend fun register(
        @Path("id") poolId: String,
        @Body request: RegisterDemandRequest
    ): Response<RescuePoolDto>

    @PATCH("customer/rescue-pools/{id}/registration")
    suspend fun updateRegistration(
        @Path("id") poolId: String,
        @Body request: RegisterDemandRequest
    ): Response<RescuePoolDto>

    @HTTP(method = "DELETE", path = "customer/rescue-pools/{id}/registration", hasBody = true)
    suspend fun withdraw(
        @Path("id") poolId: String,
        @Body request: WithdrawDemandRequest
    ): Response<RescuePoolDto>

    @POST("customer/rescue-pools/{id}/confirm-offer")
    suspend fun confirmOffer(
        @Path("id") poolId: String,
        @Body request: ConfirmPoolOfferRequest
    ): Response<ConfirmPoolOfferResponseDto>
}
