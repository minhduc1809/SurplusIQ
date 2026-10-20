package com.surplusiq.app.data.remote.api

import com.surplusiq.app.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ProfileApiService {

    @GET("customer/profile")
    suspend fun getProfile(): Response<CustomerProfileDto>

    @PUT("customer/profile")
    suspend fun updateProfile(
        @Body request: UpdateCustomerProfileRequest
    ): Response<CustomerProfileDto>

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

    @GET("customer/saved-places")
    suspend fun getSavedPlaces(): Response<List<SavedPlaceDto>>

    @POST("customer/saved-places")
    suspend fun createSavedPlace(@Body request: CreateSavedPlaceRequest): Response<SavedPlaceDto>

    @DELETE("customer/saved-places/{id}")
    suspend fun deleteSavedPlace(@Path("id") id: String): Response<Map<String, Any>>

    @GET("customer/consents")
    suspend fun getConsents(): Response<List<ConsentDto>>

    @POST("customer/consents")
    suspend fun recordConsent(
        @Body request: RecordConsentRequest
    ): Response<ConsentDto>

    @POST("customer/delete-request")
    suspend fun requestAccountDelete(): Response<AccountDeleteResponse>

    @DELETE("customer/delete-request")
    suspend fun cancelAccountDelete(): Response<AccountDeleteResponse>

    @POST("customer/data-export")
    suspend fun exportUserData(): Response<DataExportResponse>

    @GET("customer/transactions")
    suspend fun getTransactions(): Response<List<PaymentTransactionRecordDto>>

    @GET("customer/order-lock")
    suspend fun getOrderLockStatus(): Response<OrderLockStatusDto>

    @GET("customer/promotions/wallet")
    suspend fun getPromotionWallet(): Response<List<PromotionWalletItemDto>>

    @POST("customer/promotions/{id}/claim")
    suspend fun claimPromotion(
        @Path("id") promotionId: String
    ): Response<Map<String, Any>>

    @GET("customer/refund-bank-account")
    suspend fun getRefundBankAccount(): Response<RefundBankAccountDto?>

    @PUT("customer/refund-bank-account")
    suspend fun updateRefundBankAccount(
        @Body body: RefundBankAccountDto
    ): Response<RefundBankAccountDto>
}
