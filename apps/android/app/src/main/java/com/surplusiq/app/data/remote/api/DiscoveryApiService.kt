package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.GET
import retrofit2.http.Path
import retrofit2.http.Query

interface DiscoveryApiService {

    @GET("customer/deals")
    suspend fun findNearbyDeals(
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radiusKm") radiusKm: Double? = null,
        @Query("search") search: String? = null,
        @Query("category") category: String? = null,
        @Query("dietary") dietary: String? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<NearbyDealsResponse>

    @GET("customer/deals/map")
    suspend fun findMapPins(
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radiusKm") radiusKm: Double? = null
    ): Response<List<MapPinDto>>

    @GET("customer/deals/{id}")
    suspend fun getDealDetail(
        @Path("id") id: String
    ): Response<DealDetailDto>
}
