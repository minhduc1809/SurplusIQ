package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ProfileApiService {

    @GET("customer/profile")
    suspend fun getProfile(): Response<CustomerProfileDto>

    @GET("customer/dietary-profile")
    suspend fun getDietaryProfile(): Response<DietaryProfileDto>

    @PUT("customer/dietary-profile")
    suspend fun updateDietaryProfile(
        @Body request: UpdateDietaryProfileRequest
    ): Response<DietaryProfileDto>

    @GET("customer/favorites")
    suspend fun getFavorites(): Response<List<FavoriteStoreDto>>

    @POST("customer/favorites/{storeId}")
    suspend fun addFavorite(
        @Path("storeId") storeId: String
    ): Response<Map<String, Any>>

    @DELETE("customer/favorites/{storeId}")
    suspend fun removeFavorite(
        @Path("storeId") storeId: String
    ): Response<Map<String, Any>>
}
