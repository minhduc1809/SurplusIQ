package com.surplusiq.merchant.data

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.PATCH
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Url

interface StoreApiService {
    @POST("auth/store/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/store/register")
    suspend fun registerStore(@Body request: StoreRegisterRequest): Response<StoreRegisterResponse>

    @POST("auth/store/verify-email")
    suspend fun verifyStoreEmail(@Body request: VerifyOtpRequest): Response<MessageResponse>

    // Endpoint nằm dưới /customer nhưng logic không phân kênh (target + purpose).
    @POST("auth/customer/resend-otp")
    suspend fun resendOtp(@Body request: ResendOtpRequest): Response<MessageResponse>

    @POST("auth/password/forgot")
    suspend fun forgotPassword(@Body request: ForgotPasswordRequest): Response<MessageResponse>

    @POST("auth/password/reset")
    suspend fun resetPassword(@Body request: ResetPasswordRequest): Response<MessageResponse>

    // Backend đọc user từ header x-user-id, không từ JWT.
    @POST("auth/password/change")
    suspend fun changePassword(
        @Header("x-user-id") userId: String,
        @Body request: ChangePasswordRequest
    ): Response<MessageResponse>

    @POST("store/staff/accept-invite")
    suspend fun acceptInvite(@Body request: AcceptInviteRequest): Response<AcceptInviteResponse>

    @GET("store/daily-overview")
    suspend fun getDailyOverview(): Response<DailyOverviewDto>

    @GET("store/reports/overview")
    suspend fun getReportsOverview(@Query("startDate") startDate: String, @Query("endDate") endDate: String): Response<ReportsOverviewDto>

    @GET("store/rescue-timeline")
    suspend fun getRescueTimeline(): Response<RescueTimelineResponse>

    @POST("store/rescue-timeline/refresh")
    suspend fun refreshRescueTimeline(): Response<okhttp3.ResponseBody>

    @GET("store/rescue-timeline/{lotId}")
    suspend fun getRescueLot(@Path("lotId") lotId: String): Response<RescueLotDetail>

