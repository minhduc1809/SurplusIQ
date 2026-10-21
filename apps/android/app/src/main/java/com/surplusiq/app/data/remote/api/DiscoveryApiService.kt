package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
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
        @Query("minDiscountPercent") minDiscountPercent: Int? = null,
        @Query("sortBy") sortBy: String? = null,
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

    @GET("customer/deals/for-you")
    suspend fun getForYou(
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radiusKm") radiusKm: Double? = null,
        @Query("limit") limit: Int? = null
    ): Response<ForYouResponseDto>

    @GET("customer/deals/radar")
    suspend fun getRadarRanking(
        @Query("latitude") latitude: Double? = null,
        @Query("longitude") longitude: Double? = null,
        @Query("radiusKm") radiusKm: Double? = null,
        @Query("budgetMax") budgetMax: Double? = null,
        @Query("travelTimeSource") travelTimeSource: String? = null,
        @Query("limit") limit: Int? = null
    ): Response<RadarResponseDto>

    @GET("customer/deals/{id}/trustpass")
    suspend fun getDealTrustpass(
        @Path("id") id: String
    ): Response<TrustpassDto>

    @POST("customer/baskets/suggest")
    suspend fun suggestBasket(
        @Body request: SuggestBasketRequest
    ): Response<SuggestBasketResponse>

    @GET("customer/stores/{id}")
    suspend fun getStoreDetail(@Path("id") id: String): Response<StoreDetailResponse>

    /** ids: 2-3 offerId cách nhau bởi dấu phẩy (R1-036). */
    @GET("customer/deals/compare")
    suspend fun compareDeals(@Query("ids") ids: String): Response<CompareDealsResponse>

    @POST("customer/deals/{id}/save")
    suspend fun saveDeal(@Path("id") id: String): Response<Map<String, Any>>

    @DELETE("customer/deals/{id}/save")
    suspend fun unsaveDeal(@Path("id") id: String): Response<Map<String, Any>>

    @GET("customer/saved-deals")
    suspend fun getSavedDeals(): Response<List<SavedDealEntryDto>>

    @POST("customer/view-history/{offerId}")
    suspend fun recordViewHistory(@Path("offerId") offerId: String): Response<Map<String, Any>>

    @GET("customer/view-history")
    suspend fun getViewHistory(): Response<List<ViewHistoryDto>>

    @GET("customer/deal-alerts")
    suspend fun getDealAlerts(): Response<List<DealAlertDto>>

    @POST("customer/deal-alerts")
    suspend fun createDealAlert(@Body request: DealAlertRequest): Response<DealAlertDto>

    @PUT("customer/deal-alerts/{id}")
    suspend fun updateDealAlert(@Path("id") id: String, @Body request: DealAlertRequest): Response<DealAlertDto>

    @DELETE("customer/deal-alerts/{id}")
    suspend fun deleteDealAlert(@Path("id") id: String): Response<Map<String, Any>>

    @GET("customer/stores/{id}/reviews")
    suspend fun getStoreReviews(
        @Path("id") storeId: String,
        @Query("rating") rating: Int? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 10
    ): Response<StoreReviewsResponseDto>

    @POST("customer/baskets/substitutes")
    suspend fun getBasketSubstitutes(
        @Body request: BasketSubstitutesRequest
    ): Response<BasketSubstitutesResponse>

    @POST("customer/baskets/checkout")
    suspend fun checkoutBasket(
        @Body request: BasketCheckoutRequest
    ): Response<BasketCheckoutResponse>

    @POST("customer/deals/{id}/back-in-stock")
    suspend fun toggleBackInStock(
        @Path("id") id: String
    ): Response<BackInStockResponseDto>

    @GET("customer/deals/{id}/back-in-stock")
    suspend fun getBackInStockStatus(
        @Path("id") id: String
    ): Response<BackInStockStatusDto>

    @GET("customer/deals/{id}/price-history")
    suspend fun getPriceHistory(
        @Path("id") id: String
    ): Response<PriceHistoryDto>
}