    @POST("store/rescue-timeline/{lotId}/action")
    suspend fun rescueLotAction(@Path("lotId") lotId: String, @Header("Idempotency-Key") key: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<RescueActionResult>

    /** Gọi tiếp đường dẫn mà backend trả trong `next.path` (VD hành động Rescue Timeline). */
    @GET
    suspend fun getRaw(@Url path: String): Response<com.google.gson.JsonObject>

    @POST
    suspend fun postRaw(@Url path: String): Response<com.google.gson.JsonObject>

    @GET("store/rescue-pools")
    suspend fun getRescuePools(): Response<List<RescuePool>>

    @POST("store/rescue-pools")
    suspend fun createRescuePool(@Body body: Map<String, @JvmSuppressWildcards Any>): Response<RescuePool>

    @GET("store/rescue-pools/{id}")
    suspend fun getRescuePool(@Path("id") id: String): Response<RescuePoolDetail>

    @GET("store/rescue-pools/{id}/report")
    suspend fun getRescuePoolReport(@Path("id") id: String): Response<RescuePoolReport>

    @PATCH("store/rescue-pools/{id}/open")
    suspend fun openRescuePool(@Path("id") id: String): Response<okhttp3.ResponseBody>

    @POST("store/rescue-pools/{id}/close-registration")
    suspend fun closePoolRegistration(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-pools/{id}/close")
    suspend fun closeRescuePool(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @PATCH("store/rescue-pools/{id}/supply-offer")
    suspend fun supplyPoolOffer(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<okhttp3.ResponseBody>

    @GET("store/rescue-bridge/transfers")
    suspend fun getBridgeTransfers(): Response<List<BridgeTransfer>>

    @GET("store/rescue-bridge/eligible-offers")
    suspend fun getBridgeEligibleOffers(): Response<List<BridgeEligibleOffer>>

    @POST("store/rescue-bridge/transfers")
    suspend fun createBridgeTransfer(@Header("Idempotency-Key") key: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<BridgeTransfer>

    @GET("store/rescue-bridge/transfers/{id}")
    suspend fun getBridgeTransfer(@Path("id") id: String): Response<BridgeTransferDetail>

    @GET("store/rescue-bridge/transfers/{id}/matches")
    suspend fun getBridgeMatches(@Path("id") id: String): Response<BridgeMatches>

    @POST("store/rescue-bridge/transfers/{id}/send")
    suspend fun sendBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<BridgeResponseLink>

    @POST("store/rescue-bridge/transfers/{id}/response-link")
    suspend fun rotateBridgeLink(@Path("id") id: String): Response<BridgeResponseLink>

    @POST("store/rescue-bridge/transfers/{id}/confirm-agreement")
    suspend fun confirmBridgeAgreement(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/confirm-handover")
    suspend fun confirmBridgeHandover(@Path("id") id: String, @Body body: Map<String, @JvmSuppressWildcards Any>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/fail")
    suspend fun failBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @POST("store/rescue-bridge/transfers/{id}/cancel")
    suspend fun cancelBridgeTransfer(@Path("id") id: String, @Body body: Map<String, String>): Response<okhttp3.ResponseBody>

    @GET("store/rescue-bridge/report")
    suspend fun getBridgeReport(): Response<BridgeReport>

    @GET("store/tasks/today")
    suspend fun getTodayTasks(): Response<TodayTasksResponse>

    @PUT("store/tasks/reminders")
    suspend fun updateTaskReminders(@Body request: UpdateTaskRemindersRequest): Response<MessageResponse>

    @GET("store/notifications")
    suspend fun getNotifications(@Query("limit") limit: Int = 50): Response<NotificationsResponse>

    @PATCH("store/notifications/{id}/read")
    suspend fun markNotificationRead(@Path("id") id: String): Response<NotificationDto>

    @PATCH("store/notifications/read-all")
    suspend fun markAllNotificationsRead(): Response<MessageResponse>

    // --- Danh mục món (catalog.controller.ts) ---

    /** status: ACTIVE | ARCHIVED | ALL; sortBy: name | createdAt | originalPrice; sortOrder: ASC | DESC */
    @GET("store/items")
    suspend fun getItems(
        @Query("search") search: String?,
        @Query("category") category: String?,
        @Query("status") status: String?,
        @Query("sortBy") sortBy: String?,
        @Query("sortOrder") sortOrder: String?,
        @Query("page") page: Int,
        @Query("limit") limit: Int
    ): Response<ItemsResponse>

    @GET("store/items/{id}")
    suspend fun getItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items")
    suspend fun createItem(@Body request: ItemRequest): Response<ItemDto>

    @PATCH("store/items/{id}")
    suspend fun updateItem(@Path("id") id: String, @Body request: ItemRequest): Response<ItemDto>

    @POST("store/items/{id}/archive")
    suspend fun archiveItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items/{id}/restore")
    suspend fun restoreItem(@Path("id") id: String): Response<ItemDto>

    @POST("store/items/import-csv")
    suspend fun importItemsCsv(@Body request: ImportCsvRequest): Response<CsvImportSummaryDto>

    @GET("store/items/data-quality-warnings")
    suspend fun getDataQualityWarnings(): Response<DataQualityResponse>

    @POST("store/items/batch-update")
    suspend fun batchUpdateItems(@Body request: BatchUpdateItemsRequest): Response<BatchUpdateItemsResponse>

    // --- Suất và tồn kho (offers.controller.ts) ---

    @GET("store/offers")
    suspend fun getOffers(
        @Query("date") date: String?,
        @Query("status") status: String? = null,
        @Query("itemId") itemId: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 50
    ): Response<OffersResponse>

    @GET("store/offers/{id}")
    suspend fun getOffer(@Path("id") id: String): Response<OfferDto>

    @POST("store/offers")
    suspend fun createOffer(@Body request: CreateOfferRequest): Response<OfferDto>

    @PATCH("store/offers/{id}")
    suspend fun updateOffer(@Path("id") id: String, @Body request: UpdateOfferRequest): Response<OfferDto>

    @POST("store/offers/{id}/adjust-stock")
    suspend fun adjustStock(@Path("id") id: String, @Body request: AdjustStockRequest): Response<OfferDto>

    @POST("store/offers/{id}/close")
    suspend fun closeOffer(@Path("id") id: String, @Body request: OfferReasonRequest): Response<OfferDto>

    @POST("store/offers/{id}/cancel")
    suspend fun cancelOffer(@Path("id") id: String, @Body request: OfferReasonRequest): Response<OfferDto>

    @GET("store/offers/{id}/history")
    suspend fun getOfferHistory(@Path("id") id: String): Response<List<OfferEventDto>>

    @POST("store/offers/clone-yesterday")
    suspend fun cloneYesterday(@Body request: CloneYesterdayRequest): Response<CloneSummaryDto>

    @GET("store/forecast")
    suspend fun getForecasts(@Query("targetDate") targetDate: String): Response<List<ForecastDto>>

    @GET("store/marketing/surprise-bags")
    suspend fun getSurpriseBags(): Response<List<SurpriseBagDto>>

    @POST("store/marketing/surprise-bags")
    suspend fun createSurpriseBag(@Body request: CreateSurpriseBagRequest): Response<CreateSurpriseBagResponse>

    @GET("store/donations/suggestions")
    suspend fun getDonationSuggestions(): Response<DonationSuggestionsResponse>

    // --- Dự báo và định giá (decisions.controller.ts) ---

    @POST("store/forecast/{id}/override")
    suspend fun overrideForecast(@Path("id") id: String, @Body request: OverrideForecastRequest): Response<ForecastDto>

    @POST("store/forecast/actuals")
    suspend fun logDailyActual(@Body request: DailyActualRequest): Response<DailyActualDto>

    @GET("store/special-events")
    suspend fun getSpecialEvents(): Response<List<SpecialEventDto>>

    @POST("store/special-events")
    suspend fun createSpecialEvent(@Body request: CreateSpecialEventRequest): Response<SpecialEventDto>

    @DELETE("store/special-events/{id}")
    suspend fun deleteSpecialEvent(@Path("id") id: String): Response<MessageResponse>

    @GET("store/decisions/pricing/proposals")
    suspend fun getPricingProposals(): Response<List<PriceProposalDto>>

    @POST("store/decisions/pricing/propose/{offerId}")
    suspend fun proposePrice(@Path("offerId") offerId: String): Response<ProposeResultDto>

    @POST("store/decisions/pricing/proposals/{id}/accept")
    suspend fun acceptPriceProposal(@Path("id") id: String): Response<MessageResponse>

    @POST("store/decisions/pricing/proposals/{id}/reject")
    suspend fun rejectPriceProposal(@Path("id") id: String): Response<MessageResponse>

    // --- Đơn và nhận hàng (store-orders.controller.ts, store-pickups.controller.ts) ---

    /** Backend chỉ lọc status + date (theo createdAt, UTC) + phân trang; search/fromDate/toDate bị bỏ qua. */
    @GET("store/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("date") date: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<OrdersResponse>

    @GET("store/orders/{id}")
    suspend fun getOrder(@Path("id") id: String): Response<OrderDto>

    @POST("store/orders/{id}/cancel")
    suspend fun cancelOrder(@Path("id") id: String, @Body request: CancelOrderRequest): Response<OrderDto>

    @POST("store/pickups/verify")
    suspend fun verifyPickup(@Body request: VerifyPickupRequest): Response<VerifyPickupResponse>

    @POST("store/pickups/verify-proxy-code")
    suspend fun verifyProxyCode(@Body request: VerifyProxyCodeRequest): Response<VerifyPickupResponse>

    @GET("store/pickup-schedule")
    suspend fun getPickupSchedule(): Response<List<PickupSlotDto>>

    @GET("store/complaints")
    suspend fun getComplaints(): Response<List<ComplaintDto>>

    // --- Hồ sơ & vận hành (store-operations.controller.ts) ---

    @GET("store/profile")
    suspend fun getStoreProfile(): Response<StoreProfileResponse>

    @PUT("store/profile")
    suspend fun updateStoreProfile(@Body request: UpdateStoreProfileRequest): Response<StoreDto>

    @POST("store/pause-today")
    suspend fun pauseToday(): Response<MessageResponse>

    @POST("store/resume-today")
    suspend fun resumeToday(): Response<MessageResponse>

    @GET("store/closures")
    suspend fun getClosures(): Response<List<StoreClosureDto>>

    @POST("store/closures")
    suspend fun createClosure(@Body request: CreateClosureRequest): Response<StoreClosureDto>

    @DELETE("store/closures/{id}")
    suspend fun deleteClosure(@Path("id") id: String): Response<MessageResponse>

    @GET("store/export/orders")
    suspend fun exportOrders(@Query("fromDate") fromDate: String?, @Query("toDate") toDate: String?): Response<ExportResponse>

    @GET("store/export/accounting")
    suspend fun exportAccounting(@Query("fromDate") fromDate: String?, @Query("toDate") toDate: String?): Response<ExportResponse>

    // settings.controller.ts không đọc JWT - lấy store từ header x-store-id, gói Pro từ x-is-pro.
    @GET("store/settings")
    suspend fun getStoreSettings(@Header("x-store-id") storeId: String): Response<StoreSettingsDto>

    @PUT("store/settings")
    suspend fun updateStoreSettings(
        @Header("x-store-id") storeId: String,
        @Header("x-is-pro") isPro: String,
        @Body request: UpdateStoreSettingsRequest
    ): Response<StoreSettingsDto>

    @GET("store/settings/history")
    suspend fun getStoreSettingsHistory(@Header("x-store-id") storeId: String): Response<List<SettingsHistoryDto>>

    @GET("store/audit-logs")
    suspend fun getAuditLogs(
        @Query("action") action: String?,
        @Query("from") from: String?,
        @Query("to") to: String?,
        @Query("page") page: Int,
        @Query("limit") limit: Int = 20
    ): Response<AuditLogsResponse>

    // --- Gói dịch vụ (subscriptions.controller.ts) ---

    @GET("store/subscription/current")
    suspend fun getSubscription(): Response<SubscriptionDto>

    @GET("store/subscription/quotas")
    suspend fun getQuotas(): Response<Map<String, QuotaDto>>

    @POST("store/subscription/upgrade")
    suspend fun upgradeSubscription(): Response<SubscriptionDto>

    @POST("store/subscription/renew")
    suspend fun renewSubscription(): Response<SubscriptionDto>

    @POST("store/subscription/downgrade")
    suspend fun downgradeSubscription(): Response<SubscriptionDto>

    @GET("store/subscription/invoices")
    suspend fun getInvoices(): Response<List<InvoiceDto>>

    @GET("store/subscription/invoices/{id}/pdf")
    suspend fun getInvoicePdf(@Path("id") id: String): Response<InvoicePdfResponse>
}
